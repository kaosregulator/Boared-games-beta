import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { TriviaPlayer } from '../../types/trivia';
import { sound } from '../../utils/audio';
import { holdRoomForCue, releaseRoomCue } from '../../room/roomHold';
import { RERUN_CATEGORIES, RERUN_VALUES, type RerunClue } from './rerunBoard';

interface Props {
  players: TriviaPlayer[];
  onFinish: (roster: TriviaPlayer[]) => void;
}

interface Active {
  cat: number;
  row: number;
  double: boolean;
}

const CLUE_SECONDS = 15;

function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString()}`;

/**
 * Prime Time Rerun, the mini Jeopardy-style board. Laid on the table like
 * the cardboard home edition: pick a tile, the clue card pops up, everyone
 * at the table answers in the form of a question.
 */
export function RerunBoardGame({ players: startPlayers, onFinish }: Props) {
  const [players, setPlayers] = useState(() => startPlayers.map(p => ({ ...p, score: 0 })));
  const [used, setUsed] = useState<Set<string>>(() => new Set());
  const [active, setActive] = useState<Active | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(CLUE_SECONDS);
  const [botCalls, setBotCalls] = useState<Record<string, boolean>>({});
  const held = useRef(false);

  // One hidden double, never on the cheapest row.
  const doubleKey = useMemo(() => `${Math.floor(Math.random() * 5)}:${1 + Math.floor(Math.random() * 4)}`, []);
  // Each clue's responses, shuffled once per game, with the right one remembered.
  const decks = useMemo(
    () =>
      RERUN_CATEGORIES.map(cat =>
        cat.clues.map(clue => {
          const order = shuffled(clue.responses.map((text, i) => ({ text, right: i === 0 })));
          return { responses: order.map(o => o.text), correct: order.findIndex(o => o.right) };
        }),
      ),
    [],
  );

  useEffect(() => {
    sound.playChiptuneTrack('board_fill');
  }, []);

  const clue: RerunClue | null = active ? RERUN_CATEGORIES[active.cat].clues[active.row] : null;
  const deck = active ? decks[active.cat][active.row] : null;
  const value = clue ? clue.value * (active?.double ? 2 : 1) : 0;
  const revealed = picked !== null;

  const hush = () => {
    if (!held.current) {
      holdRoomForCue();
      held.current = true;
    }
  };
  const unhush = () => {
    sound.stopChiptune();
    if (held.current) {
      releaseRoomCue();
      held.current = false;
    }
  };
  useEffect(() => () => unhush(), []);

  const openTile = (cat: number, row: number) => {
    const key = `${cat}:${row}`;
    if (used.has(key) || active) return;
    const double = key === doubleKey;
    setActive({ cat, row, double });
    setPicked(null);
    setBotCalls({});
    setTimeLeft(CLUE_SECONDS);
    hush();
    const c = RERUN_CATEGORIES[cat].clues[row];
    if (double) {
      sound.playChiptuneTrack('daily_double');
    } else if (c.chiptuneId) {
      sound.playChiptuneTrack(c.chiptuneId);
    } else {
      sound.playChiptuneTrack('think_clock');
    }
  };

  // The clock only runs while the clue is open and unanswered.
  useEffect(() => {
    if (!active || revealed) return;
    const t = window.setInterval(() => setTimeLeft(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [active, revealed]);

  const answer = (idx: number) => {
    if (!active || !deck || revealed) return;
    setPicked(idx);
    sound.stopChiptune();
    const right = idx === deck.correct;
    if (right) sound.playTriviaCorrect();
    else sound.playTriviaWrong();

    const calls: Record<string, boolean> = {};
    setPlayers(prev =>
      prev.map(p => {
        if (!p.isBot) return { ...p, score: p.score + (right ? value : -value) };
        // Nobody else plays the hidden double: it belongs to whoever found it.
        if (active.double) return p;
        const botRight = Math.random() < (p.botAccuracy ?? 0.7);
        // Bots sometimes just keep their buzzer hand down.
        if (Math.random() < 0.25) return p;
        calls[p.id] = botRight;
        return { ...p, score: p.score + (botRight ? value : -value) };
      }),
    );
    setBotCalls(calls);
  };

  useEffect(() => {
    if (active && !revealed && timeLeft === 0) answer(-1);
  }, [timeLeft]);

  const backToBoard = () => {
    if (!active) return;
    const next = new Set(used);
    next.add(`${active.cat}:${active.row}`);
    setUsed(next);
    setActive(null);
    setPicked(null);
    unhush();
    if (next.size >= RERUN_CATEGORIES.length * RERUN_VALUES.length) {
      onFinish(players);
    }
  };

  // Give the room a moment to read the note, then lay the card back down.
  useEffect(() => {
    if (!revealed) return;
    const t = window.setTimeout(backToBoard, 5200);
    return () => window.clearTimeout(t);
  }, [revealed]);

  const scoreRow = (
    <div className="flex shrink-0 items-stretch justify-center gap-1.5">
      {players.map(p => (
        <div
          key={p.id}
          className={`flex min-w-0 flex-col items-center rounded-md px-2 py-0.5 ${
            p.isBot ? 'bg-[#0d1b4d]' : 'bg-[#f1e3bf] text-[#1a2d52]'
          } ${revealed && p.id in botCalls ? (botCalls[p.id] ? 'ring-2 ring-[#5fd3a2]' : 'ring-2 ring-[#e5484d]') : ''}`}
        >
          <span
            className={`text-[11px] font-black tabular-nums ${p.score < 0 ? 'text-[#e5484d]' : p.isBot ? 'text-[#f2c14e]' : ''}`}
          >
            {money(p.score)}
          </span>
          <span className="max-w-[7.5rem] truncate text-[9px] font-bold uppercase tracking-wider opacity-80">
            {p.avatar} {p.name}
          </span>
        </div>
      ))}
    </div>
  );

  if (active && clue && deck) {
    const right = picked === deck.correct;
    return (
      <div className="flex h-full min-h-0 w-full flex-col gap-2 p-2.5 select-none">
        <div className="tt-s flex shrink-0 items-center gap-2 font-black uppercase tracking-[0.18em] text-[#f1e3bf]">
          <span className="truncate">{RERUN_CATEGORIES[active.cat].title}</span>
          <span className="text-[#f2c14e]">{money(value)}</span>
          {active.double && <span className="tt-stamp text-[11px] text-[#f2c14e]">Daily Double</span>}
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-[#f2c14e] transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / CLUE_SECONDS) * 100}%` }}
            />
          </div>
          <span className="tabular-nums">{timeLeft}s</span>
        </div>

        <div className="tt-clue tt-pop relative flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="tt-clue-text">{clue.clue}</p>
          {revealed && <p className="tt-marker tt-n mt-2 normal-case text-[#f2c14e]">{clue.note}</p>}
          {revealed && (
            <span className={`tt-stamp tt-h absolute right-3 top-2 ${right ? 'text-[#5fd3a2]' : 'text-[#ff6b6b]'}`}>
              {right ? `+${money(value)}` : picked === -1 ? "Time's up" : `-${money(value)}`}
            </span>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-1.5">
          {deck.responses.map((text, idx) => {
            const isRight = idx === deck.correct;
            return (
              <button
                key={idx}
                type="button"
                disabled={revealed}
                onClick={() => answer(idx)}
                data-state={revealed ? (isRight ? 'right' : picked === idx ? 'wrong' : 'dim') : undefined}
                className={`tt-card tt-pop tt-a px-2.5 py-2 text-left font-bold ${revealed && isRight ? 'tt-flip' : ''}`}
                style={{ animationDelay: `${120 + idx * 70}ms` }}
              >
                {text}
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="min-w-0 flex-1">{scoreRow}</div>
          {revealed && (
            <button type="button" onClick={backToBoard} className="tt-key shrink-0">
              Back to the board
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-1.5 p-2.5 select-none">
      <div className="grid min-h-0 flex-1 gap-1" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gridTemplateRows: 'auto repeat(5, minmax(0, 1fr))' }}>
        {RERUN_CATEGORIES.map((cat, c) => (
          <div
            key={cat.title}
            className="tt-tile tt-pop tt-s flex items-center justify-center px-1 py-1.5 text-center leading-tight text-white"
            style={{ animationDelay: `${c * 60}ms` }}
          >
            {cat.title}
          </div>
        ))}
        {RERUN_VALUES.map((v, row) =>
          RERUN_CATEGORIES.map((cat, c) => {
            const key = `${c}:${row}`;
            const gone = used.has(key);
            return (
              <button
                key={key}
                type="button"
                disabled={gone}
                data-used={gone || undefined}
                onClick={() => openTile(c, row)}
                className="tt-tile tt-pop tt-h flex min-h-0 items-center justify-center"
                style={{ animationDelay: `${300 + (row * 5 + c) * 25}ms` }}
                aria-label={`${cat.title} for ${v}`}
              >
                {gone ? '' : `$${v}`}
              </button>
            );
          }),
        )}
      </div>
      {scoreRow}
    </div>
  );
}
