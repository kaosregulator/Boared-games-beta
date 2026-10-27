import * as THREE from 'three';
import {
  CardRank,
  CARD_INFO,
  PLAYER_META,
  PlayerColor,
  getNormalizedBoardCoords,
} from '../sorry/sorryRules';
import { GuessWhoCharacter } from '../guesswho/guessWhoRules';
import { MOUSE_TRAP_SPACES } from '../mousetrap/mouseTrapRules';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generates the high-resolution Classic Sorry! board texture matching the user's attached reference image:
 * - Black outer border
 * - 16x16 white perimeter track with Slide arrows & color circles
 * - Deep charcoal center with diagonal colorful rounded stripe rays in Red, Blue, Yellow, Green
 * - SAFETY ZONE arrows, START circles, HOME circles
 * - Central angled "SORRY!" logo flanked by "CARDS HERE" and "DISCARD HERE" slots
 */
export function createSorryBoardTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Outer black frame
  ctx.fillStyle = '#0e0f12';
  ctx.fillRect(0, 0, size, size);

  const margin = size * 0.035; // 3.5% outer frame -> matches getNormalizedBoardCoords gridHalf = 0.465
  const gridSpan = size - margin * 2;
  const cell = gridSpan / 16;

  // 2. Dark charcoal interior field
  ctx.fillStyle = '#18191e';
  ctx.fillRect(margin + cell, margin + cell, gridSpan - cell * 2, gridSpan - cell * 2);

  // 3. Draw iconic diagonal colorful rounded speed-stripe rays in each of the 4 quadrants
  const quadrantConfigs: { color: string; angle: number; cx: number; cy: number }[] = [
    { color: '#e11d48', angle: -Math.PI / 4, cx: size * 0.27, cy: size * 0.27 }, // Red (top-left)
    { color: '#0284c7', angle: Math.PI / 4, cx: size * 0.73, cy: size * 0.27 }, // Blue (top-right)
    { color: '#eab308', angle: (3 * Math.PI) / 4, cx: size * 0.73, cy: size * 0.73 }, // Yellow (bottom-right)
    { color: '#16a34a', angle: (-3 * Math.PI) / 4, cx: size * 0.27, cy: size * 0.73 }, // Green (bottom-left)
  ];

  ctx.save();
  ctx.beginPath();
  ctx.rect(margin + cell, margin + cell, gridSpan - cell * 2, gridSpan - cell * 2);
  ctx.clip();

  for (const q of quadrantConfigs) {
    ctx.save();
    ctx.translate(q.cx, q.cy);
    ctx.rotate(q.angle);
    ctx.fillStyle = q.color;
    const stripeCount = 11;
    const spacing = 44;
    for (let i = -stripeCount; i <= stripeCount; i++) {
      const sy = i * spacing;
      const len = 340 - Math.abs(i) * 22 + (i % 2 === 0 ? 45 : -15);
      drawRoundedRect(ctx, -len * 0.55, sy - 11, len, 22, 11);
      ctx.fill();
    }
    ctx.restore();
  }

  // Subtle quadrant fold lines (like a real quad-fold board)
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(size / 2, margin + cell);
  ctx.lineTo(size / 2, size - margin - cell);
  ctx.moveTo(margin + cell, size / 2);
  ctx.lineTo(size - margin - cell, size / 2);
  ctx.stroke();

  ctx.restore();

  // 4. Draw the 60 white perimeter squares
  for (let side = 0; side < 4; side++) {
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((side * Math.PI) / 2);
    ctx.translate(-size / 2, -size / 2);

    for (let c = 0; c < 15; c++) {
      const sx = margin + c * cell;
      const sy = margin;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(sx, sy, cell, cell);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(sx, sy, cell, cell);
    }
    ctx.restore();
  }

  // 5. Draw Slides, Safety Zones, START circles, and HOME circles for each of the 4 sides
  const sideColors: { color: PlayerColor; fill: string; dark: string; light: string }[] = [
    { color: 'red', fill: '#ef4444', dark: '#991b1b', light: '#fecaca' },
    { color: 'blue', fill: '#0ea5e9', dark: '#075985', light: '#bae6fd' },
    { color: 'yellow', fill: '#eab308', dark: '#854d0e', light: '#fef08a' },
    { color: 'green', fill: '#22c55e', dark: '#166534', light: '#bbf7d0' },
  ];

  const drawSlideBar = (startCol: number, endCol: number, fillHex: string) => {
    const sx = margin + (startCol + 0.22) * cell;
    const ex = margin + (endCol + 0.5) * cell;
    const cy = margin + cell * 0.5;

    // Multi-color / vibrant slide track bar
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, cy);
    ctx.lineTo(ex, cy);
    ctx.stroke();

    ctx.strokeStyle = fillHex;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(sx, cy);
    ctx.lineTo(ex, cy);
    ctx.stroke();

    // Start triangle at startCol
    ctx.fillStyle = fillHex;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(margin + (startCol + 0.18) * cell, cy - cell * 0.28);
    ctx.lineTo(margin + (startCol + 0.65) * cell, cy);
    ctx.lineTo(margin + (startCol + 0.18) * cell, cy + cell * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // End target bullseye circle at endCol
    ctx.beginPath();
    ctx.arc(ex, cy, cell * 0.27, 0, Math.PI * 2);
    ctx.fillStyle = fillHex;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ex, cy, cell * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // "SLIDE" micro-label
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SLIDE', (sx + ex) * 0.5, cy + cell * 0.38);
  };

  for (let side = 0; side < 4; side++) {
    const sc = sideColors[side];
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((side * Math.PI) / 2);
    ctx.translate(-size / 2, -size / 2);

    // Draw Short Slide (cols 1..4) and Long Slide (cols 9..13)
    drawSlideBar(1, 4, sc.fill);
    drawSlideBar(9, 13, sc.fill);

    // Draw 5 Safety Zone squares (col 2, rows 1..5)
    for (let r = 1; r <= 5; r++) {
      const rx = margin + 2 * cell;
      const ry = margin + r * cell;
      ctx.fillStyle = sc.fill;
      ctx.fillRect(rx, ry, cell, cell);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeRect(rx + 2, ry + 2, cell - 4, cell - 4);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.strokeRect(rx, ry, cell, cell);
    }

    // "SAFETY ZONE" vertical text along safety column
    ctx.save();
    ctx.translate(margin + 2.5 * cell, margin + 3.5 * cell);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.font = '800 26px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('SAFETY ZONE', 0, 0);
    ctx.fillText('SAFETY ZONE', 0, 0);
    ctx.restore();

    // Draw Circular HOME Zone at (col 2.5, row 6.85)
    const homeX = margin + 2.5 * cell;
    const homeY = margin + 6.85 * cell;
    const homeR = cell * 1.25;

    ctx.beginPath();
    ctx.arc(homeX, homeY, homeR, 0, Math.PI * 2);
    ctx.fillStyle = sc.fill;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.font = '800 32px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('HOME', homeX, homeY);
    ctx.fillText('HOME', homeX, homeY);

    // Draw Circular START Zone at (col 4.5, row 2.95)
    const startX = margin + 4.5 * cell;
    const startY = margin + 2.95 * cell;
    const startR = cell * 1.25;

    // Exit arrow connecting START circle to perimeter col 4
    ctx.fillStyle = sc.fill;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(startX - cell * 0.35, margin + cell * 1.85);
    ctx.lineTo(startX + cell * 0.35, margin + cell * 1.85);
    ctx.lineTo(startX + cell * 0.5, margin + cell * 1.05);
    ctx.lineTo(startX - cell * 0.5, margin + cell * 1.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(startX, startY, startR, 0, Math.PI * 2);
    ctx.fillStyle = sc.fill;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.font = '800 32px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText('START', startX, startY);
    ctx.fillText('START', startX, startY);

    ctx.restore();
  }

  // 6. Draw pawn slot rings inside START and HOME using exact getNormalizedBoardCoords
  for (const color of ['red', 'blue', 'yellow', 'green'] as PlayerColor[]) {
    for (let slot = 0; slot < 4; slot++) {
      const startCoord = getNormalizedBoardCoords('start', color, slot, slot);
      const sx = (startCoord.u + 0.5) * size;
      const sy = (startCoord.v + 0.5) * size;
      ctx.beginPath();
      ctx.arc(sx, sy, cell * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const homeCoord = getNormalizedBoardCoords('home', color, slot, slot);
      const hx = (homeCoord.u + 0.5) * size;
      const hy = (homeCoord.v + 0.5) * size;
      ctx.beginPath();
      ctx.arc(hx, hy, cell * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  // 7. Draw "CARDS HERE" and "DISCARD HERE" rounded rectangles flanking the center logo
  const drawCardSlot = (cx: number, cy: number, label1: string, label2: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0.18);
    const cw = cell * 2.55;
    const ch = cell * 1.7;
    drawRoundedRect(ctx, -cw / 2, -ch / 2, cw, ch, 22);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    drawRoundedRect(ctx, -cw / 2 + 10, -ch / 2 + 10, cw - 20, ch - 20, 14);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label1, 0, -13);
    ctx.fillText(label2, 0, 15);
    ctx.restore();
  };

  drawCardSlot(size * 0.44, size * 0.63, 'CARDS', 'HERE');
  drawCardSlot(size * 0.56, size * 0.37, 'DISCARD', 'HERE');

  // 8. Draw the iconic bold angled "SORRY!" centerpiece logo
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(0.22);
  ctx.font = '900 185px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Thick black 3D extrusion shadow
  ctx.fillStyle = '#090a0d';
  for (let ox = -14; ox <= 14; ox += 4) {
    for (let oy = -14; oy <= 14; oy += 4) {
      ctx.fillText('SORRY!', ox + 6, oy + 10);
    }
  }

  ctx.strokeStyle = '#090a0d';
  ctx.lineWidth = 26;
  ctx.strokeText('SORRY!', 0, 0);

  ctx.fillStyle = '#ffffff';
  ctx.fillText('SORRY!', 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates the Classic SORRY! Box Cover Lid texture (placed on the table in FPV before unfolding).
 */
export function createSorryBoxLidTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111318';
  ctx.fillRect(0, 0, w, h);

  // Colorful diagonal rays
  const colors = ['#ef4444', '#0ea5e9', '#eab308', '#22c55e'];
  for (let i = 0; i < 16; i++) {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((i * Math.PI) / 8);
    ctx.fillStyle = colors[i % 4];
    drawRoundedRect(ctx, 80, -16, 420, 32, 16);
    ctx.fill();
    ctx.restore();
  }

  // Outer gold/white trim border
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 18;
  ctx.strokeRect(28, 28, w - 56, h - 56);

  // Center badge
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.12);

  drawRoundedRect(ctx, -380, -150, 760, 300, 42);
  ctx.fillStyle = '#090a0f';
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.font = '900 156px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SORRY!', 0, -18);

  ctx.font = '700 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.fillText('CLASSIC EDITION · THE GAME OF SWEET REVENGE', 0, 92);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates the Face-Down SORRY! Card Back texture matching the reference photo.
 */
export function createCardBackTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const w = 512;
  const h = 768;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111318';
  ctx.fillRect(0, 0, w, h);

  // Diagonal colorful stripes behind logo
  const stripeColors = ['#ef4444', '#0ea5e9', '#eab308', '#22c55e'];
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.55);
  for (let i = -6; i <= 6; i++) {
    ctx.fillStyle = stripeColors[Math.abs(i) % 4];
    drawRoundedRect(ctx, -220, i * 38 - 10, 440, 20, 10);
    ctx.fill();
  }
  ctx.restore();

  // White card border trim
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 16;
  ctx.strokeRect(16, 16, w - 32, h - 32);

  // Bold SORRY! text running diagonally
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(1.05);
  ctx.font = '900 112px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#090a0d';
  ctx.lineWidth = 22;
  ctx.strokeText('SORRY!', 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SORRY!', 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates the Face-Up Card Front texture for a specific rank ('1'..'12', 'SORRY!')
 * matching the white card with 4-color circular target ring in the reference image.
 */
export function createCardFrontTexture(
  rank: CardRank,
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const w = 512;
  const h = 768;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);

  // Subtle gray decorative geometric lines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  // Corner rank badges
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 44px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(rank === 'SORRY!' ? 'S!' : rank, 46, 78);
  ctx.textAlign = 'right';
  ctx.fillText(rank === 'SORRY!' ? 'S!' : rank, w - 46, h - 46);

  // 4-color segmented ring around center
  const cx = w / 2;
  const cy = h * 0.43;
  const outerR = 148;
  const ringColors = ['#ef4444', '#0ea5e9', '#eab308', '#22c55e'];

  for (let q = 0; q < 4; q++) {
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, (q * Math.PI) / 2, ((q + 1) * Math.PI) / 2);
    ctx.lineWidth = 26;
    ctx.strokeStyle = ringColors[q];
    ctx.stroke();
  }

  // Dark inner circle
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - 18, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Rank numeral or SORRY! inside center circle
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (rank === 'SORRY!') {
    ctx.font = '900 54px "Bricolage Grotesque", sans-serif';
    ctx.fillText('SORRY!', cx, cy);
  } else {
    ctx.font = '900 132px "Bricolage Grotesque", sans-serif';
    ctx.fillText(rank, cx, cy + 4);
  }

  // Rule description below ring
  const info = CARD_INFO[rank];
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(info.title.toUpperCase(), cx, h * 0.72);

  // Wrap summary text
  ctx.fillStyle = '#334155';
  ctx.font = '600 21px "Plus Jakarta Sans", sans-serif';
  const words = info.ruleSummary.split(' ');
  let line = '';
  let y = h * 0.79;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > w - 96) {
      ctx.fillText(line, cx, y);
      line = word;
      y += 28;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, y);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates warm dark walnut wood grain albedo + grayscale bump textures for the table.
 */
