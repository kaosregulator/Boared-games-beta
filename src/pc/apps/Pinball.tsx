import React, { useEffect, useRef, useState } from 'react';
import { readStore, writeStore } from '../os/settings';
import { hz, noise, sfx, tone } from '../os/sound';
import { MenuBar } from '../os/Window';
import { closeWindow, messageBox, useWm, type WinState } from '../os/wm';
import {
  BUMPERS,
  FLIP_L,
  FLIP_R,
  GEOMETRY,
  HOLE,
  LANE_POSTS,
  LANE_X,
  LANES,
  RANKS,
  SLINGS,
  STANDUPS,
  TARGETS,
  TH,
  TW,
  messageVisible,
  newGame,
  nudge,
  release,
  step,
  type Game,
  type SoundKey,
} from './pinball/engine';

/**
 * Pinball, Space Cadet style: a deep-space table with three pop bumpers,
 * slingshots, drop targets, a hyperspace hole, rollover lanes that raise the
 * bonus multiplier, ball save, nudging and tilt, and nine ranks to climb.
 *
 *   Z / Left Shift   left flipper       / or M / Right Shift   right flipper
 *   Space (hold)     plunger            X or ↑                 nudge
 *   F2               new game
 *
 * Mouse or touch: press the left or right half of the table for the flippers,
 * and hold the plunger at the bottom right.
 */

const SCALE = 0.95;

function play(s: SoundKey) {
  switch (s) {
    case 'flipper':
      noise(0, 0.06, 0.25, 'lowpass', 600, 1);
      tone(90, 0, 0.07, { type: 'square', gain: 0.05 });
      break;
    case 'bumper':
      tone(hz(84 + Math.floor(Math.random() * 3) * 2), 0, 0.18, { type: 'square', gain: 0.05 });
      tone(hz(96), 0, 0.1, { type: 'sine', gain: 0.06 });
      break;
    case 'sling':
      noise(0, 0.05, 0.3, 'bandpass', 1400, 2);
      tone(hz(72), 0, 0.08, { type: 'triangle', gain: 0.07 });
      break;
    case 'target':
      tone(hz(79), 0, 0.08, { type: 'square', gain: 0.05 });
      tone(hz(86), 0.07, 0.12, { type: 'square', gain: 0.05 });
      break;
    case 'rollover':
      tone(hz(91), 0, 0.09, { type: 'sine', gain: 0.07 });
      break;
    case 'hole': {
      for (let i = 0; i < 10; i += 1) tone(hz(96 - i * 3), i * 0.06, 0.08, { type: 'sawtooth', gain: 0.03 });
      break;
    }
    case 'launch':
      noise(0, 0.25, 0.3, 'bandpass', 500, 1);
      tone(140, 0, 0.2, { type: 'triangle', gain: 0.08 });
      break;
    case 'drain':
      for (let i = 0; i < 4; i += 1) tone(hz(60 - i * 3), i * 0.16, 0.2, { type: 'square', gain: 0.04 });
      break;
    case 'wall':
      noise(0, 0.03, 0.12, 'lowpass', 900);
      break;
    case 'bonus':
    case 'rank':
      [72, 76, 79, 84, 88].forEach((n, i) => tone(hz(n), i * 0.07, 0.16, { type: 'square', gain: 0.04 }));
      break;
    case 'save':
      tone(hz(84), 0, 0.3, { type: 'sine', gain: 0.08, wet: 0.3 });
      tone(hz(91), 0.12, 0.3, { type: 'sine', gain: 0.08, wet: 0.3 });
      break;
    case 'gameover':
      sfx.shutdown();
      break;
  }
}

