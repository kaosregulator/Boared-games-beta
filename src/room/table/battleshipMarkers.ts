import { cells, sunk, type Ship, type Shots } from './battleshipFleet';

/**
 * The pegs on the Battleship table and the icons in the corner key come from
 * this one drawing, so the key always shows exactly what is on the sea.
 *
 * Every peg is drawn stood upright, the way the real game's pegs sit in the
 * grid. On the table each one is a billboard: it turns to face the camera and
 * ignores the room lights, so a miss is still a white peg when you crouch low
 * over the water or the lamps are off.
 */

export type MarkerKind = 'ship' | 'hit' | 'miss' | 'sunk';

export const MARKER_KINDS: MarkerKind[] = ['ship', 'hit', 'miss', 'sunk'];

export const MARKER_LABEL: Record<MarkerKind, string> = {
  ship: 'Ship',
  hit: 'Hit',
  miss: 'Miss',
  sunk: 'Sunk',
};

/** Canvas size of one marker; pegs are taller than wide. */
export const MARKER_W = 96;
export const MARKER_H = 144;

const A = '/games/battleship/';

/** The burst and skull are the original game's own hit and sunk icons. */
const images: { hit?: HTMLImageElement; skull?: HTMLImageElement } = {};
const waiting = new Set<() => void>();

function loadImages() {
  if (typeof Image === 'undefined' || images.hit) return;
  const done = () => waiting.forEach(fn => fn());
  images.hit = new Image();
  images.hit.onload = done;
  images.hit.src = `${A}hit.png`;
  images.skull = new Image();
  images.skull.onload = done;
  images.skull.src = `${A}czacha.png`;
}

/** Calls `fn` whenever one of the marker pictures finishes loading, so a drawing can be redone. */
export function onMarkerArt(fn: () => void) {
  loadImages();
  waiting.add(fn);
  return () => {
    waiting.delete(fn);
  };
}

const ready = (img?: HTMLImageElement) => Boolean(img && img.complete && img.naturalWidth > 0);

/** What a shot cell shows: a white peg, a red peg, or the skull once the ship under it is sunk. */
export function markerKind(shot: 'hit' | 'miss', fleet: Ship[], x: number, y: number): Exclude<MarkerKind, 'ship'> {
  if (shot === 'miss') return 'miss';
  const ship = fleet.find(s => cells(s).some(c => c.x === x && c.y === y));
  return ship && sunk(ship) ? 'sunk' : 'hit';
}

/** Every shot on one ocean with the marker it shows. */
export function markersFor(shots: Shots, fleet: Ship[]) {
  return Object.entries(shots).map(([k, shot]) => {
    const [x, y] = k.split(',').map(Number);
    return { key: k, x, y, kind: markerKind(shot, fleet, x, y) };
  });
}

const PEG: Record<Exclude<MarkerKind, 'ship'>, { body: string; shade: string; light: string }> = {
  hit: { body: '#ff2d3a', shade: '#a3101c', light: '#ffb3b8' },
  miss: { body: '#f6f8fb', shade: '#a9b6c4', light: '#ffffff' },
  sunk: { body: '#1d1d1f', shade: '#000000', light: '#5a5a5e' },
};

/** A tinted copy of a one-colour icon. */
function tinted(img: HTMLImageElement, color: string, size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0, size, size);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, size, size);
  return c;
}

