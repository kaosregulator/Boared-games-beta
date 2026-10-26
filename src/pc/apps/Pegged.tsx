import React, { useState } from 'react';
import { sfx, tone } from '../os/sound';
import { MenuBar } from '../os/Window';
import { closeWindow, messageBox, type WinState } from '../os/wm';

/**
 * Pegged, remade after the Windows Entertainment Pack version: peg
 * solitaire on the 33-hole cross board. Jump a peg over a neighbour into an
 * empty hole to take the neighbour away. Leave one peg to win, and leave it
 * in the middle to be a genius. The Game menu has the old starting shapes.
 */

const N = 7;
const onBoard = (r: number, c: number) => r >= 0 && c >= 0 && r < N && c < N && ((r >= 2 && r <= 4) || (c >= 2 && c <= 4));

type Shape = 'Solitaire' | 'Cross' | 'Plus' | 'Fireplace' | 'Up Arrow' | 'Pyramid' | 'Diamond';

const SHAPES: Record<Shape, (r: number, c: number) => boolean> = {
  Solitaire: (r, c) => !(r === 3 && c === 3),
  Cross: (r, c) => (c === 3 && r >= 1 && r <= 4) || (r === 2 && c >= 2 && c <= 4),
  Plus: (r, c) => (c === 3 && r >= 1 && r <= 5) || (r === 3 && c >= 1 && c <= 5),
  Fireplace: (r, c) => r <= 3 && c >= 2 && c <= 4 && !(r === 3 && c === 3),
  'Up Arrow': (r, c) => (r === 0 && c === 3) || (r === 1 && c >= 2 && c <= 4) || (r === 2 && c >= 1 && c <= 5) || ((r === 3 || r === 4) && c === 3) || (r >= 5 && c >= 2 && c <= 4),
  Pyramid: (r, c) => r >= 1 && r <= 4 && Math.abs(c - 3) <= r - 1,
  Diamond: (r, c) => Math.abs(r - 3) + Math.abs(c - 3) <= 3 && !(r === 3 && c === 3),
};

export function setup(shape: Shape) {
  return Array.from({ length: N * N }, (_, i) => {
    const r = Math.floor(i / N);
    const c = i % N;
    return onBoard(r, c) && SHAPES[shape](r, c);
  });
}

const DIRS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

export function jumpsFrom(pegs: boolean[], i: number) {
  const r = Math.floor(i / N);
  const c = i % N;
  return DIRS.flatMap(([dr, dc]) => {
    const mr = r + dr;
    const mc = c + dc;
    const tr = r + 2 * dr;
    const tc = c + 2 * dc;
    return onBoard(tr, tc) && pegs[mr * N + mc] && !pegs[tr * N + tc] ? [{ over: mr * N + mc, to: tr * N + tc }] : [];
  });
}

export function Pegged({ win }: { win: WinState }) {
  const [shape, setShape] = useState<Shape>('Solitaire');
  const [pegs, setPegs] = useState(() => setup('Solitaire'));
  const [sel, setSel] = useState<number | null>(null);
  const [undo, setUndo] = useState<boolean[][]>([]);

  const count = pegs.filter(Boolean).length;
  const stuck = pegs.every((p, i) => !p || jumpsFrom(pegs, i).length === 0);

  const start = (s: Shape) => {
    setShape(s);
    setPegs(setup(s));
    setSel(null);
    setUndo([]);
  };

  const click = (i: number) => {
    if (pegs[i]) {
      setSel(sel === i ? null : i);
      tone(700, 0, 0.03, { type: 'square', gain: 0.03 });
      return;
    }
    if (sel === null) return;
    const jump = jumpsFrom(pegs, sel).find(j => j.to === i);
    if (!jump) {
      sfx.ding();
      return;
    }
    const next = [...pegs];
    next[sel] = false;
    next[jump.over] = false;
    next[i] = true;
    setUndo(u => [...u, pegs]);
    setPegs(next);
    setSel(null);
    tone(330, 0, 0.05, { type: 'triangle', gain: 0.15 });
    const left = next.filter(Boolean).length;
    const nowStuck = next.every((p, j) => !p || jumpsFrom(next, j).length === 0);
    if (left === 1) {
      window.setTimeout(() => {
        sfx.tada();
        messageBox('Pegged', { icon: 'pegged', text: next[3 * N + 3] ? 'One peg, right in the middle. You are a genius!' : 'One peg left. You win!', sound: 'none' });
      }, 200);
    } else if (nowStuck) {
      window.setTimeout(() => messageBox('Pegged', { icon: 'pegged', text: `No more jumps. ${left} pegs left.${left <= 3 ? ' Not bad!' : ''}`, sound: 'chord' }), 200);
    }
  };

  const menus = [
    {
      label: 'Game',
      items: [
        { label: 'Start over', onClick: () => start(shape) },
        { label: 'Undo', disabled: !undo.length, onClick: () => (setPegs(undo[undo.length - 1]), setUndo(u => u.slice(0, -1)), setSel(null)) },
        { label: '', divider: true },
        ...(Object.keys(SHAPES) as Shape[]).map(s => ({ label: s, checked: shape === s, onClick: () => start(s) })),
        { label: '', divider: true },
        { label: 'Exit', onClick: () => closeWindow(win.id) },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'How to play', onClick: () => messageBox('Pegged', { icon: 'pegged', text: 'Click a peg, then click the empty hole two spaces away to jump it. The peg you jump over is taken away.\nJumps go up, down, left and right, never diagonally. Try to leave just one peg.', sound: 'none' }) },
        { label: 'About Pegged', onClick: () => messageBox('About Pegged', { icon: 'pegged', text: 'Pegged, from the Microsoft Entertainment Pack.\nRemade for this computer.', sound: 'none' }) },
      ],
    },
  ];

  return (
    <div className="pegged" data-cursor="arrow">
      <MenuBar menus={menus} />
      <div className="pg-board">
        {pegs.map((p, i) => {
          const r = Math.floor(i / N);
          const c = i % N;
          if (!onBoard(r, c)) return <span key={i} />;
          const target = sel !== null && jumpsFrom(pegs, sel).some(j => j.to === i);
          return (
            <button key={i} type="button" className={`pg-hole${p ? ' peg' : ''}${sel === i ? ' on' : ''}${target ? ' target' : ''}`} onClick={() => click(i)} aria-label={p ? 'peg' : 'hole'}>
              <i />
            </button>
          );
        })}
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{shape}</p>
        <p className="status-bar-field">Pegs left: {count}{stuck && count > 1 ? ' (stuck)' : ''}</p>
      </div>
    </div>
  );
}
