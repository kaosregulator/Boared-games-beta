import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLASS } from './TvSet';
import { filmClock } from '../room/filmClock';

/**
 * The CRT left on PBS for the menu reel. The real picture is a DOM layer the
 * reel's recorder can't see, so for the film the glass itself lights up: a
 * sunny cartoon street drawn into the screen, the cable box's green on-screen
 * display, scan lines and a little flicker. It glows into the dark room too.
 */

const W = 512;
const H = Math.round((W * GLASS.h) / GLASS.w);
const OSD = '#39ff14';

function paint(g: CanvasRenderingContext2D, t: number) {
  // Sky and a sun.
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#5fb4ff');
  sky.addColorStop(0.65, '#bfe6ff');
  sky.addColorStop(0.66, '#7cc95a');
  sky.addColorStop(1, '#4f9b38');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#ffe36b';
  g.beginPath();
  g.arc(W * 0.83, H * 0.2, H * 0.09, 0, Math.PI * 2);
  g.fill();
  // Clouds drift across.
  g.fillStyle = 'rgba(255,255,255,0.92)';
  for (let i = 0; i < 3; i++) {
    const x = ((t * 18 + i * 190) % (W + 160)) - 80;
    const y = H * (0.14 + i * 0.07);
    for (const [dx, r] of [[0, 18], [20, 24], [44, 17]] as const) {
      g.beginPath();
      g.arc(x + dx, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  // A little street: houses and a school, the way a kids' cartoon town looks.
  const houses: [number, number, string, string][] = [
    [0.08, 0.2, '#f4a259', '#b5523b'],
    [0.32, 0.26, '#f6e27f', '#8d5a97'],
    [0.6, 0.22, '#9ad1d4', '#c0392b'],
  ];
  for (const [x, w, wall, roof] of houses) {
    const left = x * W;
    const width = w * W;
    const base = H * 0.66;
    const top = base - width * 0.62;
    g.fillStyle = wall;
    g.fillRect(left, top, width, base - top);
    g.fillStyle = roof;
    g.beginPath();
    g.moveTo(left - 8, top);
    g.lineTo(left + width / 2, top - width * 0.4);
    g.lineTo(left + width + 8, top);
    g.fill();
    g.fillStyle = '#3d2b1f';
    g.fillRect(left + width * 0.42, base - width * 0.32, width * 0.16, width * 0.32);
    g.fillStyle = '#fff7c2';
    g.fillRect(left + width * 0.12, top + width * 0.12, width * 0.18, width * 0.14);
    g.fillRect(left + width * 0.7, top + width * 0.12, width * 0.18, width * 0.14);
  }
  // A bike bouncing along the sidewalk.
  const bx = ((t * 60) % (W + 80)) - 40;
  const by = H * 0.76 + Math.abs(Math.sin(t * 6)) * -3;
  g.strokeStyle = '#222';
  g.lineWidth = 3;
  for (const dx of [0, 34]) {
    g.beginPath();
    g.arc(bx + dx, by, 10, 0, Math.PI * 2);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(bx, by);
  g.lineTo(bx + 16, by - 16);
  g.lineTo(bx + 34, by);
  g.stroke();
  g.fillStyle = '#ffd34d';
  g.beginPath();
  g.arc(bx + 18, by - 30, 9, 0, Math.PI * 2);
  g.fill();

  // The cable box's on-screen display, like TvScreen's, on a dark strip so it reads over the sky.
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(10, 12, 150, 50);
  g.font = 'bold 22px "IBM Plex Mono", ui-monospace, monospace';
  g.fillStyle = OSD;
  g.shadowColor = OSD;
  g.shadowBlur = 6;
  g.fillText('8  PBS', 18, 34);
  g.font = 'bold 15px "IBM Plex Mono", ui-monospace, monospace';
  g.fillText('ARTHUR 24/7', 18, 54);
  g.shadowBlur = 0;

  // Scan lines and a slow roll of brightness.
  g.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  const roll = ((t * 0.35) % 1) * H;
  const band = g.createLinearGradient(0, roll - 40, 0, roll + 40);
  band.addColorStop(0, 'rgba(255,255,255,0)');
  band.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  band.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = band;
  g.fillRect(0, roll - 40, W, 80);
}

export function FilmTvPicture() {
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, tex: t };
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);

  useFrame(() => {
    const g = canvas.getContext('2d');
    if (!g) return;
    paint(g, filmClock.t);
    tex.needsUpdate = true;
  });

  return (
    <group>
      <mesh position={[GLASS.x, GLASS.y, GLASS.z + 0.001]}>
        <planeGeometry args={[GLASS.w, GLASS.h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* The picture lights the room in front of it. */}
      <pointLight position={[GLASS.x, GLASS.y, GLASS.z + 0.35]} color="#bfe0ff" intensity={0.5} distance={2.2} decay={2} />
    </group>
  );
}
