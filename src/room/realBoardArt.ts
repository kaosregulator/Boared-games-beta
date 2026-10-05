import * as THREE from 'three';
import { GameId } from '../types';
import { BOARD, GROUP_COLORS, edgeOf, gridCell } from '../games/monopoly/monopolyData';
import { CELLAR, GRID, ROOM_RECTS } from '../games/clue/clueData';
import { TRACK } from '../games/life/lifeEngine';

/**
 * Board faces drawn from the same data the rules engines use, so the thing that
 * unfolds on the table is the board you then play on rather than a stand-in.
 */

const S = 1024;

function surface(w = S, h = S) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

function finish(c: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/** Shrink the font until the label fits, then draw it centred. */
function fitText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number, size: number, weight = '700') {
  let px = size;
  ctx.font = `${weight} ${px}px "Helvetica Neue", Arial, sans-serif`;
  while (ctx.measureText(text).width > maxW && px > 5) {
    px -= 1;
    ctx.font = `${weight} ${px}px "Helvetica Neue", Arial, sans-serif`;
  }
  ctx.fillText(text, cx, cy);
  return px;
}

/** Two or three stacked lines of a long name, centred on cy. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number, size: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  ctx.font = `700 ${size}px "Helvetica Neue", Arial, sans-serif`;
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (ctx.measureText(probe).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  const top = cy - ((lines.length - 1) * size * 0.56);
  lines.forEach((l, i) => fitText(ctx, l, cx, top + i * size * 1.12, maxW, size));
}

function paper(ctx: CanvasRenderingContext2D, base: string, w = S, h = S) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // print texture so the face does not read as flat vector fill
  for (let i = 0; i < 9000; i += 1) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

/* ----------------------------- Monopoly ---------------------------------- */

const EDGE_ANGLE = { bottom: 0, left: Math.PI / 2, top: Math.PI, right: -Math.PI / 2 } as const;

