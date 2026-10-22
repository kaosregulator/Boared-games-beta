import * as THREE from 'three';
import { BOARD, GROUP_COLORS, RAILROAD_RENT, type Space } from '../../games/monopoly/monopolyData';

/**
 * Everything printed for Monopoly, drawn from the same data the rules engine
 * plays with: the US (Atlantic City) board in the real board's proportions,
 * the title deeds with their real rent tables, Chance and Community Chest
 * cards, and the money in its real colours.
 */

/** The real board: 2 corners and 9 spaces per side, 215 : 130 on a 1600 board. */
export const BOARD_PX = 2048;
const K = BOARD_PX / 1600;
const CORNER = 215 * K;
const TILE = 130 * K;
const MINT = '#cfe5d2';
const INK = '#141414';
const FONT = '"Bricolage Grotesque", "Arial Narrow", Arial, sans-serif';

function font(weight: number, size: number) {
  return `${weight} ${Math.round(size)}px ${FONT}`;
}

/** Fit one line into maxW by shrinking the type. */
function line(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, weight = 800) {
  let s = size;
  ctx.font = font(weight, s);
  while (ctx.measureText(text).width > maxW && s > 6) {
    s -= 1;
    ctx.font = font(weight, s);
  }
  ctx.fillText(text, x, y);
}

/** Word-wrap into at most `max` lines centred on y. */
function lines(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, weight = 800, max = 3) {
  ctx.font = font(weight, size);
  const words = text.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxW && cur) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) out.push(cur);
  const shown = out.slice(0, max);
  const lh = size * 1.06;
  shown.forEach((l, i) => line(ctx, l, x, y + (i - (shown.length - 1) / 2) * lh, maxW, size, weight));
}

/** Centre of a space on the board image, and the turn that puts its outer edge at the bottom. */
function spaceFrame(i: number): { x: number; y: number; rot: number } {
  const S = BOARD_PX;
  if (i === 0) return { x: S - CORNER / 2, y: S - CORNER / 2, rot: 0 };
  if (i < 10) return { x: S - CORNER - (i - 1) * TILE - TILE / 2, y: S - CORNER / 2, rot: 0 };
  if (i === 10) return { x: CORNER / 2, y: S - CORNER / 2, rot: 0 };
  if (i < 20) return { x: CORNER / 2, y: S - CORNER - (i - 11) * TILE - TILE / 2, rot: Math.PI / 2 };
  if (i === 20) return { x: CORNER / 2, y: CORNER / 2, rot: 0 };
  if (i < 30) return { x: CORNER + (i - 21) * TILE + TILE / 2, y: CORNER / 2, rot: Math.PI };
  if (i === 30) return { x: S - CORNER / 2, y: CORNER / 2, rot: 0 };
  return { x: S - CORNER / 2, y: CORNER + (i - 31) * TILE + TILE / 2, rot: -Math.PI / 2 };
}

/* ------------------------------- little icons ------------------------------ */