function paintTable(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TW;
  c.height = TH;
  const g = c.getContext('2d')!;
  // deep space
  const bg = g.createLinearGradient(0, 0, 0, TH);
  bg.addColorStop(0, '#05021a');
  bg.addColorStop(0.5, '#120a3a');
  bg.addColorStop(1, '#03010d');
  g.fillStyle = bg;
  g.fillRect(0, 0, TW, TH);
  // nebulae
  const neb = (x: number, y: number, r: number, col: string) => {
    const n = g.createRadialGradient(x, y, 0, x, y, r);
    n.addColorStop(0, col);
    n.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = n;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  neb(90, 200, 140, 'rgba(160,40,200,.35)');
  neb(280, 120, 120, 'rgba(30,120,255,.3)');
  neb(200, 330, 110, 'rgba(255,60,120,.18)');
  // stars
  let s = 7;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i += 1) {
    const a = rand();
    g.fillStyle = `rgba(255,255,255,${0.2 + a * 0.8})`;
    g.fillRect(rand() * TW, rand() * TH, a > 0.9 ? 2 : 1, a > 0.9 ? 2 : 1);
  }
  // a planet down in the corner
  const pl = g.createRadialGradient(70, 470, 10, 90, 480, 90);
  pl.addColorStop(0, '#5ad1ff');
  pl.addColorStop(0.6, '#1b4f9a');
  pl.addColorStop(1, 'rgba(10,20,60,0)');
  g.fillStyle = pl;
  g.beginPath();
  g.arc(90, 490, 80, 0, Math.PI * 2);
  g.fill();

  // printed playfield art: the title around the bumpers
  g.save();
  g.translate(190, 205);
  g.font = 'bold 15px "Arial Black", Arial, sans-serif';
  g.fillStyle = 'rgba(255,220,80,.35)';
  const word = 'SPACE  CADET';
  for (let i = 0; i < word.length; i += 1) {
    const a = -Math.PI * 0.82 + (i / (word.length - 1)) * Math.PI * 0.64;
    g.save();
    g.rotate(a + Math.PI / 2);
    g.fillText(word[i], -5, -88);
    g.restore();
  }
  g.restore();
  // arrows toward the flippers and the hole
  const arrow = (x: number, y: number, rot: number, col: string) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, -9);
    g.lineTo(7, 4);
    g.lineTo(-7, 4);
    g.closePath();
    g.fill();
    g.restore();
  };
  [0, 1, 2].forEach(i => arrow(80 + i * 4, 190 - i * 18, -0.4, `rgba(180,140,255,${0.25 + i * 0.15})`));
  [0, 1, 2].forEach(i => arrow(177, 300 + i * 18, Math.PI, `rgba(255,90,90,${0.2 + i * 0.12})`));
  // insignia between the flippers
  g.strokeStyle = 'rgba(255,220,80,.4)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(160, 360);
  g.lineTo(177, 342);
  g.lineTo(194, 360);
  g.moveTo(160, 372);
  g.lineTo(177, 354);
  g.lineTo(194, 372);
  g.stroke();

  // the shooter lane floor
  g.fillStyle = 'rgba(40,30,80,.75)';
  g.fillRect(LANE_X, 170, 370 - LANE_X, TH - 170);

  // walls in chrome
  g.lineCap = 'round';
  for (const sgm of GEOMETRY.segs) {
    if (sgm.kind === 'sling' || sgm.kind === 'target' || sgm.kind === 'standup' || sgm.kind === 'gate') continue;
    g.strokeStyle = '#8890b8';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(sgm.ax, sgm.ay);
    g.lineTo(sgm.bx, sgm.by);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = 1;
    g.stroke();
  }
  for (const p of GEOMETRY.circs) {
    if (p.kind !== 'post') continue;
    g.fillStyle = '#c0c6e0';
    g.beginPath();
    g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    g.fill();
  }
  // lane letters
  g.font = 'bold 10px Arial';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(255,255,255,.4)';
  ['R', 'U', 'N'].forEach((l, i) => g.fillText(l, LANES[i], 110));
  return c;
}