function drawMonopoly(ctx: CanvasRenderingContext2D) {
  const cell = S / 11;
  paper(ctx, '#bcd8bd');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const space of BOARD) {
    const { col, row } = gridCell(space.i);
    const cx = (col - 0.5) * cell;
    const cy = (row - 0.5) * cell;
    const corner = space.i % 10 === 0;

    ctx.save();
    ctx.translate(cx, cy);
    if (corner) {
      // Corners read along the diagonal on the printed board.
      ctx.rotate(space.i === 0 || space.i === 20 ? -Math.PI / 4 : Math.PI / 4);
    } else {
      ctx.rotate(EDGE_ANGLE[edgeOf(space.i)]);
    }

    const half = cell / 2;
    ctx.fillStyle = '#f7f4ea';
    ctx.fillRect(-half, -half, cell, cell);

    if (space.kind === 'street' && space.group) {
      const barH = cell * 0.26;
      ctx.fillStyle = GROUP_COLORS[space.group];
      ctx.fillRect(-half, -half, cell, barH);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-half, -half, cell, barH);
      ctx.fillStyle = '#17120f';
      wrapLines(ctx, space.short.toUpperCase(), 0, half * 0.1, cell * 0.86, cell * 0.145);
      fitText(ctx, `$${space.price}`, 0, half * 0.72, cell * 0.8, cell * 0.145, '600');
    } else if (space.kind === 'railroad') {
      ctx.fillStyle = '#17120f';
      fitText(ctx, '\u2501\u2501', 0, -half * 0.42, cell * 0.8, cell * 0.3, '900');
      wrapLines(ctx, space.short.toUpperCase(), 0, half * 0.12, cell * 0.86, cell * 0.145);
      fitText(ctx, `$${space.price}`, 0, half * 0.72, cell * 0.8, cell * 0.145, '600');
    } else if (space.kind === 'utility') {
      ctx.fillStyle = space.i === 12 ? '#f2c230' : '#4fa3d1';
      ctx.beginPath();
      ctx.arc(0, -half * 0.42, cell * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#17120f';
      wrapLines(ctx, space.short.toUpperCase(), 0, half * 0.12, cell * 0.86, cell * 0.145);
      fitText(ctx, `$${space.price}`, 0, half * 0.72, cell * 0.8, cell * 0.145, '600');
    } else if (space.kind === 'chance' || space.kind === 'chest') {
      ctx.fillStyle = space.kind === 'chance' ? '#d94f3d' : '#4a7fc1';
      fitText(ctx, space.kind === 'chance' ? '?' : '\u2709', 0, -half * 0.3, cell * 0.7, cell * 0.46, '900');
      ctx.fillStyle = '#17120f';
      wrapLines(ctx, space.kind === 'chance' ? 'CHANCE' : 'COMMUNITY CHEST', 0, half * 0.42, cell * 0.88, cell * 0.14);
    } else if (space.kind === 'tax') {
      ctx.fillStyle = '#17120f';
      wrapLines(ctx, space.name.toUpperCase(), 0, -half * 0.18, cell * 0.88, cell * 0.15);
      fitText(ctx, `PAY $${space.tax}`, 0, half * 0.6, cell * 0.84, cell * 0.135, '600');
    } else {
      // The four corners.
      const label =
        space.kind === 'go' ? 'GO' : space.kind === 'jail' ? 'IN JAIL / JUST VISITING' : space.name.toUpperCase();
      ctx.fillStyle = space.kind === 'go' ? '#d94f3d' : space.kind === 'gotojail' ? '#2f6fb0' : '#17120f';
      wrapLines(ctx, label, 0, 0, cell * 1.22, cell * 0.2);
      if (space.kind === 'go') {
        ctx.fillStyle = '#17120f';
        fitText(ctx, 'COLLECT $200 SALARY AS YOU PASS', 0, cell * 0.44, cell * 1.3, cell * 0.1, '600');
      }
    }

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-half, -half, cell, cell);
    ctx.restore();
  }

  // Centre field with the wordmark and the two card decks.
  const inner = cell;
  ctx.fillStyle = '#bcd8bd';
  ctx.fillRect(inner, inner, S - inner * 2, S - inner * 2);

  const deck = (x: number, y: number, angle: number, title: string, face: string, ink: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    roundRect(ctx, -118, -74, 236, 148, 10);
    ctx.fill();
    ctx.fillStyle = face;
    roundRect(ctx, -124, -80, 248, 160, 10);
    ctx.fill();
    ctx.strokeStyle = '#17120f';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = ink;
    wrapLines(ctx, title, 0, 0, 212, 38);
    ctx.restore();
  };

  deck(S * 0.33, S * 0.33, -Math.PI / 4, 'COMMUNITY CHEST', '#4a7fc1', '#f7f4ea');
  deck(S * 0.67, S * 0.67, -Math.PI / 4, 'CHANCE', '#d94f3d', '#f7f4ea');

  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = '#d94f3d';
  roundRect(ctx, -300, -52, 600, 104, 8);
  ctx.fill();
  ctx.fillStyle = '#f7f4ea';
  fitText(ctx, 'MONOPOLY', 0, 2, 560, 76, '900');
  ctx.restore();
}

/* -------------------------------- Clue ----------------------------------- */

const CLUE_ROOM_TINT: Record<string, string> = {
  Study: '#7a5a8c',
  Hall: '#b08a4a',
  Lounge: '#a8464f',
  Library: '#5f7f9c',
  'Billiard Room': '#457a5c',
  'Dining Room': '#9c6a3c',
  Conservatory: '#4f8a6a',
  Ballroom: '#6a6fa8',
  Kitchen: '#8c8c56',
};