function locomotive(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const u = w / 10;
  ctx.save();
  ctx.translate(x - w / 2, y - u * 3);
  ctx.fillStyle = INK;
  ctx.fillRect(u * 1, u * 2, u * 6, u * 2.4); // boiler
  ctx.fillRect(u * 6.4, u * 0.6, u * 2.6, u * 3.8); // cab
  ctx.fillRect(u * 1.6, u * 0.4, u * 1, u * 1.8); // stack
  ctx.fillRect(u * 0, u * 4.4, u * 10, u * 0.6); // frame
  ctx.beginPath();
  ctx.moveTo(u * 0, u * 5);
  ctx.lineTo(u * -0.6, u * 6);
  ctx.lineTo(u * 1.2, u * 6);
  ctx.closePath();
  ctx.fill(); // cow catcher
  for (const wx of [2, 4.4, 7.6]) {
    ctx.beginPath();
    ctx.arc(u * wx, u * 5.6, u * (wx > 7 ? 1.2 : 0.95), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = MINT;
  ctx.fillRect(u * 7, u * 1.2, u * 1.4, u * 1.2); // cab window
  ctx.restore();
}

function bulb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.fillStyle = '#f5d33d';
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.3, r, Math.PI * 0.8, Math.PI * 2.2);
  ctx.lineTo(x + r * 0.42, y + r * 0.9);
  ctx.lineTo(x - r * 0.42, y + r * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(x - r * 0.42, y + r * 0.9, r * 0.84, r * 0.55);
  ctx.strokeRect(x - r * 0.42, y + r * 0.9, r * 0.84, r * 0.55);
  ctx.restore();
}

function faucet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.fillStyle = '#8b98a5';
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.1;
  ctx.fillRect(x - r * 1.1, y - r * 0.35, r * 1.6, r * 0.6); // pipe
  ctx.strokeRect(x - r * 1.1, y - r * 0.35, r * 1.6, r * 0.6);
  ctx.fillRect(x + r * 0.2, y - r * 0.35, r * 0.55, r * 1.1); // spout
  ctx.strokeRect(x + r * 0.2, y - r * 0.35, r * 0.55, r * 1.1);
  ctx.fillRect(x - r * 0.45, y - r * 1.05, r * 0.3, r * 0.7); // stem
  ctx.fillRect(x - r * 0.95, y - r * 1.2, r * 1.3, r * 0.25); // handle
  ctx.fillStyle = '#4fa3d1';
  ctx.beginPath();
  ctx.arc(x + r * 0.48, y + r * 1.15, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function chest(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.save();
  ctx.fillStyle = '#3f74c4';
  ctx.strokeStyle = INK;
  ctx.lineWidth = w * 0.05;
  ctx.fillRect(x - w / 2, y - w * 0.15, w, w * 0.5);
  ctx.strokeRect(x - w / 2, y - w * 0.15, w, w * 0.5);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - w * 0.15);
  ctx.quadraticCurveTo(x, y - w * 0.62, x + w / 2, y - w * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f2c230';
  ctx.fillRect(x - w * 0.08, y - w * 0.18, w * 0.16, w * 0.2);
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.strokeStyle = '#b8a14a';
  ctx.lineWidth = r * 0.28;
  ctx.beginPath();
  ctx.arc(x, y + r * 0.2, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#9fd8ef';
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.55);
  ctx.lineTo(x + r * 0.5, y - r * 1.05);
  ctx.lineTo(x, y - r * 1.5);
  ctx.lineTo(x - r * 0.5, y - r * 1.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function car(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const u = w / 10;
  ctx.save();
  ctx.translate(x - w / 2, y - u * 2);
  ctx.fillStyle = '#d6281f';
  ctx.strokeStyle = INK;
  ctx.lineWidth = u * 0.3;
  ctx.beginPath();
  ctx.moveTo(0, u * 3.2);
  ctx.lineTo(u * 1.4, u * 1.6);
  ctx.lineTo(u * 3.2, u * 1.4);
  ctx.lineTo(u * 4.4, 0);
  ctx.lineTo(u * 7, 0);
  ctx.lineTo(u * 8, u * 1.4);
  ctx.lineTo(u * 10, u * 1.8);
  ctx.lineTo(u * 10, u * 3.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  for (const wx of [2.2, 7.8]) {
    ctx.beginPath();
    ctx.arc(u * wx, u * 3.3, u * 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------------------------------- board ---------------------------------- */

function drawSpace(ctx: CanvasRenderingContext2D, sp: Space) {
  const w = TILE;
  const h = CORNER;
  const top = -h / 2;
  const bottom = h / 2;
  ctx.fillStyle = INK;
  if (sp.kind === 'street' && sp.group) {
    const bar = h * 0.22;
    ctx.fillStyle = GROUP_COLORS[sp.group];
    ctx.fillRect(-w / 2, top, w, bar);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w / 2, top + bar);
    ctx.lineTo(w / 2, top + bar);
    ctx.stroke();
    ctx.fillStyle = INK;
    lines(ctx, sp.name.toUpperCase(), 0, top + bar + h * 0.2, w * 0.86, h * 0.085);
    line(ctx, `$${sp.price}`, 0, bottom - h * 0.1, w * 0.8, h * 0.085, 700);
  } else if (sp.kind === 'railroad') {
    lines(ctx, sp.name.toUpperCase(), 0, top + h * 0.17, w * 0.88, h * 0.075);
    locomotive(ctx, 0, h * 0.04, w * 0.78);
    line(ctx, `$${sp.price}`, 0, bottom - h * 0.1, w * 0.8, h * 0.085, 700);
  } else if (sp.kind === 'utility') {
    lines(ctx, sp.name.toUpperCase(), 0, top + h * 0.16, w * 0.88, h * 0.08);
    if (sp.i === 12) bulb(ctx, 0, h * 0.02, w * 0.2);
    else faucet(ctx, 0, h * 0.04, w * 0.24);
    ctx.fillStyle = INK;
    line(ctx, `$${sp.price}`, 0, bottom - h * 0.1, w * 0.8, h * 0.085, 700);
  } else if (sp.kind === 'chance') {
    line(ctx, 'CHANCE', 0, top + h * 0.13, w * 0.86, h * 0.09);
    const tint = sp.i === 7 ? '#d6338a' : sp.i === 22 ? '#2b6cc4' : '#f08a24';
    ctx.fillStyle = tint;
    ctx.font = font(800, h * 0.52);
    ctx.fillText('?', 0, h * 0.14);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.strokeText('?', 0, h * 0.14);
  } else if (sp.kind === 'chest') {
    lines(ctx, 'COMMUNITY CHEST', 0, top + h * 0.18, w * 0.86, h * 0.08);
    chest(ctx, 0, h * 0.1, w * 0.62);
    ctx.fillStyle = INK;
    lines(ctx, 'FOLLOW INSTRUCTIONS ON TOP CARD', 0, bottom - h * 0.13, w * 0.8, h * 0.042, 600);
  } else if (sp.kind === 'tax') {
    if (sp.i === 4) {
      lines(ctx, 'INCOME TAX', 0, top + h * 0.17, w * 0.86, h * 0.09);
      ctx.save();
      ctx.translate(0, h * 0.04);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.strokeRect(-w * 0.18, -w * 0.18, w * 0.36, w * 0.36);
      ctx.restore();
      line(ctx, `PAY $${sp.tax}`, 0, bottom - h * 0.1, w * 0.8, h * 0.08, 800);
    } else {
      lines(ctx, 'LUXURY TAX', 0, top + h * 0.17, w * 0.86, h * 0.09);
      ring(ctx, 0, h * 0.06, w * 0.2);
      ctx.fillStyle = INK;
      line(ctx, `PAY $${sp.tax}`, 0, bottom - h * 0.1, w * 0.8, h * 0.08, 800);
    }
  }
}

function drawCorner(ctx: CanvasRenderingContext2D, sp: Space) {
  const c = CORNER;
  ctx.fillStyle = INK;
  if (sp.kind === 'go') {
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    lines(ctx, 'COLLECT $200 SALARY AS YOU PASS', 0, -c * 0.3, c * 0.8, c * 0.07, 700, 2);
    ctx.fillStyle = '#d6281f';
    ctx.font = font(800, c * 0.42);
    ctx.fillText('GO', 0, c * 0.05);
    ctx.restore();
    // the big arrow along the bottom, pointing the way round
    ctx.fillStyle = '#d6281f';
    ctx.beginPath();
    ctx.moveTo(-c * 0.46, c * 0.36);
    ctx.lineTo(-c * 0.28, c * 0.26);
    ctx.lineTo(-c * 0.28, c * 0.32);
    ctx.lineTo(c * 0.42, c * 0.32);
    ctx.lineTo(c * 0.42, c * 0.4);
    ctx.lineTo(-c * 0.28, c * 0.4);
    ctx.lineTo(-c * 0.28, c * 0.46);
    ctx.closePath();
    ctx.fill();
  } else if (sp.kind === 'jail') {
    // The cell sits in the inner corner; visitors stand round the outside.
    const cell = c * 0.66;
    const x0 = c / 2 - cell;
    const y0 = -c / 2;
    ctx.fillStyle = '#f08a24';
    ctx.fillRect(x0, y0, cell, cell);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.strokeRect(x0, y0, cell, cell);
    ctx.fillStyle = INK;
    ctx.save();
    ctx.translate(x0 + cell / 2, y0 + cell / 2);
    ctx.rotate(Math.PI / 4);
    line(ctx, 'IN', 0, -cell * 0.28, cell, c * 0.09);
    line(ctx, 'JAIL', 0, cell * 0.3, cell, c * 0.09);
    ctx.restore();
    for (let b = 0; b < 4; b++) {
      const bx = x0 + cell * (0.28 + b * 0.15);
      ctx.fillRect(bx, y0 + cell * 0.3, c * 0.012, cell * 0.4);
    }
    line(ctx, 'JUST', -c * 0.36, -c * 0.08, c * 0.3, c * 0.075);
    ctx.save();
    ctx.translate(-c * 0.08, c * 0.4);
    line(ctx, 'VISITING', 0, 0, c * 0.7, c * 0.075);
    ctx.restore();
  } else if (sp.kind === 'parking') {
    ctx.save();
    ctx.rotate(Math.PI * 0.75);
    line(ctx, 'FREE', 0, -c * 0.3, c * 0.7, c * 0.12);
    car(ctx, 0, c * 0.02, c * 0.48);
    ctx.fillStyle = INK;
    line(ctx, 'PARKING', 0, c * 0.32, c * 0.8, c * 0.12);
    ctx.restore();
  } else if (sp.kind === 'gotojail') {
    ctx.save();
    ctx.rotate(-Math.PI * 0.75);
    line(ctx, 'GO TO', 0, -c * 0.3, c * 0.7, c * 0.12);
    // a police whistle-blue badge
    ctx.fillStyle = '#2b4f9e';
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const r = k % 2 ? c * 0.07 : c * 0.13;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r + c * 0.02);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.arc(0, c * 0.02, c * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    line(ctx, 'JAIL', 0, c * 0.32, c * 0.8, c * 0.12);
    ctx.restore();
  }
}

function drawBoard(ctx: CanvasRenderingContext2D) {
  const S = BOARD_PX;
  ctx.fillStyle = MINT;
  ctx.fillRect(0, 0, S, S);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const sp of BOARD) {
    const f = spaceFrame(sp.i);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    if (sp.i % 10 === 0) drawCorner(ctx, sp);
    else drawSpace(ctx, sp);
    ctx.restore();
  }

  // Grid lines: outer edge, inner square, and the dividers between spaces.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(2.5, 2.5, S - 5, S - 5);
  ctx.strokeRect(CORNER, CORNER, S - CORNER * 2, S - CORNER * 2);
  ctx.lineWidth = 3;
  for (let n = 0; n <= 9; n++) {
    const p = CORNER + n * TILE;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, CORNER);
    ctx.moveTo(p, S - CORNER);
    ctx.lineTo(p, S);
    ctx.moveTo(0, p);
    ctx.lineTo(CORNER, p);
    ctx.moveTo(S - CORNER, p);
    ctx.lineTo(S, p);
    ctx.stroke();
  }

  // Centre: the card spaces and the red banner across the diagonal.
  const mid = S / 2;
  const deck = (x: number, y: number, rot: number, label: string, tint: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.setLineDash([14, 10]);
    ctx.strokeStyle = tint;
    ctx.lineWidth = 5;
    ctx.strokeRect(-CARD_SPOT.w / 2, -CARD_SPOT.h / 2, CARD_SPOT.w, CARD_SPOT.h);
    ctx.setLineDash([]);
    ctx.fillStyle = tint;
    line(ctx, label, 0, CARD_SPOT.h / 2 + 40, CARD_SPOT.w * 1.2, 34);
    ctx.restore();
  };
  deck(mid - 330, mid - 330, -Math.PI * 0.75, 'CHANCE', '#f08a24');
  deck(mid + 330, mid + 330, Math.PI * 0.25, 'COMMUNITY CHEST', '#3f74c4');

  ctx.save();
  ctx.translate(mid, mid);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = '#d6281f';
  ctx.fillRect(-560, -95, 1120, 190);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.strokeRect(-560, -95, 1120, 190);
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.font = font(800, 150);
  ctx.strokeText('MONOPOLY', 0, 8);
  ctx.fillText('MONOPOLY', 0, 8);
  ctx.restore();
}

/** Where the two decks rest on the board image (px), used to place the 3D card piles too. */
export const CARD_SPOT = { w: 280, h: 180 };
export const CHANCE_SPOT = { x: BOARD_PX / 2 - 330, y: BOARD_PX / 2 - 330, rot: -Math.PI * 0.75 };
export const CHEST_SPOT = { x: BOARD_PX / 2 + 330, y: BOARD_PX / 2 + 330, rot: Math.PI * 0.25 };

let boardTex: THREE.CanvasTexture | null = null;

function whenFontsReady(redraw: () => void) {
  if (typeof document === 'undefined' || !document.fonts) return;
  void document.fonts.load(font(800, 40)).then(redraw, () => {});
}

export function usBoardTexture(): THREE.CanvasTexture {
  if (boardTex) return boardTex;
  const c = document.createElement('canvas');
  c.width = c.height = BOARD_PX;
  const ctx = c.getContext('2d')!;
  drawBoard(ctx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  boardTex = t;
  whenFontsReady(() => {
    drawBoard(ctx);
    t.needsUpdate = true;
  });
  return t;
}

/* ------------------------------- title deeds ------------------------------- */

const DEED_W = 300;
const DEED_H = 360;
const deedCache = new Map<number, THREE.CanvasTexture>();

function drawDeed(ctx: CanvasRenderingContext2D, sp: Space) {
  const W = DEED_W;
  const H = DEED_H;
  ctx.fillStyle = '#fbfaf4';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;

  if (sp.kind === 'street' && sp.group && sp.rent) {
    ctx.fillStyle = GROUP_COLORS[sp.group];
    ctx.fillRect(16, 16, W - 32, 78);
    ctx.strokeRect(16, 16, W - 32, 78);
    ctx.fillStyle = sp.group === 'darkblue' || sp.group === 'green' || sp.group === 'red' || sp.group === 'brown' ? '#ffffff' : INK;
    line(ctx, 'TITLE DEED', W / 2, 36, W - 60, 15, 700);
    line(ctx, sp.name.toUpperCase(), W / 2, 66, W - 50, 26, 800);
    ctx.fillStyle = INK;
    const r = sp.rent;
    line(ctx, `RENT $${r[0]}`, W / 2, 116, W - 60, 20, 800);
    const rows: [string, number][] = [
      ['With 1 House', r[1]],
      ['With 2 Houses', r[2]],
      ['With 3 Houses', r[3]],
      ['With 4 Houses', r[4]],
    ];
    ctx.font = font(600, 17);
    rows.forEach(([label, v], k) => {
      const y = 146 + k * 24;
      ctx.textAlign = 'left';
      ctx.fillText(label, 34, y);
      ctx.textAlign = 'right';
      ctx.fillText(`$${v}`, W - 34, y);
    });
    ctx.textAlign = 'center';
    line(ctx, `With HOTEL $${r[5]}`, W / 2, 252, W - 60, 18, 700);
    line(ctx, `Mortgage Value $${(sp.price ?? 0) / 2}`, W / 2, 280, W - 60, 15, 600);
    line(ctx, `Houses cost $${sp.houseCost} each`, W / 2, 302, W - 60, 15, 600);
    line(ctx, `Hotels, $${sp.houseCost} plus 4 houses`, W / 2, 324, W - 60, 15, 600);
  } else if (sp.kind === 'railroad') {
    locomotive(ctx, W / 2, 62, 120);
    line(ctx, sp.name.toUpperCase(), W / 2, 122, W - 50, 24, 800);
    ctx.font = font(600, 17);
    RAILROAD_RENT.slice(1).forEach((v, k) => {
      const y = 166 + k * 30;
      ctx.textAlign = 'left';
      ctx.fillText(k === 0 ? 'RENT' : `If ${k + 1} R.R.'s are owned`, 34, y);
      ctx.textAlign = 'right';
      ctx.fillText(`$${v}`, W - 34, y);
    });
    ctx.textAlign = 'center';
    line(ctx, `Mortgage Value $${(sp.price ?? 0) / 2}`, W / 2, 316, W - 60, 15, 600);
  } else if (sp.kind === 'utility') {
    if (sp.i === 12) bulb(ctx, W / 2, 62, 30);
    else faucet(ctx, W / 2, 62, 34);
    ctx.fillStyle = INK;
    line(ctx, sp.name.toUpperCase(), W / 2, 124, W - 50, 24, 800);
    lines(ctx, 'If one "Utility" is owned, rent is 4 times amount shown on dice.', W / 2, 180, W - 60, 16, 600, 3);
    lines(ctx, 'If both "Utilities" are owned, rent is 10 times amount shown on dice.', W / 2, 250, W - 60, 16, 600, 3);
    line(ctx, `Mortgage Value $${(sp.price ?? 0) / 2}`, W / 2, 316, W - 60, 15, 600);
  }
}

export function deedTexture(i: number): THREE.CanvasTexture {
  const hit = deedCache.get(i);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = DEED_W;
  c.height = DEED_H;
  const ctx = c.getContext('2d')!;
  drawDeed(ctx, BOARD[i]);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  deedCache.set(i, t);
  whenFontsReady(() => {
    drawDeed(ctx, BOARD[i]);
    t.needsUpdate = true;
  });
  return t;
}

/** Real deed card: 2 1/8 by 2 1/2 inches. */
export const DEED_SIZE = { w: 0.054, h: 0.064 };

/* ------------------------- Chance and Community Chest ------------------------ */

export const CARD_SIZE = { w: 0.066, h: 0.042 };
const cardCache = new Map<string, THREE.CanvasTexture>();

function drawCard(ctx: CanvasRenderingContext2D, kind: 'chance' | 'chest', text: string | null) {
  const W = 400;
  const H = 256;
  const chance = kind === 'chance';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (text === null) {
    // the back of the deck
    ctx.fillStyle = chance ? '#f08a24' : '#8fc4e8';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, W - 20, H - 20);
    ctx.fillStyle = INK;
    if (chance) {
      ctx.font = font(800, 150);
      ctx.fillText('?', W / 2, H / 2 + 8);
      line(ctx, 'CHANCE', W / 2, 40, W - 60, 30);
    } else {
      chest(ctx, W / 2, H / 2 + 18, 130);
      ctx.fillStyle = INK;
      line(ctx, 'COMMUNITY CHEST', W / 2, 40, W - 60, 28);
    }
    return;
  }
  ctx.fillStyle = chance ? '#fbe2c4' : '#e3f1fb';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = chance ? '#c86a14' : '#3f74c4';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.fillStyle = chance ? '#c86a14' : '#3f74c4';
  line(ctx, chance ? 'CHANCE' : 'COMMUNITY CHEST', W / 2, 42, W - 60, 28);
  ctx.fillStyle = INK;
  lines(ctx, text, W / 2, H / 2 + 26, W - 70, 30, 700, 4);
}

export function cardTexture(kind: 'chance' | 'chest', text: string | null): THREE.CanvasTexture {
  const key = `${kind}:${text ?? '~back'}`;
  const hit = cardCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 400;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  drawCard(ctx, kind, text);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cardCache.set(key, t);
  whenFontsReady(() => {
    drawCard(ctx, kind, text);
    t.needsUpdate = true;
  });
  return t;
}

/* ---------------------------------- money ---------------------------------- */

export const DENOMS = [500, 100, 50, 20, 10, 5, 1] as const;
export type Denom = (typeof DENOMS)[number];
/** The real paper colours. */
export const BILL_COLOR: Record<Denom, string> = {
  1: '#f7f5ee',
  5: '#f4c2cf',
  10: '#f7e98a',
  20: '#b8e3a6',
  50: '#9fc6ea',
  100: '#eedcb0',
  500: '#f5b26b',
};
/** A real Monopoly bill is about 13.5 by 6.6 cm. */
export const BILL_SIZE = { w: 0.135, h: 0.066 };

const billCache = new Map<Denom, THREE.CanvasTexture>();

function drawBill(ctx: CanvasRenderingContext2D, d: Denom) {
  const W = 512;
  const H = 250;
  ctx.fillStyle = BILL_COLOR[d];
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, W - 24, H - 24);
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  for (const [x, y] of [
    [58, 58],
    [W - 58, 58],
    [58, H - 58],
    [W - 58, H - 58],
  ]) line(ctx, String(d), x, y, 80, 40, 800);
  ctx.beginPath();
  ctx.ellipse(W / 2, H / 2, 96, 76, 0, 0, Math.PI * 2);
  ctx.stroke();
  line(ctx, `$${d}`, W / 2, H / 2 - 6, 170, 76, 800);
  line(ctx, 'MONOPOLY', W / 2, H / 2 + 54, 150, 20, 700);
}

export function billTexture(d: Denom): THREE.CanvasTexture {
  const hit = billCache.get(d);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 250;
  const ctx = c.getContext('2d')!;
  drawBill(ctx, d);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  billCache.set(d, t);
  whenFontsReady(() => {
    drawBill(ctx, d);
    t.needsUpdate = true;
  });
  return t;
}

/**
 * Cash as the bills a player would actually hold: the banker's starting
 * split when it fits, otherwise biggest first while keeping a few small ones.
 */
export function billsFor(cash: number): Record<Denom, number> {
  const out = { 500: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 } as Record<Denom, number>;
  let left = Math.max(0, Math.floor(cash));
  // keep some change on hand, as people do
  const keep: [Denom, number][] = [
    [1, 5],
    [5, 3],
    [10, 3],
    [20, 3],
  ];
  for (const [d, n] of keep) {
    const take = Math.min(n, Math.floor(left / d / 3));
    out[d] += take;
    left -= take * d;
  }
  for (const d of DENOMS) {
    const n = Math.floor(left / d);
    out[d] += n;
    left -= n * d;
  }
  return out;
}