export function createWalnutWoodTextures(maxAnisotropy: number = 4): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  cCtx.fillStyle = '#2a1810';
  cCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Procedural wood grain fibers
  for (let i = 0; i < 420; i++) {
    const y = (i / 420) * size;
    const wave = Math.sin(i * 0.17) * 14;
    cCtx.strokeStyle = i % 3 === 0 ? 'rgba(20, 10, 5, 0.36)' : 'rgba(68, 39, 22, 0.25)';
    cCtx.lineWidth = 1.5 + (i % 4) * 0.6;
    cCtx.beginPath();
    cCtx.moveTo(0, y);
    cCtx.bezierCurveTo(size * 0.33, y + wave, size * 0.66, y - wave, size, y);
    cCtx.stroke();

    bCtx.strokeStyle = i % 2 === 0 ? '#686868' : '#969696';
    bCtx.lineWidth = 1.2;
    bCtx.beginPath();
    bCtx.moveTo(0, y);
    bCtx.bezierCurveTo(size * 0.33, y + wave, size * 0.66, y - wave, size, y);
    bCtx.stroke();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

/**
 * Generates the Classic 1999 GUESS WHO? Cardboard Box Lid Texture matching the uploaded reference image.
 */
export function createGuessWhoBoxLidTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Sky-blue to white radial burst background matching the classic box
  const grad = ctx.createRadialGradient(w / 2, h * 0.45, 80, w / 2, h / 2, 680);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(0.65, '#0284c7');
  grad.addColorStop(1, '#ffffff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle '?' pattern in background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.font = '900 64px "Bricolage Grotesque", sans-serif';
  for (let x = 60; x < w; x += 140) {
    for (let y = 60; y < h; y += 140) {
      ctx.fillText('?', x, y);
    }
  }

  // Yellow corner starburst ribbon: "Features original art & gameplay"
  ctx.save();
  ctx.translate(165, 115);
  ctx.rotate(-0.22);
  drawRoundedRect(ctx, -135, -48, 270, 96, 18);
  ctx.fillStyle = '#fde047';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#0f172a';
  ctx.stroke();
  ctx.fillStyle = '#15803d';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Features original', 0, -8);
  ctx.fillText('art & gameplay!', 0, 22);
  ctx.restore();

  // Top Header: "The Classic Mystery Face Game"
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0369a1';
  ctx.lineWidth = 8;
  ctx.font = '800 36px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeText('The Classic Mystery Face Game', w * 0.56, 95);
  ctx.fillText('The Classic Mystery Face Game', w * 0.56, 95);

  // Giant Blue/White/Red "GUESS WHO ?" Logo in Center
  const drawLogoWord = (text: string, cx: number, cy: number, fontSize: number) => {
    ctx.save();
    ctx.font = `900 ${fontSize}px "Bricolage Grotesque", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Deep Navy 3D Extrusion Outline
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 38;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, cx, cy + 10);

    // White inner outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 18;
    ctx.strokeText(text, cx, cy);

    // Bright Red Letter Fill
    ctx.fillStyle = '#ef4444';
    ctx.fillText(text, cx, cy);
    ctx.restore();
  };

  drawLogoWord('GUESS', w * 0.53, 250, 148);
  drawLogoWord('WHO', w * 0.53, 410, 148);
  drawLogoWord('?', w * 0.55, 620, 230);

  // Side Callout Questions ("Does your person have blue eyes?", "Is your person wearing a hat?")
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Does your', w * 0.34, 560);
  ctx.fillText('person have', w * 0.34, 595);
  ctx.fillText('glasses?', w * 0.34, 630);

  ctx.fillText('Is your', w * 0.74, 560);
  ctx.fillText('person wearing', w * 0.74, 595);
  ctx.fillText('a hat?', w * 0.74, 630);

  // Draw cartoon mystery faces around the bottom & sides of the box
  const sampleSpots: { x: number; y: number; skin: string; hair: string; hat?: string; glasses?: boolean }[] = [
    { x: 130, y: 310, skin: '#ffdbac', hair: '#facc15', glasses: true },
    { x: 120, y: 520, skin: '#c68642', hair: '#18181b' },
    { x: 145, y: 740, skin: '#f1c27d', hair: '#b45309', hat: '#d97706' },
    { x: 310, y: 830, skin: '#ffdbac', hair: '#5c2c16' },
    { x: 510, y: 850, skin: '#ffdbac', hair: '#f8fafc', glasses: true },
    { x: 710, y: 830, skin: '#8d5524', hair: '#111827' },
    { x: 890, y: 740, skin: '#f1c27d', hair: '#dc2626', hat: '#dc2626' },
    { x: 900, y: 510, skin: '#ffdbac', hair: '#e2e8f0', hat: '#334155' },
    { x: 885, y: 290, skin: '#e0ac69', hair: '#3b2219', glasses: true },
  ];

  for (const s of sampleSpots) {
    ctx.save();
    ctx.translate(s.x, s.y);
    // Circular portrait badge
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.fillStyle = '#fde047';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1e3a8a';
    ctx.stroke();

    // Hair back
    ctx.beginPath();
    ctx.arc(0, -12, 46, 0, Math.PI * 2);
    ctx.fillStyle = s.hair;
    ctx.fill();

    // Face
    ctx.beginPath();
    ctx.arc(0, 4, 38, 0, Math.PI * 2);
    ctx.fillStyle = s.skin;
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-13, -2, 5, 0, Math.PI * 2);
    ctx.arc(13, -2, 5, 0, Math.PI * 2);
    ctx.fill();

    if (s.glasses) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.strokeRect(-26, -12, 22, 18);
      ctx.strokeRect(4, -12, 22, 18);
    }

    if (s.hat) {
      ctx.fillStyle = s.hat;
      ctx.beginPath();
      ctx.arc(0, -24, 40, Math.PI, 0);
      ctx.fill();
    }

    // Smile
    ctx.beginPath();
    ctx.arc(0, 12, 14, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates an illustrated portrait texture for a Guess Who! character stand or Mystery Face card
 * matching the second uploaded reference photo (yellow border, white portrait card, expressive illustrated character, uppercase name plate).
 */
export function createGuessWhoCharacterTexture(
  char: GuessWhoCharacter,
  isMysteryCard: boolean = false,
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const w = 256;
  const h = 340;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Outer card background (Yellow for Mystery Card or Yellow/White for Tray Stand)
  ctx.fillStyle = isMysteryCard ? '#eab308' : '#facc15';
  ctx.fillRect(0, 0, w, h);

  // Inner white portrait window
  const pad = isMysteryCard ? 18 : 12;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(pad, pad, w - pad * 2, h - 78);
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 4;
  ctx.strokeRect(pad, pad, w - pad * 2, h - 78);

  const cx = w / 2;
  const cy = 138;

  // Shoulders / Shirt
  ctx.fillStyle = char.shirtColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 88, 68, 46, 0, Math.PI, 0);
  ctx.fill();

  // Back hair (if not bald)
  if (!char.isBald) {
    ctx.fillStyle = char.hairHex;
    if (char.gender === 'female') {
      drawRoundedRect(ctx, cx - 58, cy - 66, 116, 130, 42);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy - 18, 54, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Side hair fringes for bald characters
    ctx.fillStyle = char.hairHex;
    ctx.beginPath();
    ctx.arc(cx - 46, cy - 8, 14, 0, Math.PI * 2);
    ctx.arc(cx + 46, cy - 8, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ears & Earrings
  ctx.fillStyle = char.skinTone;
  ctx.beginPath();
  ctx.arc(cx - 46, cy + 4, 11, 0, Math.PI * 2);
  ctx.arc(cx + 46, cy + 4, 11, 0, Math.PI * 2);
  ctx.fill();

  if (char.hasEarrings) {
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - 48, cy + 18, 6, 0, Math.PI * 2);
    ctx.arc(cx + 48, cy + 18, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Head / Face oval
  ctx.fillStyle = char.skinTone;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 45, 54, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Top Hair Bangs (if not bald)
  if (!char.isBald) {
    ctx.fillStyle = char.hairHex;
    ctx.beginPath();
    ctx.arc(cx, cy - 22, 46, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
  }

  // Hat / Cap (if hasHat)
  if (char.hasHat) {
    ctx.fillStyle = char.hatColor ?? '#dc2626';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 38, 52, 26, 0, Math.PI, 0);
    ctx.fill();
    // Visor brim
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy - 38, 58, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes (colored irises)
  const eyeHex =
    char.eyeColor === 'blue'
      ? '#0284c7'
      : char.eyeColor === 'green'
      ? '#16a34a'
      : '#451a03';

  for (const ox of [-17, 17]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx + ox, cy - 4, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = eyeHex;
    ctx.beginPath();
    ctx.arc(cx + ox, cy - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#090a0f';
    ctx.beginPath();
    ctx.arc(cx + ox, cy - 4, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyebrows
  ctx.strokeStyle = char.hairHex === '#f8fafc' ? '#94a3b8' : char.hairHex;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 27, cy - 16);
  ctx.lineTo(cx - 8, cy - 15);
  ctx.moveTo(cx + 8, cy - 15);
  ctx.lineTo(cx + 27, cy - 16);
  ctx.stroke();

  // Glasses (if hasGlasses)
  if (char.hasGlasses) {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4.5;
    drawRoundedRect(ctx, cx - 33, cy - 15, 28, 22, 5);
    ctx.stroke();
    drawRoundedRect(ctx, cx + 5, cy - 15, 28, 22, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 5);
    ctx.lineTo(cx + 5, cy - 5);
    ctx.stroke();
  }

  // Nose
  ctx.strokeStyle = 'rgba(0,0,0,0.32)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 2);
  ctx.lineTo(cx - 4, cy + 12);
  ctx.lineTo(cx + 3, cy + 14);
  ctx.stroke();

  // Facial Hair (Mustache / Beard if hasFacialHair)
  if (char.hasFacialHair) {
    ctx.fillStyle = char.hairHex === '#f8fafc' ? '#cbd5e1' : char.hairHex;
    // Mustache
    ctx.beginPath();
    ctx.ellipse(cx, cy + 24, 24, 8, 0, Math.PI, 0);
    ctx.fill();
    // Goatee / Beard trim
    ctx.beginPath();
    ctx.arc(cx, cy + 32, 22, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = char.hairHex === '#f8fafc' ? '#cbd5e1' : char.hairHex;
    ctx.stroke();
  }

  // Expressive Smile
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy + 24, 14, 0.08 * Math.PI, 0.92 * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bottom Name Banner ("MIKE", "EMMA", "BEN", etc.)
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, pad + 6, h - 56, w - (pad + 6) * 2, 42, 8);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char.name, w / 2, h - 34);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates the back texture for a folded Guess Who! stand (shows the '?' mystery emblem).
 */
export function createGuessWhoStandBackTexture(
  trayColor: 'red' | 'blue',
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const w = 256;
  const h = 340;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = trayColor === 'red' ? '#facc15' : '#38bdf8';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  ctx.fillStyle = trayColor === 'red' ? '#dc2626' : '#1d4ed8';
  ctx.font = '900 150px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', w / 2, h / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates the high-resolution Classic MOUSE TRAP! Board Texture matching the user's attached reference images:
 * - Warm kitchen wood + purple interior field with contraption blueprints & kitchen details
 * - Winding colorful perimeter & Loop path corresponding to MOUSE_TRAP_SPACES
 * - Giant golden Swiss CHEESE WHEEL trap space at space 32
 * - Bold yellow & red "Mouse Trap" centerpiece logo
 */
export function createMouseTrapBoardTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Matte Black Bound Cardboard Trim
  ctx.fillStyle = '#110d0a';
  ctx.fillRect(0, 0, size, size);

  const pad = 38;
  // Warm 1990s illustrated kitchen hardwood floor background
  const floorGrad = ctx.createLinearGradient(pad, pad, size - pad, size - pad);
  floorGrad.addColorStop(0, '#f6d58e');
  floorGrad.addColorStop(0.5, '#eec36c');
  floorGrad.addColorStop(1, '#e2b053');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(pad, pad, size - pad * 2, size - pad * 2);

  // Subtle wood floor planks & grain lines
  ctx.strokeStyle = 'rgba(154, 88, 28, 0.24)';
  ctx.lineWidth = 3.5;
  for (let x = pad; x < size - pad; x += 62) {
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, size - pad);
    ctx.stroke();
  }
  for (let y = pad; y < size - pad; y += 240) {
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(size - pad, y);
    ctx.stroke();
  }

  // Upper-Left / Center-Left Checkered Kitchen Linoleum Tile Zone (under Bathtub, Plumbing & Diver)
  ctx.save();
  drawRoundedRect(ctx, 220, 220, 920, 860, 42);
  ctx.clip();
  for (let tx = 220; tx < 1140; tx += 76) {
    for (let ty = 220; ty < 1080; ty += 76) {
      const isAlt = (((tx - 220) / 76 + (ty - 220) / 76) | 0) % 2 === 0;
      ctx.fillStyle = isAlt ? 'rgba(224, 242, 254, 0.82)' : 'rgba(167, 243, 208, 0.72)';
      ctx.fillRect(tx, ty, 76, 76);
    }
  }
  ctx.restore();

  // 2. Authentic Contraption Socket Blueprints (aligned with the 3D connected contraption!)
  const toPx = (xLocal: number, zLocal: number): [number, number] => [
    (xLocal / 1.16 + 0.5) * size,
    (zLocal / 1.16 + 0.5) * size,
  ];

  // Socket A: Yellow Gear Base (#1) & Stop Sign (#6) + Streetlamp (#8) Plate
  ctx.save();
  const [gbX, gbY] = toPx(0.11, 0.21);
  ctx.translate(gbX, gbY);
  drawRoundedRect(ctx, -220, -96, 440, 192, 46);
  ctx.fillStyle = '#84cc16';
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#365314';
  ctx.stroke();
  // Molded peg socket rings
  for (const [sx, sy] of [
    [-130, 0],
    [-25, 0],
    [85, -18],
    [155, -28],
  ]) {
    ctx.beginPath();
    ctx.arc(sx, sy, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#ecfccb';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#365314';
    ctx.stroke();
  }
  ctx.restore();

  // Socket B: Blue Stairs (#10) & Candy-Striped Chute (#12) Footprint
  ctx.save();
  const [stX, stY] = toPx(0.12, -0.02);
  ctx.translate(stX, stY);
  drawRoundedRect(ctx, -185, -108, 370, 216, 42);
  ctx.fillStyle = '#dc2626';
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#facc15';
  ctx.stroke();
  ctx.restore();

  // Socket C: Plumbing Tower (#14), Red Bathtub (#17) & See-Saw (#20) Blueprint
  ctx.save();
  const [plX, plY] = toPx(-0.22, -0.08);
  ctx.translate(plX, plY);
  drawRoundedRect(ctx, -135, -170, 270, 340, 44);
  ctx.fillStyle = '#0284c7';
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#0c4a6e';
  ctx.stroke();
  ctx.restore();

  // Socket D: Green Diamond-Plate Vault & Yellow Washtub (#19) Base next to Cheese Wheel
  ctx.save();
  const [wtX, wtY] = toPx(-0.18, -0.25);
  ctx.translate(wtX, wtY);
  ctx.beginPath();
  ctx.arc(0, 0, 128, 0, Math.PI * 2);
  ctx.fillStyle = '#16a34a';
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#14532d';
  ctx.stroke();
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(-95, 0);
  ctx.lineTo(95, 0);
  ctx.moveTo(0, -95);
  ctx.lineTo(0, 95);
  ctx.stroke();
  ctx.restore();

  // Smiling Orange Fat Cat Illustration at Bottom Edge (near space 11)
  ctx.save();
  ctx.translate(size * 0.56, size * 0.91);
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.ellipse(0, 6, 138, 62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#7c2d12';
  ctx.stroke();
  ctx.fillStyle = '#fff7ed';
  ctx.font = '900 26px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FAT CAT!', 0, 14);
  ctx.restore();

  // Grumpy Brown Mad Bulldog Illustration on Right Edge (near space 19)
  ctx.save();
  ctx.translate(size * 0.81, size * 0.58);
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.arc(0, 0, 86, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#451a03';
  ctx.stroke();
  ctx.fillStyle = '#fef3c7';
  ctx.font = '900 23px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MAD DOG!', 0, 8);
  ctx.restore();

  // 3. Continuous Molded Track Ribbon connecting MOUSE_TRAP_SPACES
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  MOUSE_TRAP_SPACES.forEach((sp, idx) => {
    const x = (sp.u + 0.5) * size;
    const y = (sp.v + 0.5) * size;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  const sp30 = MOUSE_TRAP_SPACES[30];
  ctx.lineTo((sp30.u + 0.5) * size, (sp30.v + 0.5) * size);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 118;
  ctx.stroke();

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 104;
  ctx.stroke();

  ctx.strokeStyle = '#6b21a8';
  ctx.lineWidth = 92;
  ctx.stroke();
  ctx.restore();

  // 4. Draw each individual space tile cleanly aligned with the track
  const palette = ['#7e22ce', '#9333ea', '#facc15', '#6b21a8'];

  MOUSE_TRAP_SPACES.forEach((sp, idx) => {
    const cx = (sp.u + 0.5) * size;
    const cy = (sp.v + 0.5) * size;

    if (sp.type === 'cheese_wheel') {
      const cwRadius = 112;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, cwRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#b45309';
      ctx.stroke();

      const holes = [
        [-36, -26, 15],
        [32, -30, 13],
        [-40, 24, 14],
        [36, 26, 16],
        [0, -42, 11],
        [4, 40, 12],
      ];
      ctx.fillStyle = '#d97706';
      for (const [hx, hy, hr] of holes) {
        ctx.beginPath();
        ctx.arc(cx + hx, cy + hy, hr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#7f1d1d';
      ctx.font = '900 24px "Bricolage Grotesque", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CHEESE', cx, cy - 11);
      ctx.fillText('WHEEL!', cx, cy + 15);
      ctx.restore();
      return;
    }

    const boxW = sp.type === 'start' || sp.type === 'turn_crank' || sp.type === 'safe' ? 104 : 84;
    const boxH = 74;
    const fillHex =
      sp.type === 'start'
        ? '#581c87'
        : sp.type === 'turn_crank'
        ? '#7e22ce'
        : sp.type === 'safe'
        ? '#16a34a'
        : sp.type === 'cheese_2' || sp.type === 'cheese_1'
        ? '#facc15'
        : sp.type === 'build'
        ? '#0284c7'
        : sp.type === 'fat_cat' || sp.type === 'mad_dog' || sp.type === 'dog_bone'
        ? '#dc2626'
        : palette[idx % palette.length];

    ctx.save();
    ctx.translate(cx, cy);
    drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 14);
    ctx.fillStyle = fillHex;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();

    ctx.fillStyle = fillHex === '#facc15' ? '#0f172a' : '#ffffff';
    ctx.font = '900 17px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (sp.type === 'start') {
      ctx.fillText('START', 0, 0);
    } else if (sp.type === 'turn_crank') {
      ctx.fillText('TURN', 0, -9);
      ctx.fillText('CRANK', 0, 10);
    } else if (sp.type === 'safe') {
      ctx.fillText('SAFE', 0, 0);
    } else if (sp.type === 'build') {
      ctx.fillText('2·3·4', 0, -9);
      ctx.fillText('BUILD', 0, 10);
    } else {
      ctx.fillText(sp.shortTag, 0, 0);
    }
    ctx.restore();
  });

  // 5. Classic Bottom-Left "MOUSE TRAP" Gear Logo
  ctx.save();
  ctx.translate(size * 0.28, size * 0.72);
  ctx.rotate(-0.16);
  ctx.font = '900 100px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 26;
  ctx.lineJoin = 'round';
  ctx.strokeText('MOUSE', 0, -42);
  ctx.strokeText('TRAP', 0, 42);

  ctx.fillStyle = '#fde047';
  ctx.fillText('MOUSE', 0, -42);
  ctx.fillStyle = '#ef4444';
  ctx.fillText('TRAP', 0, 42);
  ctx.restore();

  // 6. Subtle Physical Quad-Fold Cardboard Crease Seam
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(size / 2, pad);
  ctx.lineTo(size / 2, size - pad);
  ctx.moveTo(pad, size / 2);
  ctx.lineTo(size - pad, size / 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates the Classic MOUSE TRAP! Cardboard Box Cover Lid Texture.
 */
export function createMouseTrapBoxLidTexture(maxAnisotropy: number = 4): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, 680);
  grad.addColorStop(0, '#7e22ce');
  grad.addColorStop(0.6, '#4c1d95');
  grad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Outer yellow cheese border
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 24;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  // Big Red Cage illustration at top
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(w / 2, 310, 150, Math.PI, 0);
  ctx.stroke();
  for (let x = -120; x <= 120; x += 48) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + x, 190);
    ctx.lineTo(w / 2 + x * 1.1, 320);
    ctx.stroke();
  }

  // Bold "MOUSE TRAP!" Box Cover Logo
  ctx.save();
  ctx.translate(w / 2, 520);
  ctx.rotate(-0.08);
  ctx.font = '900 148px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.strokeStyle = '#090a0f';
  ctx.lineWidth = 32;
  ctx.lineJoin = 'round';
  ctx.strokeText('MOUSE', 0, -70);
  ctx.strokeText('TRAP!', 0, 70);

  ctx.fillStyle = '#fde047';
  ctx.fillText('MOUSE', 0, -70);
  ctx.fillStyle = '#ef4444';
  ctx.fillText('TRAP!', 0, 70);
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 32px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('3D POP-UP CONTRAPTION · FLOATING CHEESE · LIVE MICE', w / 2, 860);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}