function drawClue(ctx: CanvasRenderingContext2D) {
  const t = S / GRID;
  paper(ctx, '#2d4a33');

  // corridor tiles
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#e5d6a8' : '#dcc993';
      ctx.fillRect(x * t, y * t, t, t);
      ctx.strokeStyle = 'rgba(70,52,28,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * t, y * t, t, t);
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const room of ROOM_RECTS) {
    const x = room.x * t;
    const y = room.y * t;
    const w = room.w * t;
    const h = room.h * t;
    ctx.fillStyle = CLUE_ROOM_TINT[room.name] ?? '#6a5a7a';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#1c2a1f';
    ctx.lineWidth = 5;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    wrapLines(ctx, room.name.toUpperCase(), x + w / 2, y + h / 2, w * 0.86, Math.min(h * 0.3, 30));

    // doorway tiles, marked on the corridor side of the wall
    for (const [dx, dy] of room.doors) {
      ctx.fillStyle = '#b4883c';
      ctx.fillRect(dx * t + t * 0.18, dy * t + t * 0.18, t * 0.64, t * 0.64);
      ctx.strokeStyle = '#4a3418';
      ctx.lineWidth = 2;
      ctx.strokeRect(dx * t + t * 0.18, dy * t + t * 0.18, t * 0.64, t * 0.64);
    }
  }

  // secret passages marked in the two diagonal corners
  ctx.fillStyle = '#f0e2b8';
  ctx.font = '700 22px sans-serif';
  ctx.fillText('\u2197', (ROOM_RECTS[0].x + ROOM_RECTS[0].w - 0.5) * t, (ROOM_RECTS[0].y + ROOM_RECTS[0].h - 0.5) * t);
  ctx.fillText('\u2196', (ROOM_RECTS[8].x + 0.5) * t, (ROOM_RECTS[8].y + 0.5) * t);

  // cellar / case file
  const cx = CELLAR.x * t;
  const cy = CELLAR.y * t;
  ctx.fillStyle = '#1c2a1f';
  ctx.fillRect(cx, cy, CELLAR.w * t, CELLAR.h * t);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 5;
  ctx.strokeRect(cx + 6, cy + 6, CELLAR.w * t - 12, CELLAR.h * t - 12);
  ctx.fillStyle = '#e8d9a0';
  wrapLines(ctx, 'CASE FILE', cx + (CELLAR.w * t) / 2, cy + (CELLAR.h * t) / 2, CELLAR.w * t * 0.8, 30);
}

/* -------------------------------- Life ----------------------------------- */

const LIFE_TINT: Record<string, string> = {
  start: '#c9a227',
  payday: '#2f7bb5',
  collect: '#3fa661',
  pay: '#d94f6a',
  tax: '#b4442f',
  'spin-pay': '#d98a2b',
  life: '#d9a21b',
  baby: '#e07aa0',
  'stop-career': '#2f7bb5',
  'stop-marry': '#e07aa0',
  'stop-house': '#8a6fb5',
  'stop-family': '#3fa661',
  'stop-retire': '#c9a227',
  retire: '#c9a227',
};

