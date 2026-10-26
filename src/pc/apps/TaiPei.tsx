import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { sfx, tone } from '../os/sound';
import { MenuBar } from '../os/Window';
import { closeWindow, messageBox, type WinState } from '../os/wm';

/**
 * TaiPei, remade after the Windows Entertainment Pack version: mahjong
 * solitaire on the classic 144-tile Turtle. Click two matching free tiles to
 * take them away. A tile is free when nothing sits on it and its left or
 * right side is open. Any flower matches any flower, any season any season.
 *
 * Deals are always solvable: the board is filled by playing the game
 * backwards, giving matching faces to pairs of tiles that are free at the
 * same moment.
 */

interface Slot {
  /** Position in half-tile units, and layer. */
  x: number;
  y: number;
  z: number;
}

function turtle(): Slot[] {
  const out: Slot[] = [];
  const row = (y: number, from: number, to: number, z = 0) => {
    for (let x = from; x <= to; x += 1) out.push({ x: x * 2, y: y * 2, z });
  };
  [
    [0, 1, 12],
    [1, 3, 10],
    [2, 2, 11],
    [3, 1, 12],
    [4, 1, 12],
    [5, 2, 11],
    [6, 3, 10],
    [7, 1, 12],
  ].forEach(([y, a, b]) => row(y, a, b));
  out.push({ x: 0, y: 7, z: 0 }, { x: 26, y: 7, z: 0 }, { x: 28, y: 7, z: 0 });
  for (let y = 1; y <= 6; y += 1) row(y, 4, 9, 1);
  for (let y = 2; y <= 5; y += 1) row(y, 5, 8, 2);
  for (let y = 3; y <= 4; y += 1) row(y, 6, 7, 3);
  out.push({ x: 13, y: 7, z: 4 });
  return out;
}

export const SLOTS = turtle();

const overlaps = (a: Slot, b: Slot) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;

/** Precomputed neighbours: what lies on top, and what touches the left and right. */
const ABOVE = SLOTS.map(a => SLOTS.map((b, j) => (b.z === a.z + 1 && overlaps(a, b) ? j : -1)).filter(j => j >= 0));
const LEFT = SLOTS.map(a => SLOTS.map((b, j) => (b.z === a.z && b.x === a.x - 2 && Math.abs(b.y - a.y) < 2 ? j : -1)).filter(j => j >= 0));
const RIGHT = SLOTS.map(a => SLOTS.map((b, j) => (b.z === a.z && b.x === a.x + 2 && Math.abs(b.y - a.y) < 2 ? j : -1)).filter(j => j >= 0));

export function isFree(i: number, present: boolean[]) {
  if (ABOVE[i].some(j => present[j])) return false;
  return !LEFT[i].some(j => present[j]) || !RIGHT[i].some(j => present[j]);
}

/** Faces 0..41: dots 0-8, bamboo 9-17, characters 18-26, winds 27-30, dragons 31-33, flowers 34-37, seasons 38-41. */
const group = (f: number) => (f >= 38 ? 38 : f >= 34 ? 34 : f);
export const matches = (a: number, b: number) => group(a) === group(b);

export function deal(): number[] {
  // The 72 pairs: four of each ordinary face is two pairs; flowers and seasons each make two pairs.
  const pairs: [number, number][] = [];
  for (let f = 0; f < 34; f += 1) pairs.push([f, f], [f, f]);
  pairs.push([34, 35], [36, 37], [38, 39], [40, 41]);
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const order = [...pairs].sort(() => Math.random() - 0.5);
    const present = SLOTS.map(() => true);
    const faces: number[] = SLOTS.map(() => -1);
    let ok = true;
    for (const [a, b] of order) {
      const free = SLOTS.map((_, i) => i).filter(i => present[i] && isFree(i, present));
      if (free.length < 2) {
        ok = false;
        break;
      }
      const i = free.splice(Math.floor(Math.random() * free.length), 1)[0];
      const j = free[Math.floor(Math.random() * free.length)];
      faces[i] = a;
      faces[j] = b;
      present[i] = false;
      present[j] = false;
    }
    if (ok) return faces;
  }
  return SLOTS.map((_, i) => Math.floor(i / 4) % 34);
}

const NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const WINDS = ['東', '南', '西', '北'];
const FLOWERS = ['梅', '蘭', '菊', '竹'];
const SEASONS = ['春', '夏', '秋', '冬'];

function Face({ f }: { f: number }) {
  if (f < 9) {
    const n = f + 1;
    return (
      <span className="tp-dots" data-n={n}>
        {Array.from({ length: n }, (_, i) => (
          <i key={i} />
        ))}
      </span>
    );
  }
  if (f < 18) {
    const n = f - 8;
    return (
      <span className="tp-bam">
        {n === 1 ? (
          <span className="tp-bird">🐦</span>
        ) : (
          Array.from({ length: n }, (_, i) => <i key={i} />)
        )}
      </span>
    );
  }
  if (f < 27)
    return (
      <span className="tp-char">
        <b>{NUM[f - 18]}</b>
        <span>萬</span>
      </span>
    );
  if (f < 31) return <span className="tp-big tp-wind">{WINDS[f - 27]}</span>;
  if (f === 31) return <span className="tp-big" style={{ color: '#c00000' }}>中</span>;
  if (f === 32) return <span className="tp-big" style={{ color: '#007000' }}>發</span>;
  if (f === 33) return <span className="tp-white" />;
  if (f < 38) return <span className="tp-big tp-flower">{FLOWERS[f - 34]}</span>;
  return <span className="tp-big tp-season">{SEASONS[f - 38]}</span>;
}

