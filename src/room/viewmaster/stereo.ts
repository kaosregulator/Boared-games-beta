/**
 * The View-Master's two lenses, drawn on a plain 2D canvas (no second WebGL
 * context next to the room's). The scan is cut into layers by its depth map,
 * like the paper layers of a diorama, and each lens slides the near layers
 * further than the far ones: the left eye one way, the right eye the other,
 * plus a sway that follows the pointer or the phone tilting. A flat 1990s scan
 * opens out the way the real reel did.
 */

/** Depth thresholds, far to near. Layer k holds everything at least this near. */
export const BANDS = [0, 0.18, 0.36, 0.54, 0.72, 0.88];
/** How far the nearest layer slides, as a share of the lens. */
const STEREO = 0.022;
const SWAY_X = 0.045;
const SWAY_Y = 0.035;

export interface Stereo {
  show(img: HTMLImageElement, depth: HTMLImageElement): void;
  draw(sway: { x: number; y: number }, blink: number): void;
  dispose(): void;
}

/**
 * Cut the image into cumulative layers: layer k keeps the pixels whose depth is
 * at least BANDS[k], with a soft edge, so drawing them back to front never
 * leaves a hole.
 */
export function cutLayers(rgba: Uint8ClampedArray, depth: Uint8ClampedArray, size: number) {
  return BANDS.map(edge => {
    const out = new Uint8ClampedArray(rgba.length);
    for (let i = 0; i < size * size; i++) {
      const d = depth[i * 4] / 255;
      const a = edge === 0 ? 1 : Math.min(1, Math.max(0, (d - edge) / 0.06 + 0.5));
      out[i * 4] = rgba[i * 4];
      out[i * 4 + 1] = rgba[i * 4 + 1];
      out[i * 4 + 2] = rgba[i * 4 + 2];
      out[i * 4 + 3] = Math.round(a * 255);
    }
    return out;
  });
}

const SIZE = 360;

export function makeStereo(canvas: HTMLCanvasElement): Stereo | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const scratch = document.createElement('canvas');
  scratch.width = scratch.height = SIZE;
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  if (!sctx) return null;
  let layers: HTMLCanvasElement[] = [];

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  return {
    show(img, depth) {
      sctx.clearRect(0, 0, SIZE, SIZE);
      sctx.drawImage(img, 0, 0, SIZE, SIZE);
      const rgba = sctx.getImageData(0, 0, SIZE, SIZE).data;
      sctx.clearRect(0, 0, SIZE, SIZE);
      sctx.drawImage(depth, 0, 0, SIZE, SIZE);
      const dep = sctx.getImageData(0, 0, SIZE, SIZE).data;
      layers = cutLayers(rgba, dep, SIZE).map(data => {
        const c = document.createElement('canvas');
        c.width = c.height = SIZE;
        c.getContext('2d')!.putImageData(new ImageData(data, SIZE, SIZE), 0, 0);
        return c;
      });
    },
    draw(sway, blink) {
      resize();
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      if (!layers.length) return;
      const lens = Math.min(W * 0.46, H);
      const y = (H - lens) / 2;
      for (const eye of [-1, 1]) {
        const x = eye < 0 ? 0 : W - lens;
        const r = lens / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, lens, lens);
        // Zoom in a touch so sliding layers never show the scan's edge.
        const zoom = lens * 1.12;
        const ox = x + (lens - zoom) / 2;
        const oy = y + (lens - zoom) / 2;
        layers.forEach((layer, k) => {
          const near = BANDS[k] - 0.5;
          const dx = (eye * STEREO + sway.x * SWAY_X) * near * lens;
          const dy = sway.y * SWAY_Y * near * lens;
          ctx.drawImage(layer, ox + dx, oy + dy, zoom, zoom);
        });
        // The lens: a dark rim and a glint.
        const g = ctx.createRadialGradient(x + r, y + r, r * 0.62, x + r, y + r, r);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.75)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, lens, lens);
        const glint = ctx.createRadialGradient(x + r * 0.62, y + r * 0.58, 0, x + r * 0.62, y + r * 0.58, r * 0.4);
        glint.addColorStop(0, 'rgba(255,255,255,0.14)');
        glint.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glint;
        ctx.fillRect(x, y, lens, lens);
        if (blink > 0) {
          ctx.fillStyle = `rgba(0,0,0,${blink})`;
          ctx.fillRect(x, y, lens, lens);
        }
        ctx.restore();
      }
    },
    dispose() {
      layers = [];
    },
  };
}