function drawLife(ctx: CanvasRenderingContext2D) {
  // rolling landscape the track winds through
  const sky = ctx.createLinearGradient(0, 0, 0, S);
  sky.addColorStop(0, '#5aa8cf');
  sky.addColorStop(0.42, '#8dc48a');
  sky.addColorStop(1, '#6aa35c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 7; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.16 + (i % 3) * 0.07})`;
    ctx.beginPath();
    ctx.ellipse(120 + i * 140, 70 + (i % 3) * 36, 86, 34, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const cols = 8;
  const rows = Math.ceil(TRACK.length / cols);
  const padX = 60;
  const padY = 150;
  const cw = (S - padX * 2) / cols;
  const ch = (S - padY - 70) / rows;

  const centreOf = (i: number) => {
    const row = Math.floor(i / cols);
    const slot = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
    return { x: padX + (slot + 0.5) * cw, y: padY + (row + 0.5) * ch };
  };

  // the road itself, drawn under the tiles
  const road = () => {
    ctx.beginPath();
    TRACK.forEach((_, i) => {
      const p = centreOf(i);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  };
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4a4036';
  ctx.lineWidth = Math.min(cw, ch) * 0.84;
  road();
  ctx.strokeStyle = '#ece0c6';
  ctx.lineWidth = Math.min(cw, ch) * 0.76;
  road();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const r = Math.min(cw, ch) * 0.33;

  TRACK.forEach((space, i) => {
    const p = centreOf(i);
    ctx.fillStyle = LIFE_TINT[space.type] ?? '#8a8a8a';
    roundRect(ctx, p.x - r, p.y - r, r * 2, r * 2, r * 0.42);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,30,30,0.55)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    const short = space.type.startsWith('stop-')
      ? 'STOP'
      : space.type === 'payday'
        ? 'PAY DAY'
        : space.type === 'life'
          ? 'LIFE'
          : space.amount
            ? `${space.type === 'collect' ? '+' : '-'}${Math.round(space.amount / 1000)}k`
            : space.type.toUpperCase();
    fitText(ctx, short, p.x, p.y, r * 1.8, r * 0.62, '800');
  });

  ctx.fillStyle = '#1f4d2f';
  fitText(ctx, 'THE GAME OF LIFE', S / 2, 86, S * 0.72, 86, '900');
  ctx.fillStyle = '#1f4d2f';
  fitText(ctx, 'START \u2192 COLLEGE OR CAREER \u2192 RETIRE', S / 2, S - 34, S * 0.6, 32, '700');
}

/* --------------------------- Classic grids -------------------------------- */

function drawCheckerboard(ctx: CanvasRenderingContext2D, light: string, dark: string, frame: string, labels: boolean) {
  paper(ctx, frame);
  const pad = S * 0.07;
  const size = S - pad * 2;
  const sq = size / 8;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(pad - 8, pad - 8, size + 16, size + 16);
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      ctx.fillStyle = (r + c) % 2 === 0 ? light : dark;
      ctx.fillRect(pad + c * sq, pad + r * sq, sq, sq);
    }
  }
  if (labels) {
    ctx.fillStyle = '#efe3cf';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    'abcdefgh'.split('').forEach((f, i) => {
      fitText(ctx, f, pad + (i + 0.5) * sq, S - pad / 2, sq, pad * 0.5);
      fitText(ctx, String(8 - i), pad / 2, pad + (i + 0.5) * sq, pad * 0.8, pad * 0.5);
    });
  }
}

function drawConnect4(ctx: CanvasRenderingContext2D) {
  paper(ctx, '#1d4ed8');
  const pad = S * 0.08;
  const w = S - pad * 2;
  const cw = w / 7;
  const ch = (S - pad * 2) / 6;
  ctx.fillStyle = '#1a3fb0';
  roundRect(ctx, pad - 14, pad - 14, w + 28, S - pad * 2 + 28, 26);
  ctx.fill();
  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < 7; c += 1) {
      const x = pad + (c + 0.5) * cw;
      const y = pad + (r + 0.5) * ch;
      const rad = Math.min(cw, ch) * 0.38;
      const g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 2, x, y, rad);
      g.addColorStop(0, '#0b1a44');
      g.addColorStop(1, '#13245c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#fef9c3';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitText(ctx, 'FOUR IN A ROW', S / 2, pad * 0.5, S * 0.5, 44, '900');
}

function drawBattleship(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, '#0e7490');
  g.addColorStop(1, '#082f49');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const panel = (top: number, title: string) => {
    const pad = 86;
    const size = S - pad * 2;
    const cell = size / 10;
    ctx.fillStyle = 'rgba(8,47,73,0.6)';
    roundRect(ctx, pad - 26, top - 46, size + 52, size * 0.42 + 72, 16);
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    fitText(ctx, title, S / 2, top - 20, size, 32, '800');
    ctx.strokeStyle = 'rgba(224,242,254,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 10; i += 1) {
      ctx.beginPath();
      ctx.moveTo(pad + i * cell, top);
      ctx.lineTo(pad + i * cell, top + size * 0.4);
      ctx.stroke();
    }
    for (let i = 0; i <= 10; i += 1) {
      const y = top + (size * 0.4 * i) / 10;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pad + size, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#bae6fd';
    for (let i = 0; i < 10; i += 1) {
      fitText(ctx, 'ABCDEFGHIJ'[i], pad + (i + 0.5) * cell, top - 2 + size * 0.4 + 20, cell, 20, '700');
      fitText(ctx, String(i + 1), pad - 24, top + (size * 0.4 * (i + 0.5)) / 10, 40, 20, '700');
    }
  };

  panel(130, 'YOUR FLEET');
  panel(620, 'TARGET GRID');
}

