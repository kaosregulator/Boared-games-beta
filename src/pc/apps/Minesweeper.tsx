import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { readStore, writeStore } from '../os/settings';
import { sfx } from '../os/sound';
import { MenuBar } from '../os/Window';
import { closeWindow, messageBox, updateWindow, type WinState } from '../os/wm';
import { reportEvent, reportScore } from '../../net/roomApi';

/**
 * Minesweeper: Beginner, Intermediate, Expert. First click is always safe,
 * right click flags (and question marks), clicking a satisfied number
 * clears around it. Best times are remembered.
 */

type Level = 'beginner' | 'intermediate' | 'expert';
const LEVELS: Record<Level, { cols: number; rows: number; mines: number; label: string }> = {
  beginner: { cols: 9, rows: 9, mines: 10, label: 'Beginner' },
  intermediate: { cols: 16, rows: 16, mines: 40, label: 'Intermediate' },
  expert: { cols: 30, rows: 16, mines: 99, label: 'Expert' },
};

interface Cell {
  mine: boolean;
  open: boolean;
  mark: 0 | 1 | 2; // none, flag, question
  n: number;
  boom?: boolean;
  wrong?: boolean;
}

type Status = 'ready' | 'playing' | 'won' | 'lost';

const CELL = 16;
const NUM_COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];

function sizeFor(level: Level) {
  const { cols, rows } = LEVELS[level];
  return { w: cols * CELL + 30, h: rows * CELL + 118 };
}

function emptyBoard(level: Level): Cell[] {
  const { cols, rows } = LEVELS[level];
  return Array.from({ length: cols * rows }, () => ({ mine: false, open: false, mark: 0, n: 0 }));
}

function neighbours(i: number, cols: number, rows: number) {
  const x = i % cols;
  const y = Math.floor(i / cols);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) out.push(ny * cols + nx);
    }
  return out;
}

function seed(board: Cell[], level: Level, safe: number) {
  const { cols, rows, mines } = LEVELS[level];
  const keepClear = new Set([safe, ...neighbours(safe, cols, rows)]);
  const spots = board.map((_, i) => i).filter(i => !keepClear.has(i));
  for (let k = 0; k < mines; k += 1) {
    const j = k + Math.floor(Math.random() * (spots.length - k));
    [spots[k], spots[j]] = [spots[j], spots[k]];
    board[spots[k]].mine = true;
  }
  board.forEach((c, i) => {
    c.n = neighbours(i, cols, rows).filter(n => board[n].mine).length;
  });
}

function Led({ value }: { value: number }) {
  const v = Math.max(-99, Math.min(999, value));
  const text = v < 0 ? `-${String(-v).padStart(2, '0')}` : String(v).padStart(3, '0');
  return (
    <div className="led">
      {text.split('').map((d, i) => (
        <SevenSeg key={i} ch={d} />
      ))}
    </div>
  );
}

const SEGS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g',
};

function SevenSeg({ ch }: { ch: string }) {
  const on = SEGS[ch] ?? '';
  const c = (s: string) => (on.includes(s) ? '#ff0000' : '#3a0000');
  return (
    <svg width="13" height="23" viewBox="0 0 13 23" shapeRendering="crispEdges">
      <path d="M2 1h9l-2 2H4z" fill={c('a')} />
      <path d="M12 2v8l-2-1V4z" fill={c('b')} />
      <path d="M12 13v8l-2-2v-5z" fill={c('c')} />
      <path d="M2 22h9l-2-2H4z" fill={c('d')} />
      <path d="M1 13v8l2-2v-5z" fill={c('e')} />
      <path d="M1 2v8l2-1V4z" fill={c('f')} />
      <path d="M3 11h7l1 .5-1 .5H3l-1-.5z" fill={c('g')} />
    </svg>
  );
}