function draw(g: CanvasRenderingContext2D, table: HTMLCanvasElement, game: Game, now: number) {
  g.drawImage(table, 0, 0);
  const t = game.time;

  // hyperspace hole
  const hf = Math.max(0, 1 - (t - game.holeFlash) * 1.2);
  const hole = g.createRadialGradient(HOLE.x, HOLE.y, 1, HOLE.x, HOLE.y, HOLE.r + 8);
  hole.addColorStop(0, '#000');
  hole.addColorStop(0.6, `rgba(120,60,255,${0.6 + hf * 0.4})`);
  hole.addColorStop(1, 'rgba(120,60,255,0)');
  g.fillStyle = hole;
  g.beginPath();
  g.arc(HOLE.x, HOLE.y, HOLE.r + 8, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = `rgba(200,170,255,${0.5 + 0.5 * Math.sin(now / 200)})`;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(HOLE.x, HOLE.y, HOLE.r + 2 + Math.sin(now / 300) * 2, 0, Math.PI * 2);
  g.stroke();

  // rollover lights
  LANES.forEach((x, i) => {
    g.fillStyle = game.lanes[i] ? '#ffe14d' : 'rgba(255,225,77,.18)';
    g.shadowColor = '#ffe14d';
    g.shadowBlur = game.lanes[i] ? 10 : 0;
    g.beginPath();
    g.arc(x, 82, 4, 0, Math.PI * 2);
    g.fill();
  });
  g.shadowBlur = 0;
  void LANE_POSTS;

  // bumpers
  BUMPERS.forEach(([x, y, r], i) => {
    const flash = Math.max(0, 1 - (t - game.bumperFlash[i]) * 6);
    g.shadowColor = '#ff5ad0';
    g.shadowBlur = 8 + flash * 16;
    const grd = g.createRadialGradient(x - 5, y - 5, 2, x, y, r);
    grd.addColorStop(0, flash > 0.1 ? '#fff' : '#ffc0f0');
    grd.addColorStop(0.5, flash > 0.1 ? '#ff8ae0' : '#d0309a');
    grd.addColorStop(1, '#5a0a40');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = '#ffd8f6';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, r - 5, 0, Math.PI * 2);
    g.stroke();
  });

  // slingshots
  SLINGS.forEach(([ax, ay, bx, by], i) => {
    const flash = Math.max(0, 1 - (t - game.slingFlash[i]) * 7);
    g.fillStyle = `rgba(60,200,255,${0.25 + flash * 0.5})`;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.lineTo(i === 0 ? ax : ax, by - 20);
    g.closePath();
    g.fill();
    g.strokeStyle = flash > 0.1 ? '#fff' : '#5ad1ff';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.stroke();
  });

  // drop targets
  TARGETS.forEach(([ax, ay, , by], i) => {
    g.fillStyle = game.targets[i] ? '#ff8a3d' : 'rgba(255,138,61,.15)';
    g.fillRect(ax - 4, ay, 8, by - ay);
  });
  STANDUPS.forEach(([ax, ay, , by], i) => {
    g.fillStyle = game.standups[i] ? '#9f9' : '#2a7a3a';
    g.fillRect(ax - 3, ay, 7, by - ay);
  });

  // plunger
  const pz = game.plunger * 16;
  g.fillStyle = '#7a7f9a';
  g.fillRect(352, 460 + pz, 10, 24);
  g.fillStyle = '#c94';
  g.fillRect(350, 459 + pz, 14, 4);
  for (let i = 0; i < 6; i += 1) {
    g.strokeStyle = '#aaa';
    g.beginPath();
    g.moveTo(350, 465 + pz + i * (3 - game.plunger * 1.5));
    g.lineTo(364, 467 + pz + i * (3 - game.plunger * 1.5));
    g.stroke();
  }

  // flippers
  for (const f of game.flippers) {
    const tx = f.px + Math.cos(f.angle) * f.len;
    const ty = f.py + Math.sin(f.angle) * f.len;
    const nx = -Math.sin(f.angle);
    const ny = Math.cos(f.angle);
    g.fillStyle = game.tilted ? '#666' : '#ffcc00';
    g.strokeStyle = '#7a4a00';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(f.px + nx * 8, f.py + ny * 8);
    g.lineTo(tx + nx * 4, ty + ny * 4);
    g.arc(tx, ty, 4, f.angle + Math.PI / 2, f.angle - Math.PI / 2, true);
    g.lineTo(f.px - nx * 8, f.py - ny * 8);
    g.arc(f.px, f.py, 8, f.angle - Math.PI / 2, f.angle + Math.PI / 2, true);
    g.fill();
    g.stroke();
    g.fillStyle = '#fff4b0';
    g.beginPath();
    g.arc(f.px, f.py, 3, 0, Math.PI * 2);
    g.fill();
  }
  void FLIP_L;
  void FLIP_R;

  // ball
  const b = game.ball;
  if (!b.heldUntil) {
    b.trail.forEach((p, i) => {
      g.fillStyle = `rgba(180,200,255,${0.12 - i * 0.018})`;
      g.beginPath();
      g.arc(p.x, p.y, 7, 0, Math.PI * 2);
      g.fill();
    });
    const shine = g.createRadialGradient(b.x - 2.5, b.y - 2.5, 1, b.x, b.y, 7);
    shine.addColorStop(0, '#fff');
    shine.addColorStop(0.4, '#c8ccd8');
    shine.addColorStop(1, '#4a4e60');
    g.fillStyle = shine;
    g.beginPath();
    g.arc(b.x, b.y, 7, 0, Math.PI * 2);
    g.fill();
  }

  // score popups
  g.textAlign = 'center';
  g.font = 'bold 11px Arial';
  for (const p of game.popups) {
    const age = t - p.born;
    if (age > 1) continue;
    g.fillStyle = p.color;
    g.globalAlpha = 1 - age;
    g.fillText(p.text, p.x, p.y - age * 20);
  }
  g.globalAlpha = 1;

  if (game.tilted) {
    g.font = 'bold 44px "Arial Black", Arial';
    g.fillStyle = `rgba(255,40,40,${0.6 + 0.4 * Math.sin(now / 120)})`;
    g.fillText('TILT', 177, 260);
  }
  if (game.over) {
    g.fillStyle = 'rgba(0,0,0,.55)';
    g.fillRect(0, 200, TW, 90);
    g.font = 'bold 26px "Arial Black", Arial';
    g.fillStyle = '#ffe14d';
    g.fillText('GAME OVER', 177, 240);
    g.font = 'bold 12px Arial';
    g.fillStyle = '#fff';
    g.fillText('Press F2 or click New Game', 177, 266);
  }
}

