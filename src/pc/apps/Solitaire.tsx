import React, { useEffect, useRef, useState } from 'react';
import { readStore, writeStore } from '../os/settings';
import { sfx } from '../os/sound';
import { MenuBar } from '../os/Window';
import { closeWindow, messageBox, type WinState } from '../os/wm';
import { reportEvent, reportScore } from '../../net/roomApi';

/**
 * Klondike Solitaire: drag cards between piles, double-click to send one
 * home, click the deck to deal. Win and the cards bounce off the screen,
 * leaving trails, like they always did.
 */

interface Card {
  suit: 0 | 1 | 2 | 3; // ♠ ♥ ♦ ♣
  rank: number; // 1..13
  up: boolean;
}

interface Table {
  stock: Card[];
  waste: Card[];
  found: Card[][];
  piles: Card[][];
}

type From = { pile: 'waste' } | { pile: 'found'; i: number } | { pile: 'tab'; i: number; at: number };

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const red = (c: Card) => c.suit === 1 || c.suit === 2;
const CW = 64;
const CH = 88;
const GAP = 14;
const FAN_DOWN = 5;
const FAN_UP = 17;

function deal(): Table {
  const deck: Card[] = [];
  for (let s = 0; s < 4; s += 1) for (let r = 1; r <= 13; r += 1) deck.push({ suit: s as Card['suit'], rank: r, up: false });
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const piles: Card[][] = [];
  for (let p = 0; p < 7; p += 1) {
    piles.push(deck.splice(0, p + 1));
    piles[p][p].up = true;
  }
  return { stock: deck, waste: [], found: [[], [], [], []], piles };
}

const clone = (t: Table): Table => ({ stock: [...t.stock], waste: [...t.waste], found: t.found.map(f => [...f]), piles: t.piles.map(p => [...p]) });

function canFound(card: Card, f: Card[]) {
  const top = f[f.length - 1];
  return top ? top.suit === card.suit && card.rank === top.rank + 1 : card.rank === 1;
}
function canPile(card: Card, p: Card[]) {
  const top = p[p.length - 1];
  return top ? top.up && red(top) !== red(card) && card.rank === top.rank - 1 : card.rank === 13;
}

function CardView({ card, style, onPointerDown, onDoubleClick }: { card: Card; style?: React.CSSProperties; onPointerDown?: (e: React.PointerEvent) => void; onDoubleClick?: () => void }) {
  if (!card.up) return <div className="card back" style={style} onPointerDown={onPointerDown} />;
  const face = card.rank > 10;
  return (
    <div className={`card${red(card) ? ' red' : ''}`} style={style} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
      <span className="card-corner">
        {RANKS[card.rank]}
        <br />
        {SUITS[card.suit]}
      </span>
      <span className={`card-pip${face ? ' face' : ''}`}>{face ? `${RANKS[card.rank]}${SUITS[card.suit]}` : SUITS[card.suit]}</span>
      <span className="card-corner bottom">
        {RANKS[card.rank]}
        <br />
        {SUITS[card.suit]}
      </span>
    </div>
  );
}

const pileX = (i: number) => 10 + i * (CW + GAP);
const TAB_Y = CH + 26;