function drawSorry(ctx: CanvasRenderingContext2D) {
  paper(ctx, '#f2ece0');
  const colours = ['#d94f3d', '#2f7bb5', '#3fa661', '#d9a21b'];
  const pad = S * 0.055;
  const track = S - pad * 2;
  const cells = 16;
  const cw = track / cells;

  const slot = (x: number, y: number, w: number, h: number, fill: string) => {
    ctx.fillStyle = fill;
    roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,20,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  for (let i = 0; i < cells; i += 1) {
    slot(pad + i * cw, pad, cw, cw, i % 4 === 0 ? colours[0] : '#fbf7ef');
    slot(pad + i * cw, S - pad - cw, cw, cw, i % 4 === 0 ? colours[2] : '#fbf7ef');
    slot(pad, pad + i * cw, cw, cw, i % 4 === 0 ? colours[1] : '#fbf7ef');
    slot(S - pad - cw, pad + i * cw, cw, cw, i % 4 === 0 ? colours[3] : '#fbf7ef');
  }

  // start circles and home bases tucked inside each corner
  const base = (x: number, y: number, fill: string, label: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, 74, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitText(ctx, label, x, y, 120, 30, '800');
  };
  base(S * 0.27, S * 0.27, colours[0], 'START');
  base(S * 0.73, S * 0.27, colours[3], 'HOME');
  base(S * 0.27, S * 0.73, colours[1], 'HOME');
  base(S * 0.73, S * 0.73, colours[2], 'START');

  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.rotate(-Math.PI / 8);
  ctx.fillStyle = '#b4442f';
  roundRect(ctx, -230, -62, 460, 124, 16);
  ctx.fill();
  ctx.fillStyle = '#fbf7ef';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitText(ctx, 'PAWN RUSH', 0, 4, 420, 82, '900');
  ctx.restore();
}

function drawFelt(ctx: CanvasRenderingContext2D, title: string, base: string, seats: number) {
  paper(ctx, base);
  ctx.strokeStyle = 'rgba(248,240,210,0.45)';
  ctx.lineWidth = 10;
  roundRect(ctx, 44, 44, S - 88, S - 88, 34);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < seats; i += 1) {
    const a = Math.PI * (0.18 + (i / (seats - 1)) * 0.64);
    const x = S / 2 + Math.cos(a) * S * 0.33;
    const y = S * 0.62 + Math.sin(a) * S * 0.26;
    ctx.strokeStyle = 'rgba(248,240,210,0.42)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, 58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(248,240,210,0.5)';
    fitText(ctx, String(i + 1), x, y, 80, 34, '800');
  }

  ctx.fillStyle = 'rgba(248,240,210,0.9)';
  fitText(ctx, title, S / 2, S * 0.26, S * 0.66, 92, '900');
  ctx.fillStyle = 'rgba(248,240,210,0.6)';
  fitText(ctx, 'DEALER MUST ANNOUNCE THE POT', S / 2, S * 0.36, S * 0.5, 28, '700');
}

