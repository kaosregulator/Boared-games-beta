import React, { useCallback, useEffect, useRef, useState } from 'react';
import { readStore, writeStore } from '../os/settings';
import { sfx, tone } from '../os/sound';
import { MenuBar } from '../os/Window';
import { closeWindow, messageBox, type WinState } from '../os/wm';

/**
 * Tetris, remade after the Windows Entertainment Pack version (1990): a
 * 10×20 well of bevelled 16-colour blocks, Next piece, score, lines and
 * level on the right. Arrows move, Up or X rotates, Space drops, P pauses,
 * F2 starts over. Music: Korobeiniki, on a square wave, off by default.
 */

const COLS = 10;
const ROWS = 20;
const CELL = 16;

// The seven pieces in the Win 3.x palette.
const PIECES: { color: string; cells: [number, number][] }[] = [
  { color: '#ff0000', cells: [[0, 1], [1, 1], [2, 1], [3, 1]] }, // I
  { color: '#0000ff', cells: [[0, 0], [0, 1], [1, 1], [2, 1]] }, // J
  { color: '#ff8000', cells: [[2, 0], [0, 1], [1, 1], [2, 1]] }, // L
  { color: '#ffff00', cells: [[1, 0], [2, 0], [1, 1], [2, 1]] }, // O
  { color: '#00ff00', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] }, // S
  { color: '#ff00ff', cells: [[1, 0], [0, 1], [1, 1], [2, 1]] }, // T
  { color: '#00ffff', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] }, // Z
];

interface Piece {
  kind: number;
  cells: [number, number][];
  x: number;
  y: number;
}

type Grid = (string | null)[];

const LINE_SCORE = [0, 40, 100, 300, 1200];

function spawn(kind: number): Piece {
  return { kind, cells: PIECES[kind].cells.map(c => [...c] as [number, number]), x: 3, y: 0 };
}

function rotate(p: Piece): Piece {
  if (p.kind === 3) return p;
  const size = p.kind === 0 ? 4 : 3;
  return { ...p, cells: p.cells.map(([x, y]) => [size - 1 - y, x] as [number, number]) };
}

function fits(grid: Grid, p: Piece) {
  return p.cells.every(([cx, cy]) => {
    const x = p.x + cx;
    const y = p.y + cy;
    return x >= 0 && x < COLS && y < ROWS && (y < 0 || !grid[y * COLS + x]);
  });
}

function drawBlock(g: CanvasRenderingContext2D, x: number, y: number, color: string) {
  g.fillStyle = color;
  g.fillRect(x, y, CELL, CELL);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.fillRect(x, y, CELL, 2);
  g.fillRect(x, y, 2, CELL);
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(x, y + CELL - 2, CELL, 2);
  g.fillRect(x + CELL - 2, y, 2, CELL);
}

// Korobeiniki, the A theme. [semitones from A4, beats]
const THEME: [number, number][] = [
  [7, 1], [2, 0.5], [3, 0.5], [5, 1], [3, 0.5], [2, 0.5], [0, 1], [0, 0.5], [3, 0.5], [7, 1], [5, 0.5], [3, 0.5],
  [2, 1.5], [3, 0.5], [5, 1], [7, 1], [3, 1], [0, 1], [0, 2],
  [5, 1.5], [8, 0.5], [12, 1], [10, 0.5], [8, 0.5], [7, 1.5], [3, 0.5], [7, 1], [5, 0.5], [3, 0.5],
  [2, 1], [2, 0.5], [3, 0.5], [5, 1], [7, 1], [3, 1], [0, 1], [0, 2],
];

function playTheme(beat: number) {
  let t = 0;
  for (const [n, len] of THEME) {
    tone(440 * 2 ** (n / 12), t, len * beat * 0.9, { type: 'square', gain: 0.025 });
    t += len * beat;
  }
  return t;
}