function Face({ mood }: { mood: 'smile' | 'oh' | 'dead' | 'cool' }) {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" shapeRendering="crispEdges">
      <circle cx="8.5" cy="8.5" r="7.5" fill="#ff0" stroke="#000" shapeRendering="auto" />
      {mood === 'dead' ? (
        <path d="M4.5 5l3 3m0-3l-3 3M9.5 5l3 3m0-3l-3 3" stroke="#000" />
      ) : mood === 'cool' ? (
        <path d="M2 6h13v1l-2 2h-3l-1-2H8L7 9H4L2 7z" fill="#000" />
      ) : (
        <>
          <rect x="5" y="5" width="2" height="2" fill="#000" />
          <rect x="10" y="5" width="2" height="2" fill="#000" />
        </>
      )}
      {mood === 'oh' ? <circle cx="8.5" cy="11.5" r="2" fill="none" stroke="#000" shapeRendering="auto" /> : mood === 'dead' ? <path d="M5 13c2-2 5-2 7 0" stroke="#000" fill="none" /> : <path d="M5 10c2 3 5 3 7 0" stroke="#000" fill="none" />}
    </svg>
  );
}

function MineGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" shapeRendering="crispEdges">
      <path d="M6.5 0v13M0 6.5h13M2 2l9 9M11 2l-9 9" stroke="#000" />
      <circle cx="6.5" cy="6.5" r="4" fill="#000" shapeRendering="auto" />
      <rect x="4" y="4" width="2" height="2" fill="#fff" />
    </svg>
  );
}

function FlagGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" shapeRendering="crispEdges">
      <path d="M6 1L1 3.5 6 6z" fill="#f00" />
      <rect x="6" y="1" width="1" height="7" fill="#000" />
      <rect x="4" y="8" width="5" height="1" fill="#000" />
      <rect x="2" y="9" width="9" height="2" fill="#000" />
    </svg>
  );
}