export function Pinball({ win }: { win: WinState }) {
  const { focused } = useWm();
  const active = focused === win.id;
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game>(newGame());
  const [hud, setHud] = useState({ score: 0, balls: 3, rank: 0, msg: '', mult: 1 });
  const [high, setHigh] = useState(() => readStore<number>('pinball.high', 0));
  const recorded = useRef(false);
  const [paused, setPaused] = useState(false);
  const activeRef = useRef(active);
  activeRef.current = active;

  const restart = () => {
    game.current = newGame();
    recorded.current = false;
    setPaused(false);
  };

  useEffect(() => {
    const table = paintTable();
    const g = canvas.current!.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let hudAt = 0;
    const loop = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      const gm = game.current;
      if (!pausedRef.current) step(gm, dt, play);
      g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      draw(g, table, gm, now);
      if (now - hudAt > 100) {
        hudAt = now;
        setHud({ score: gm.score, balls: gm.balls, rank: gm.rank, msg: messageVisible(gm) ? gm.message : '', mult: gm.multiplier });
        if (gm.over && !recorded.current) {
          recorded.current = true;
          const best = readStore<number>('pinball.high', 0);
          if (gm.score > best) {
            writeStore('pinball.high', gm.score);
            setHigh(gm.score);
            window.setTimeout(() => messageBox('High Score', { icon: 'pinball', text: `New high score: ${gm.score.toLocaleString()}!\nRank: ${RANKS[gm.rank]}`, sound: 'none' }), 800);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // pause when the window loses focus, like the real one
  useEffect(() => {
    if (!active) setPaused(true);
  }, [active]);

  useEffect(() => {
    const flip = (i: 0 | 1, held: boolean) => {
      const f = game.current.flippers[i];
      if (f.held !== held && held && !game.current.tilted) play('flipper');
      f.held = held;
    };
    const down = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (e.code === 'F2') {
        e.preventDefault();
        restart();
        return;
      }
      if (e.code === 'F3') {
        setPaused(p => !p);
        return;
      }
      if (paused) setPaused(false);
      if (e.repeat) return;
      if (e.code === 'KeyZ' || e.code === 'ShiftLeft' || e.code === 'ArrowLeft') flip(0, true);
      else if (e.code === 'Slash' || e.code === 'KeyM' || e.code === 'ShiftRight' || e.code === 'ArrowRight') flip(1, true);
      else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown') {
        e.preventDefault();
        game.current.plungerHeld = true;
      } else if (e.code === 'KeyX' || e.code === 'ArrowUp' || e.code === 'Period') nudge(game.current, play);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'KeyZ' || e.code === 'ShiftLeft' || e.code === 'ArrowLeft') flip(0, false);
      else if (e.code === 'Slash' || e.code === 'KeyM' || e.code === 'ShiftRight' || e.code === 'ArrowRight') flip(1, false);
      else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowDown') {
        game.current.plungerHeld = false;
        release(game.current, play);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [paused]);

  // mouse / touch: halves of the table are the flippers, the lane is the plunger
  const pointers = useRef(new Map<number, 'l' | 'r' | 'p'>());
  const pointerZone = (e: React.PointerEvent): 'l' | 'r' | 'p' => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * TW;
    const y = ((e.clientY - rect.top) / rect.height) * TH;
    if (x > LANE_X && y > 300) return 'p';
    return x < TW * 0.47 ? 'l' : 'r';
  };
  const press = (zone: 'l' | 'r' | 'p', on: boolean) => {
    if (zone === 'p') {
      game.current.plungerHeld = on;
      if (!on) release(game.current, play);
    } else {
      const f = game.current.flippers[zone === 'l' ? 0 : 1];
      if (on && !f.held && !game.current.tilted) play('flipper');
      f.held = on;
    }
  };

  const menu = [
    {
      label: 'Game',
      items: [
        { label: 'New Game        F2', onClick: restart },
        { label: paused ? 'Resume Game     F3' : 'Pause Game      F3', onClick: () => setPaused(p => !p) },
        { label: '', divider: true },
        { label: 'High Scores...', onClick: () => messageBox('High Scores', { icon: 'pinball', text: `1. ${readStore<number>('pinball.high', 0).toLocaleString()}`, sound: 'none' }) },
        { label: '', divider: true },
        { label: 'Exit', onClick: () => closeWindow(win.id) },
      ],
    },
    {
      label: 'Help',
      items: [
        {
          label: 'Player Controls...',
          onClick: () =>
            messageBox('Player Controls', {
              icon: 'info',
              text: 'Left flipper: Z or Left Shift\nRight flipper: / or Right Shift\nPlunger: hold Space, let go\nBump table: X\nNew game: F2   Pause: F3\n\nMouse: press the left or right half of the table.',
              sound: 'none',
            }),
        },
      ],
    },
  ];

  return (
    <div className="pinball">
      <MenuBar menus={menu} />
      <div className="pinball-body">
        <canvas
          ref={canvas}
          width={Math.round(TW * SCALE)}
          height={Math.round(TH * SCALE)}
          className="pinball-table"
          data-cursor="arrow"
          onPointerDown={e => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            if (paused) setPaused(false);
            const z = pointerZone(e);
            pointers.current.set(e.pointerId, z);
            press(z, true);
          }}
          onPointerUp={e => {
            const z = pointers.current.get(e.pointerId);
            pointers.current.delete(e.pointerId);
            if (z) press(z, false);
          }}
          onContextMenu={e => e.preventDefault()}
        />
        <div className="pinball-panel">
          <div className="pb-logo">
            <div className="pb-3d">3D PINBALL</div>
            <div className="pb-cadet">Space Cadet</div>
          </div>
          <div className="pb-lcd">
            <div className="pb-row">
              <span>BALL</span>
              <b>{Math.min(3, 4 - hud.balls)}</b>
            </div>
            <div className="pb-score">{hud.score.toLocaleString()}</div>
            <div className="pb-row">
              <span>PLAYER 1</span>
              <span>×{hud.mult}</span>
            </div>
          </div>
          <div className="pb-msg">{paused ? 'Paused. Press F3 or click the table.' : hud.msg || `Rank: ${RANKS[hud.rank]}`}</div>
          <div className="pb-rank">
            <span>RANK</span>
            <b>{RANKS[hud.rank]}</b>
          </div>
          <div className="pb-high">HIGH SCORE {Math.max(high, 0).toLocaleString()}</div>
          <div className="pb-buttons">
            <button type="button" onClick={restart}>
              New Game
            </button>
            <button
              type="button"
              onPointerDown={() => press('p', true)}
              onPointerUp={() => press('p', false)}
              onPointerLeave={() => game.current.plungerHeld && press('p', false)}
            >
              Launch
            </button>
          </div>
          <div className="pb-help">Z / ⇧ left · / ⇧ right · Space launch · X bump</div>
        </div>
      </div>
    </div>
  );
}