function drawDiceMat(ctx: CanvasRenderingContext2D, title: string) {
  paper(ctx, '#7b1d1d');
  ctx.strokeStyle = 'rgba(254,243,199,0.5)';
  ctx.lineWidth = 9;
  roundRect(ctx, 48, 48, S - 96, S - 96, 30);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fef3c7';
  fitText(ctx, title, S / 2, 150, S * 0.6, 96, '900');

  const pips: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  };
  for (let v = 1; v <= 6; v += 1) {
    const x = 150 + ((v - 1) % 3) * 362;
    const y = 400 + Math.floor((v - 1) / 3) * 310;
    ctx.fillStyle = '#f7f1e3';
    roundRect(ctx, x - 100, y - 100, 200, 200, 30);
    ctx.fill();
    ctx.fillStyle = '#1d1b1a';
    for (const [gx, gy] of pips[v]) {
      ctx.beginPath();
      ctx.arc(x + gx * 54, y + gy * 54, 19, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTrivia(ctx: CanvasRenderingContext2D) {
  paper(ctx, '#3d1a78');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = ['#d94f3d', '#d9a21b', '#3fa661', '#2f7bb5', '#8a6fb5', '#22d3ee'][i];
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = S / 2 + Math.cos(a) * S * 0.3;
    const y = S / 2 + Math.sin(a) * S * 0.3;
    ctx.beginPath();
    ctx.arc(x, y, 88, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    fitText(ctx, ['POP', 'SCI', 'ART', 'GEO', 'HIST', 'SPORT'][i], x, y, 150, 34, '900');
  }
  ctx.fillStyle = '#fbbf24';
  fitText(ctx, 'TRIVIA NIGHT', S / 2, S / 2, S * 0.4, 72, '900');
}

/* ------------------------------ Public API -------------------------------- */

/** Cardboard, lid field and ink colour of each box on the shelf. */
export const BOX_FACE: Record<string, { card: string; face: string; ink: string }> = {
  battleship: { card: '#a16245', face: '#0c4a6e', ink: '#e0f2fe' },
  chess: { card: '#8a5a3b', face: '#292524', ink: '#f5f5f4' },
  checkers: { card: '#8a5a3b', face: '#7f1d1d', ink: '#fee2e2' },
  connect4: { card: '#a16245', face: '#1d4ed8', ink: '#fef9c3' },
  pawnrush: { card: '#a16245', face: '#be123c', ink: '#fff1f2' },
  poker: { card: '#a16245', face: '#7f1d1d', ink: '#fef3c7' },
  blackjack: { card: '#a16245', face: '#14532d', ink: '#dcfce7' },
  gofish: { card: '#a16245', face: '#0e7490', ink: '#ecfeff' },
  casino: { card: '#a16245', face: '#065f46', ink: '#d1fae5' },
  liarsdice: { card: '#a16245', face: '#854d0e', ink: '#fef9c3' },
  trivia: { card: '#a16245', face: '#4c1d95', ink: '#fde68a' },
  yahtzee: { card: '#a16245', face: '#7f1d1d', ink: '#fef3c7' },
  clue: { card: '#a16245', face: '#14532d', ink: '#fef9c7' },
  life: { card: '#a16245', face: '#166534', ink: '#ecfccb' },
  monopoly: { card: '#a16245', face: '#1d4ed8', ink: '#ffffff' },
};

const FACE_CACHE = new Map<string, THREE.Texture>();

export function boardFaceTexture(id: GameId): THREE.Texture {
  const hit = FACE_CACHE.get(id);
  if (hit) return hit;

  const { c, ctx } = surface();
  switch (id) {
    case 'monopoly':
      drawMonopoly(ctx);
      break;
    case 'clue':
      drawClue(ctx);
      break;
    case 'life':
      drawLife(ctx);
      break;
    case 'chess':
      drawCheckerboard(ctx, '#efe0c4', '#6b4226', '#3b2418', true);
      break;
    case 'checkers':
      drawCheckerboard(ctx, '#f0d6bd', '#8c2a24', '#3b2418', false);
      break;
    case 'connect4':
      drawConnect4(ctx);
      break;
    case 'battleship':
      drawBattleship(ctx);
      break;
    case 'pawnrush':
      drawSorry(ctx);
      break;
    case 'poker':
      drawFelt(ctx, "HOLD 'EM", '#14532d', 5);
      break;
    case 'blackjack':
      drawFelt(ctx, 'BLACKJACK PAYS 3 TO 2', '#14532d', 5);
      break;
    case 'gofish':
      drawFelt(ctx, 'GO FISH', '#0e7490', 4);
      break;
    case 'casino':
      drawFelt(ctx, 'CASINO LOUNGE', '#065f46', 5);
      break;
    case 'yahtzee':
      drawDiceMat(ctx, 'YAHTZEE');
      break;
    case 'liarsdice':
      drawDiceMat(ctx, "LIAR'S DICE");
      break;
    default:
      drawTrivia(ctx);
      break;
  }

  const tex = finish(c);
  FACE_CACHE.set(id, tex);
  return tex;
}

/**
 * One leaf of a bifold board. `far` is the half away from the player, which is
 * the top of the printed sheet. The clone shares the canvas, so the whole board
 * is only rasterised once however many leaves ask for it.
 */
export function boardHalfTexture(id: GameId, side: 'near' | 'far'): THREE.Texture {
  const half = boardFaceTexture(id).clone();
  half.needsUpdate = true;
  half.repeat.set(1, 0.5);
  half.offset.set(0, side === 'far' ? 0.5 : 0);
  return half;
}

/** Box spine: the strip you actually read when the box is shelved edge-out. */
export function spineStripTexture(id: GameId, title: string, face: string, ink: string): THREE.Texture {
  const w = 1024;
  const h = 170;
  const { c, ctx } = surface(w, h);
  paper(ctx, face, w, h);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, h - 14, w, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(0, 0, w, 8);

  const art = boardFaceTexture(id).image as HTMLCanvasElement;
  const tile = h - 34;
  ctx.save();
  roundRect(ctx, w - tile - 26, 17, tile, tile, 8);
  ctx.clip();
  ctx.drawImage(art, w - tile - 26, 17, tile, tile);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;
  fitText(ctx, title.toUpperCase(), (w - tile - 26) / 2 + 20, h / 2, w - tile - 110, 108, '900');
  return finish(c);
}

/**
 * Box lid: brand field, wordmark and a window onto the real board face, the way
 * a shelf box actually sells itself.
 */
export function lidTexture(id: GameId, title: string, face: string, ink: string): THREE.Texture {
  const w = 1024;
  const h = 540;
  const { c, ctx } = surface(w, h);
  paper(ctx, face, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 10;
  ctx.strokeRect(16, 16, w - 32, h - 32);

  const art = boardFaceTexture(id).image as HTMLCanvasElement;
  const artSize = h - 150;
  ctx.save();
  roundRect(ctx, w - artSize - 54, (h - artSize) / 2, artSize, artSize, 14);
  ctx.clip();
  ctx.drawImage(art, w - artSize - 54, (h - artSize) / 2, artSize, artSize);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 6;
  roundRect(ctx, w - artSize - 54, (h - artSize) / 2, artSize, artSize, 14);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;
  const textW = w - artSize - 150;
  wrapLines(ctx, title.toUpperCase(), 64 + textW / 2, h * 0.42, textW, 104);
  ctx.globalAlpha = 0.72;
  fitText(ctx, '2 TO 6 PLAYERS \u00b7 AGES 8 AND UP', 64 + textW / 2, h * 0.74, textW, 30, '700');
  ctx.globalAlpha = 1;

  return finish(c);
}