export function Minesweeper({ win }: { win: WinState }) {
  const [level, setLevel] = useState<Level>(() => readStore<Level>('mine.level', 'beginner'));
  const [board, setBoard] = useState<Cell[]>(() => emptyBoard(level));
  const [status, setStatus] = useState<Status>('ready');
  const [time, setTime] = useState(0);
  const [pressing, setPressing] = useState(false);
  const [marks, setMarks] = useState(true);
  const { cols, rows, mines } = LEVELS[level];

  const reset = useCallback(
    (lv: Level = level) => {
      setLevel(lv);
      writeStore('mine.level', lv);
      setBoard(emptyBoard(lv));
      setStatus('ready');
      setTime(0);
      const s = sizeFor(lv);
      updateWindow(win.id, { w: s.w, h: s.h });
    },
    [level, win.id],
  );

  useEffect(() => {
    const s = sizeFor(level);
    updateWindow(win.id, { w: s.w, h: s.h });
    // only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== 'playing') return;
    const id = window.setInterval(() => {
      setTime(t => Math.min(999, t + 1));
      sfx.click();
    }, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const flagsLeft = useMemo(() => mines - board.filter(c => c.mark === 1).length, [board, mines]);

  const finish = (next: Cell[], won: boolean, at?: number) => {
    if (won) {
      next.forEach(c => {
        if (c.mine) c.mark = 1;
      });
      setStatus('won');
      sfx.tada();
      reportEvent('pc-minesweeper', 'won', level);
      if (level === 'expert') reportEvent('pc-minesweeper', 'won-expert', level);
      reportScore('pc-minesweeper', 'time', time, { mode: level });
      const best = readStore<Record<Level, number>>('mine.best', { beginner: 999, intermediate: 999, expert: 999 });
      if (time < best[level]) {
        best[level] = time;
        writeStore('mine.best', best);
        window.setTimeout(
          () => messageBox('Congratulations', { icon: 'info', text: `You have the fastest time for ${LEVELS[level].label.toLowerCase()} level: ${time} seconds!`, sound: 'none' }),
          400,
        );
      }
    } else {
      reportEvent('pc-minesweeper', 'lost', level);
      next.forEach((c, i) => {
        if (c.mine && c.mark !== 1) c.open = true;
        if (!c.mine && c.mark === 1) c.wrong = true;
        if (i === at) c.boom = true;
      });
      setStatus('lost');
      boom();
    }
  };

  const flood = (next: Cell[], start: number) => {
    const stack = [start];
    while (stack.length) {
      const i = stack.pop()!;
      const c = next[i];
      if (c.open || c.mark === 1) continue;
      c.open = true;
      c.mark = 0;
      if (c.n === 0 && !c.mine) stack.push(...neighbours(i, cols, rows));
    }
  };

  const checkWin = (next: Cell[]) => next.every(c => c.mine || c.open);

  const reveal = (i: number) => {
    if (status === 'won' || status === 'lost') return;
    const next = board.map(c => ({ ...c }));
    if (status === 'ready') {
      seed(next, level, i);
      setStatus('playing');
    }
    const c = next[i];
    if (c.mark === 1) return;
    if (c.open) {
      // chord: open the neighbours when the flags match the number
      const ns = neighbours(i, cols, rows);
      if (ns.filter(n => next[n].mark === 1).length !== c.n) return;
      for (const n of ns) {
        if (next[n].mark === 1 || next[n].open) continue;
        if (next[n].mine) {
          setBoard(next);
          finish(next, false, n);
          return;
        }
        flood(next, n);
      }
    } else if (c.mine) {
      finish(next, false, i);
      setBoard(next);
      return;
    } else flood(next, i);
    if (checkWin(next)) finish(next, true);
    setBoard(next);
  };

  const mark = (i: number) => {
    if (status === 'won' || status === 'lost') return;
    const c = board[i];
    if (c.open) return;
    const next = board.slice();
    const m = c.mark === 0 ? 1 : c.mark === 1 && marks ? 2 : 0;
    next[i] = { ...c, mark: m as 0 | 1 | 2 };
    setBoard(next);
  };

  const mood = status === 'lost' ? 'dead' : status === 'won' ? 'cool' : pressing ? 'oh' : 'smile';
  const menu = [
    {
      label: 'Game',
      items: [
        { label: 'New', onClick: () => reset() },
        { label: '', divider: true },
        ...(Object.keys(LEVELS) as Level[]).map(l => ({ label: LEVELS[l].label, checked: level === l, onClick: () => reset(l) })),
        { label: '', divider: true },
        { label: 'Marks (?)', checked: marks, onClick: () => setMarks(m => !m) },
        { label: '', divider: true },
        {
          label: 'Best Times...',
          onClick: () => {
            const b = readStore<Record<Level, number>>('mine.best', { beginner: 999, intermediate: 999, expert: 999 });
            messageBox('Fastest Mine Sweepers', { icon: 'info', text: `Beginner: ${b.beginner} seconds\nIntermediate: ${b.intermediate} seconds\nExpert: ${b.expert} seconds`, sound: 'none' });
          },
        },
        { label: 'Exit', onClick: () => closeWindow(win.id) },
      ],
    },
    { label: 'Help', items: [{ label: 'About Minesweeper...', onClick: () => messageBox('About Minesweeper', { icon: 'mine', text: 'Minesweeper\nRebuilt for the computer on the desk.\nLeft click digs, right click flags.', sound: 'none' }) }] },
  ];

  return (
    <div className="mines" onContextMenu={e => e.preventDefault()}>
      <MenuBar menus={menu} />
      <div className="mines-frame">
        <div className="mines-head sunken">
          <Led value={flagsLeft} />
          <button type="button" className="mines-face" onClick={() => reset()}>
            <Face mood={mood} />
          </button>
          <Led value={time} />
        </div>
        <div
          className="mines-grid sunken"
          style={{ gridTemplateColumns: `repeat(${cols}, ${CELL}px)` }}
          onPointerDown={e => e.button === 0 && status !== 'won' && status !== 'lost' && setPressing(true)}
          onPointerUp={() => setPressing(false)}
          onPointerLeave={() => setPressing(false)}
        >
          {board.map((c, i) => (
            <div
              key={i}
              className={`mcell${c.open ? ' open' : ''}${c.boom ? ' boom' : ''}`}
              onClick={() => reveal(i)}
              onContextMenu={e => {
                e.preventDefault();
                mark(i);
              }}
              onAuxClick={e => e.button === 1 && reveal(i)}
            >
              {c.open ? (
                c.mine ? (
                  <MineGlyph />
                ) : c.n ? (
                  <b style={{ color: NUM_COLORS[c.n] }}>{c.n}</b>
                ) : null
              ) : c.wrong ? (
                <span className="wrong">
                  <MineGlyph />
                </span>
              ) : c.mark === 1 ? (
                <FlagGlyph />
              ) : c.mark === 2 ? (
                <b>?</b>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function boom() {
  sfx.chord();
}