/** An upright peg: a round head on a tapered shaft, outlined so it reads on light sea and dark. */
function drawPeg(g: CanvasRenderingContext2D, colors: { body: string; shade: string; light: string }, top: number) {
  const w = MARKER_W;
  const h = MARKER_H;
  const cx = w / 2;
  const headR = w * 0.26;
  const headY = top + headR + 4;
  const shaftTop = headY + headR * 0.55;
  const shaftBot = h - 6;
  g.lineJoin = 'round';
  // shaft
  g.beginPath();
  g.moveTo(cx - w * 0.15, shaftTop);
  g.lineTo(cx + w * 0.15, shaftTop);
  g.lineTo(cx + w * 0.09, shaftBot);
  g.quadraticCurveTo(cx, shaftBot + 4, cx - w * 0.09, shaftBot);
  g.closePath();
  const shaft = g.createLinearGradient(cx - w * 0.15, 0, cx + w * 0.15, 0);
  shaft.addColorStop(0, colors.light);
  shaft.addColorStop(0.45, colors.body);
  shaft.addColorStop(1, colors.shade);
  g.fillStyle = shaft;
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = '#0b0f14';
  g.stroke();
  // collar where the head meets the shaft
  g.beginPath();
  g.ellipse(cx, shaftTop + 2, w * 0.2, w * 0.06, 0, 0, Math.PI * 2);
  g.fillStyle = colors.shade;
  g.fill();
  g.stroke();
  // head
  g.beginPath();
  g.arc(cx, headY, headR, 0, Math.PI * 2);
  const head = g.createRadialGradient(cx - headR * 0.35, headY - headR * 0.35, headR * 0.1, cx, headY, headR);
  head.addColorStop(0, colors.light);
  head.addColorStop(0.55, colors.body);
  head.addColorStop(1, colors.shade);
  g.fillStyle = head;
  g.fill();
  g.lineWidth = 5;
  g.stroke();
  return { cx, headY, headR };
}

/** A small hull seen side on, for the key's "Ship" row. */
function drawHull(g: CanvasRenderingContext2D) {
  const w = MARKER_W;
  const h = MARKER_H;
  const y = h * 0.62;
  g.lineJoin = 'round';
  g.lineWidth = 5;
  g.strokeStyle = '#0b0f14';
  // mast and sail
  g.beginPath();
  g.moveTo(w * 0.5, y - h * 0.42);
  g.lineTo(w * 0.5, y);
  g.stroke();
  g.beginPath();
  g.moveTo(w * 0.52, y - h * 0.4);
  g.quadraticCurveTo(w * 0.86, y - h * 0.22, w * 0.52, y - h * 0.06);
  g.closePath();
  g.fillStyle = '#efe6d2';
  g.fill();
  g.stroke();
  // hull
  g.beginPath();
  g.moveTo(w * 0.06, y);
  g.lineTo(w * 0.94, y);
  g.lineTo(w * 0.78, y + h * 0.16);
  g.lineTo(w * 0.2, y + h * 0.16);
  g.closePath();
  g.fillStyle = '#9a6a3c';
  g.fill();
  g.stroke();
}

/** Draws one marker into a MARKER_W x MARKER_H canvas (cleared first). */
export function drawMarker(g: CanvasRenderingContext2D, kind: MarkerKind) {
  loadImages();
  g.clearRect(0, 0, MARKER_W, MARKER_H);
  if (kind === 'ship') {
    drawHull(g);
    return;
  }
  if (kind === 'miss') {
    drawPeg(g, PEG.miss, 26);
    return;
  }
  if (kind === 'hit') {
    // the original's burst, fired-orange, behind a red peg
    if (ready(images.hit)) g.drawImage(tinted(images.hit!, '#ffb020', 128), MARKER_W / 2 - 46, 6, 92, 92);
    drawPeg(g, PEG.hit, 26);
    return;
  }
  // sunk: a black peg under the original's skull
  drawPeg(g, PEG.sunk, 44);
  if (ready(images.skull)) {
    const s = 70;
    const back = tinted(images.skull!, '#ffffff', 140);
    // white edge so the black skull reads on dark water
    for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) g.drawImage(back, MARKER_W / 2 - s / 2 + dx, 2 + dy, s, s);
    g.drawImage(images.skull!, MARKER_W / 2 - s / 2, 2, s, s);
  }
}

/** A fresh canvas holding one marker. */
export function markerCanvas(kind: MarkerKind) {
  const c = document.createElement('canvas');
  c.width = MARKER_W;
  c.height = MARKER_H;
  drawMarker(c.getContext('2d')!, kind);
  return c;
}