export function Solitaire({ win }: { win: WinState }) {
  const [table, setTable] = useState<Table>(deal);
  const [drag, setDrag] = useState<{ from: From; cards: Card[]; x: number; y: number; dx: number; dy: number } | null>(null);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);
  const area = useRef<HTMLDivElement>(null);
  const cascade = useRef<HTMLCanvasElement>(null);

  const newGame = () => {
    setTable(deal());
    setWon(false);
    setScore(0);
  };

  // the bouncing win cascade
  useEffect(() => {
    if (!won) return;
    sfx.tada();
    reportEvent('pc-solitaire', 'won');
    reportScore('pc-solitaire', 'score', Math.max(0, Math.round(score)));
    const c = cascade.current!;
    const g = c.getContext('2d')!;
    const W = c.width;
    const H = c.height;
    const cards: { x: number; y: number; vx: number; vy: number; card: Card }[] = [];
    let n = 0;
    let raf = 0;
    const drawCard = (x: number, y: number, card: Card) => {
      g.fillStyle = '#fff';
      g.strokeStyle = '#000';
      g.fillRect(x, y, CW, CH);
      g.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
      g.fillStyle = red(card) ? '#d00' : '#000';
      g.font = 'bold 13px Arial';
      g.fillText(RANKS[card.rank], x + 4, y + 15);
      g.fillText(SUITS[card.suit], x + 4, y + 29);
      g.font = '32px Arial';
      g.fillText(SUITS[card.suit], x + CW / 2 - 12, y + CH / 2 + 12);
    };
    const loop = () => {
      if (n < 52 && cards.length < 3) {
        const f = n % 4;
        const rank = 13 - Math.floor(n / 4);
        cards.push({ x: 10 + (3 + f) * (CW + GAP), y: 10, vx: (Math.random() * 5 + 2) * (Math.random() < 0.5 ? -1 : 1), vy: -Math.random() * 6, card: { suit: f as Card['suit'], rank, up: true } });
        n += 1;
      }
      for (let i = cards.length - 1; i >= 0; i -= 1) {
        const p = cards[i];
        p.vy += 0.6;
        p.x += p.vx;
        p.y += p.vy;
        if (p.y + CH > H) {
          p.y = H - CH;
          p.vy *= -0.75;
        }
        drawCard(p.x, p.y, p.card);
        if (p.x < -CW || p.x > W) cards.splice(i, 1);
      }
      if (n < 52 || cards.length) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const best = readStore<number>('sol.best', 0);
    if (score > best) writeStore('sol.best', score);
    return () => cancelAnimationFrame(raf);
  }, [won, score]);

  const commit = (next: Table, points = 0) => {
    // flip any exposed face-down card
    next.piles.forEach(p => {
      const top = p[p.length - 1];
      if (top && !top.up) {
        p[p.length - 1] = { ...top, up: true };
        points += 5;
      }
    });
    setTable(next);
    setScore(s => s + points);
    if (next.found.every(f => f.length === 13)) setWon(true);
  };

  const take = (t: Table, from: From): Card[] => {
    if (from.pile === 'waste') return t.waste.splice(-1);
    if (from.pile === 'found') return t.found[from.i].splice(-1);
    return t.piles[from.i].splice(from.at);
  };

  const autoFound = (from: From) => {
    const next = clone(table);
    const cards = from.pile === 'waste' ? next.waste.slice(-1) : from.pile === 'tab' ? next.piles[from.i].slice(-1) : [];
    const card = cards[0];
    if (!card) return;
    const f = next.found.findIndex(fd => canFound(card, fd));
    if (f < 0) return;
    take(next, from.pile === 'tab' ? { ...from, at: next.piles[from.i].length - 1 } : from);
    next.found[f].push(card);
    sfx.click();
    commit(next, 10);
  };

  const drawStock = () => {
    const next = clone(table);
    if (!next.stock.length) {
      next.stock = next.waste.reverse().map(c => ({ ...c, up: false }));
      next.waste = [];
      commit(next, -20);
      return;
    }
    const c = next.stock.pop()!;
    next.waste.push({ ...c, up: true });
    sfx.click();
    commit(next);
  };

  const startDrag = (e: React.PointerEvent, from: From, cards: Card[]) => {
    if (!cards.length || !cards[0].up) return;
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const host = area.current!.getBoundingClientRect();
    area.current!.setPointerCapture(e.pointerId);
    setDrag({ from, cards, x: rect.left - host.left, y: rect.top - host.top, dx: e.clientX - rect.left, dy: e.clientY - rect.top });
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const host = area.current!.getBoundingClientRect();
    setDrag({ ...drag, x: e.clientX - host.left - drag.dx, y: e.clientY - host.top - drag.dy });
  };

  const onUp = () => {
    if (!drag) return;
    const cx = drag.x + CW / 2;
    const cy = drag.y + 20;
    const card = drag.cards[0];
    const next = clone(table);
    let moved = false;
    let points = 0;
    // foundations
    if (cy < CH + 16 && drag.cards.length === 1) {
      for (let f = 0; f < 4; f += 1) {
        const x = pileX(3 + f);
        if (cx > x - 10 && cx < x + CW + 10 && canFound(card, next.found[f])) {
          take(next, drag.from);
          next.found[f].push(card);
          moved = true;
          points = 10;
          break;
        }
      }
    }
    if (!moved) {
      for (let p = 0; p < 7; p += 1) {
        const x = pileX(p);
        if (cx > x - 10 && cx < x + CW + 10 && cy > TAB_Y - 30 && canPile(card, next.piles[p]) && !(drag.from.pile === 'tab' && drag.from.i === p)) {
          take(next, drag.from);
          next.piles[p].push(...drag.cards);
          moved = true;
          points = drag.from.pile === 'waste' ? 5 : drag.from.pile === 'found' ? -15 : 0;
          break;
        }
      }
    }
    setDrag(null);
    if (moved) {
      sfx.click();
      commit(next, points);
    }
  };

  const hidden = (from: From, idx?: number) => {
    if (!drag) return false;
    if (drag.from.pile !== from.pile) return false;
    if (from.pile === 'tab' && drag.from.pile === 'tab') return from.i === drag.from.i && (idx ?? 0) >= drag.from.at;
    if (from.pile === 'found' && drag.from.pile === 'found') return from.i === drag.from.i;
    return from.pile === 'waste';
  };

  const menus = [
    {
      label: 'Game',
      items: [
        { label: 'Deal', onClick: newGame },
        { label: '', divider: true },
        { label: 'Exit', onClick: () => closeWindow(win.id) },
      ],
    },
    { label: 'Help', items: [{ label: 'About Solitaire', onClick: () => messageBox('About Solitaire', { icon: 'solitaire', text: 'Klondike. Drag cards, double-click to send one home.\nBest score: ' + readStore<number>('sol.best', 0), sound: 'none' }) }] },
  ];

  const topWaste = table.waste[table.waste.length - 1];
  return (
    <div className="solitaire">
      <MenuBar menus={menus} />
      <div className="sol-felt" ref={area} onPointerMove={onMove} onPointerUp={onUp}>
        {/* stock */}
        <div className="slot" style={{ left: pileX(0), top: 10 }} onClick={drawStock}>
          {table.stock.length > 0 && <CardView card={{ suit: 0, rank: 1, up: false }} />}
          {!table.stock.length && <span className="slot-o">○</span>}
        </div>
        {/* waste */}
        <div className="slot empty" style={{ left: pileX(1), top: 10 }}>
          {table.waste.length > 1 && hidden({ pile: 'waste' }) && <CardView card={table.waste[table.waste.length - 2]} />}
          {topWaste && !hidden({ pile: 'waste' }) && (
            <CardView card={topWaste} onPointerDown={e => startDrag(e, { pile: 'waste' }, [topWaste])} onDoubleClick={() => autoFound({ pile: 'waste' })} />
          )}
        </div>
        {/* foundations */}
        {table.found.map((f, i) => {
          const top = f[f.length - 1];
          const under = f[f.length - 2];
          return (
            <div key={i} className="slot" style={{ left: pileX(3 + i), top: 10 }}>
              {hidden({ pile: 'found', i }) ? under && <CardView card={under} /> : top && <CardView card={top} onPointerDown={e => startDrag(e, { pile: 'found', i }, [top])} />}
            </div>
          );
        })}
        {/* tableau */}
        {table.piles.map((p, i) => {
          let y = 0;
          return (
            <div key={i} className="slot" style={{ left: pileX(i), top: TAB_Y }}>
              {p.map((c, j) => {
                const top = y;
                y += c.up ? FAN_UP : FAN_DOWN;
                if (hidden({ pile: 'tab', i, at: 0 }, j)) return null;
                return (
                  <CardView
                    key={`${c.suit}-${c.rank}`}
                    card={c}
                    style={{ position: 'absolute', top, left: 0 }}
                    onPointerDown={e => startDrag(e, { pile: 'tab', i, at: j }, p.slice(j))}
                    onDoubleClick={() => j === p.length - 1 && autoFound({ pile: 'tab', i, at: j })}
                  />
                );
              })}
            </div>
          );
        })}
        {drag && (
          <div className="drag-stack" style={{ left: drag.x, top: drag.y }}>
            {drag.cards.map((c, k) => (
              <CardView key={k} card={c} style={{ position: 'absolute', top: k * FAN_UP, left: 0 }} />
            ))}
          </div>
        )}
        <canvas ref={cascade} className="sol-cascade" width={580} height={400} style={{ display: won ? 'block' : 'none' }} onClick={newGame} />
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{won ? 'You win! Click to deal again.' : 'Drag cards. Double-click sends a card home.'}</p>
        <p className="status-bar-field" style={{ flex: '0 0 90px' }}>
          Score: {score}
        </p>
      </div>
    </div>
  );
}