const TW = 36;
const TH = 46;
const DEPTH = 4;

export function TaiPei({ win }: { win: WinState }) {
  const [faces, setFaces] = useState(deal);
  const [present, setPresent] = useState(() => SLOTS.map(() => true));
  const [sel, setSel] = useState<number | null>(null);
  const [history, setHistory] = useState<[number, number][]>([]);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [peek, setPeek] = useState(false);

  const left = present.filter(Boolean).length;
  const free = useMemo(() => SLOTS.map((_, i) => present[i] && isFree(i, present)), [present]);
  const moves = useMemo(() => {
    const out: [number, number][] = [];
    const idx = free.map((f, i) => (f ? i : -1)).filter(i => i >= 0);
    for (let a = 0; a < idx.length; a += 1) for (let b = a + 1; b < idx.length; b += 1) if (matches(faces[idx[a]], faces[idx[b]])) out.push([idx[a], idx[b]]);
    return out;
  }, [free, faces]);

  const newGame = useCallback(() => {
    setFaces(deal());
    setPresent(SLOTS.map(() => true));
    setSel(null);
    setHistory([]);
    setHint(null);
  }, []);

  useEffect(() => {
    if (left === 0) {
      sfx.tada();
      messageBox('TaiPei', { icon: 'taipei', text: 'You cleared the Turtle. Very impressive.', sound: 'none' });
    } else if (moves.length === 0) {
      messageBox('TaiPei', { icon: 'taipei', text: 'No more moves. Undo, or start a new game.', sound: 'chord' });
    }
  }, [left, moves.length]);

  const click = (i: number) => {
    setHint(null);
    if (!free[i]) {
      sfx.ding();
      return;
    }
    if (sel === null || sel === i) {
      setSel(sel === i ? null : i);
      tone(880, 0, 0.04, { type: 'square', gain: 0.03 });
      return;
    }
    if (matches(faces[sel], faces[i])) {
      setPresent(p => p.map((v, j) => (j === sel || j === i ? false : v)));
      setHistory(h => [...h, [sel, i]]);
      tone(660, 0, 0.06, { type: 'square', gain: 0.04 });
      tone(990, 0.06, 0.08, { type: 'square', gain: 0.04 });
      setSel(null);
    } else {
      setSel(i);
    }
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setPresent(p => p.map((v, j) => (j === last[0] || j === last[1] ? true : v)));
    setHistory(h => h.slice(0, -1));
    setSel(null);
  };

  // Draw from the back: lower layers first, then right to left and top to bottom so edges overlap the right way.
  const order = useMemo(() => SLOTS.map((_, i) => i).sort((a, b) => SLOTS[a].z - SLOTS[b].z || SLOTS[b].x - SLOTS[a].x || SLOTS[a].y - SLOTS[b].y), []);

  const menus = [
    {
      label: 'Game',
      items: [
        { label: 'New game', onClick: newGame },
        { label: 'Undo', disabled: !history.length, onClick: undo },
        { label: 'Hint', onClick: () => (moves[0] ? setHint(moves[Math.floor(Math.random() * moves.length)]) : sfx.ding()) },
        { label: 'Peek under the tiles', checked: peek, onClick: () => setPeek(p => !p) },
        { label: '', divider: true },
        { label: 'Exit', onClick: () => closeWindow(win.id) },
      ],
    },
    {
      label: 'Help',
      items: [
        {
          label: 'How to play',
          onClick: () => messageBox('TaiPei', { icon: 'taipei', text: 'Take the tiles away in matching pairs.\nYou can only pick a tile that has nothing on top and is open on its left or its right.\nAny flower goes with any flower, and any season with any season.', sound: 'none' }),
        },
        { label: 'About TaiPei', onClick: () => messageBox('About TaiPei', { icon: 'taipei', text: 'TaiPei, from the Microsoft Entertainment Pack.\nRemade for this computer. Every deal can be won.', sound: 'none' }) },
      ],
    },
  ];

  return (
    <div className="taipei" data-cursor="arrow">
      <MenuBar menus={menus} />
      <div className="tp-board">
        <div className="tp-field" style={{ width: 15 * TW + 20, height: 8 * TH + 20 }}>
          {order.map(i => {
            if (!present[i]) return null;
            const s = SLOTS[i];
            const cls = ['tp-tile', sel === i && 'on', hint && hint.includes(i) && 'hint', peek && !free[i] && 'dim'].filter(Boolean).join(' ');
            return (
              <button
                key={i}
                type="button"
                className={cls}
                style={{ left: (s.x * TW) / 2 + s.z * DEPTH + 6, top: (s.y * TH) / 2 - s.z * DEPTH + 16, width: TW, height: TH, zIndex: s.z * 100 + 30 - s.x + s.y }}
                onClick={() => click(i)}
              >
                <Face f={faces[i]} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">Tiles left: {left}</p>
        <p className="status-bar-field">Moves available: {moves.length}</p>
      </div>
    </div>
  );
}