export function Tetris({ win }: { win: WinState }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const nextCanvas = useRef<HTMLCanvasElement>(null);
  const game = useRef({
    grid: Array<string | null>(COLS * ROWS).fill(null) as Grid,
    piece: spawn(Math.floor(Math.random() * 7)),
    next: Math.floor(Math.random() * 7),
    score: 0,
    lines: 0,
    level: 1,
    over: false,
    paused: false,
    acc: 0,
  });
  const [hud, setHud] = useState({ score: 0, lines: 0, level: 1, over: false, paused: false });
  const [startLevel, setStartLevel] = useState(() => readStore<number>('tetris.level', 1));
  const [music, setMusic] = useState(false);
  const [best, setBest] = useState(() => readStore<number>('tetris.best', 0));

  const sync = () => {
    const s = game.current;
    setHud({ score: s.score, lines: s.lines, level: s.level, over: s.over, paused: s.paused });
  };

  const draw = useCallback(() => {
    const g = canvas.current?.getContext('2d');
    const s = game.current;
    if (!g) return;
    g.fillStyle = '#000';
    g.fillRect(0, 0, COLS * CELL, ROWS * CELL);
    s.grid.forEach((c, i) => c && drawBlock(g, (i % COLS) * CELL, Math.floor(i / COLS) * CELL, c));
    if (!s.over) {
      // Where it will land, as a faint outline.
      let ghost = { ...s.piece };
      while (fits(s.grid, { ...ghost, y: ghost.y + 1 })) ghost = { ...ghost, y: ghost.y + 1 };
      g.strokeStyle = 'rgba(255,255,255,0.25)';
      ghost.cells.forEach(([cx, cy]) => g.strokeRect((ghost.x + cx) * CELL + 0.5, (ghost.y + cy) * CELL + 0.5, CELL - 1, CELL - 1));
      s.piece.cells.forEach(([cx, cy]) => s.piece.y + cy >= 0 && drawBlock(g, (s.piece.x + cx) * CELL, (s.piece.y + cy) * CELL, PIECES[s.piece.kind].color));
    }
    if (s.paused || s.over) {
      g.fillStyle = 'rgba(0,0,128,0.85)';
      g.fillRect(10, 130, COLS * CELL - 20, 50);
      g.fillStyle = '#fff';
      g.font = 'bold 13px "MS Sans Serif", Tahoma, sans-serif';
      g.textAlign = 'center';
      g.fillText(s.over ? 'GAME OVER' : 'PAUSED', (COLS * CELL) / 2, 152);
      g.font = '11px "MS Sans Serif", Tahoma, sans-serif';
      g.fillText(s.over ? 'F2 for a new game' : 'P to keep going', (COLS * CELL) / 2, 170);
    }
    const n = nextCanvas.current?.getContext('2d');
    if (n) {
      n.fillStyle = '#000';
      n.fillRect(0, 0, 4 * CELL, 3 * CELL);
      const p = PIECES[s.next];
      const off = s.next === 0 ? 0 : s.next === 3 ? -0.5 : 0.5;
      p.cells.forEach(([cx, cy]) => drawBlock(n, (cx + off) * CELL, (cy + 0.5) * CELL, p.color));
    }
  }, []);

  const newGame = useCallback(() => {
    game.current = {
      grid: Array(COLS * ROWS).fill(null),
      piece: spawn(Math.floor(Math.random() * 7)),
      next: Math.floor(Math.random() * 7),
      score: 0,
      lines: 0,
      level: startLevel,
      over: false,
      paused: false,
      acc: 0,
    };
    sync();
    draw();
  }, [startLevel, draw]);

  const lock = useCallback(() => {
    const s = game.current;
    s.piece.cells.forEach(([cx, cy]) => {
      const y = s.piece.y + cy;
      if (y >= 0) s.grid[y * COLS + s.piece.x + cx] = PIECES[s.piece.kind].color;
    });
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y -= 1) {
      if (s.grid.slice(y * COLS, y * COLS + COLS).every(Boolean)) {
        s.grid.splice(y * COLS, COLS);
        s.grid.unshift(...Array(COLS).fill(null));
        cleared += 1;
        y += 1;
      }
    }
    if (cleared) {
      s.lines += cleared;
      s.score += LINE_SCORE[cleared] * s.level;
      s.level = Math.max(s.level, startLevel + Math.floor(s.lines / 10));
      if (cleared === 4) sfx.tada();
      else [523, 659, 784].slice(0, cleared + 1).forEach((f, i) => tone(f, i * 0.06, 0.12, { type: 'square', gain: 0.05 }));
    } else tone(110, 0, 0.06, { type: 'triangle', gain: 0.12 });
    s.piece = spawn(s.next);
    s.next = Math.floor(Math.random() * 7);
    if (!fits(s.grid, s.piece)) {
      s.over = true;
      sfx.chord();
      if (s.score > best) {
        setBest(s.score);
        writeStore('tetris.best', s.score);
        window.setTimeout(() => messageBox('Tetris', { icon: 'tetris', text: `A new high score: ${s.score}!`, sound: 'tada' }), 400);
      }
    }
    sync();
  }, [best, startLevel]);

  const move = useCallback(
    (dx: number, dy: number) => {
      const s = game.current;
      const p = { ...s.piece, x: s.piece.x + dx, y: s.piece.y + dy };
      if (fits(s.grid, p)) {
        s.piece = p;
        return true;
      }
      if (dy) lock();
      return false;
    },
    [lock],
  );

  useEffect(() => root.current?.focus(), []);

  // Gravity.
  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const s = game.current;
      const dt = now - last;
      last = now;
      if (!s.over && !s.paused && !win.minimized) {
        s.acc += dt;
        const speed = Math.max(80, 800 - (s.level - 1) * 70);
        if (s.acc >= speed) {
          s.acc = 0;
          move(0, 1);
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [move, draw, win.minimized]);

  // Music loops while it's on and the game is running.
  useEffect(() => {
    if (!music) return;
    let id = 0;
    const loop = () => {
      const len = game.current.over || game.current.paused ? 1 : playTheme(0.22);
      id = window.setTimeout(loop, len * 1000);
    };
    loop();
    return () => window.clearTimeout(id);
  }, [music]);

  const onKey = (e: React.KeyboardEvent) => {
    const s = game.current;
    if (e.key === 'F2') {
      e.preventDefault();
      newGame();
      return;
    }
    if (e.key === 'p' || e.key === 'P' || e.key === 'F3') {
      if (!s.over) s.paused = !s.paused;
      sync();
      return;
    }
    if (s.over || s.paused) return;
    if (e.key === 'ArrowLeft') move(-1, 0);
    else if (e.key === 'ArrowRight') move(1, 0);
    else if (e.key === 'ArrowDown') {
      if (move(0, 1)) s.score += 1;
    } else if (e.key === 'ArrowUp' || e.key === 'x' || e.key === 'X') {
      const r = rotate(s.piece);
      // A small nudge off the walls, so pieces turn next to them.
      for (const dx of [0, -1, 1, -2, 2]) {
        if (fits(s.grid, { ...r, x: r.x + dx })) {
          s.piece = { ...r, x: r.x + dx };
          break;
        }
      }
    } else if (e.key === ' ') {
      let n = 0;
      while (move(0, 1)) n += 1;
      s.score += n * 2;
    } else return;
    e.preventDefault();
    sync();
  };

  const menus = [
    {
      label: 'Game',
      items: [
        { label: 'New    F2', onClick: newGame },
        { label: hud.paused ? 'Continue    P' : 'Pause    P', disabled: hud.over, onClick: () => ((game.current.paused = !game.current.paused), sync()) },
        { label: '', divider: true },
        ...[1, 3, 5, 7, 9].map(l => ({ label: `Start at level ${l}`, checked: startLevel === l, onClick: () => (setStartLevel(l), writeStore('tetris.level', l)) })),
        { label: '', divider: true },
        { label: 'Music', checked: music, onClick: () => setMusic(m => !m) },
        { label: '', divider: true },
        { label: 'Exit', onClick: () => closeWindow(win.id) },
      ],
    },
    {
      label: 'Help',
      items: [
        {
          label: 'How to play',
          onClick: () => messageBox('Tetris', { icon: 'tetris', text: 'Left and Right move. Up or X turns the piece. Down drops it faster, Space drops it all the way.\nFill a row to clear it. Four rows at once is a Tetris.\nP pauses. F2 starts over.', sound: 'none' }),
        },
        { label: 'About Tetris', onClick: () => messageBox('About Tetris', { icon: 'tetris', text: 'Tetris, from the Microsoft Entertainment Pack.\nRemade for this computer.', sound: 'none' }) },
      ],
    },
  ];

  return (
    <div className="tetris" tabIndex={0} onKeyDown={onKey} ref={root} data-cursor="arrow">
      <MenuBar menus={menus} />
      <div className="tetris-body">
        <canvas ref={canvas} width={COLS * CELL} height={ROWS * CELL} className="tetris-well" onPointerDown={() => game.current.over && newGame()} />
        <div className="tetris-side">
          <fieldset>
            <legend>Next</legend>
            <canvas ref={nextCanvas} width={4 * CELL} height={3 * CELL} />
          </fieldset>
          <div className="tetris-stat">
            Score<b>{hud.score}</b>
          </div>
          <div className="tetris-stat">
            Lines<b>{hud.lines}</b>
          </div>
          <div className="tetris-stat">
            Level<b>{hud.level}</b>
          </div>
          <div className="tetris-stat">
            Best<b>{best}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
