import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../../utils/audio';
import {
  CELLAR,
  GRID,
  ROOMS,
  ROOM_RECTS,
  RoomName,
  SECRET_PASSAGES,
  SUSPECTS,
  Suspect,
  WEAPONS,
  Weapon,
  cardKey,
  isCorridor,
} from './clueData';
import {
  ClueState,
  Suggestion,
  accuse,
  aiRoomChoice,
  aiShouldAccuse,
  aiSuggestion,
  aiTileChoice,
  closeReveal,
  moveToRoom,
  moveToTile,
  newClueGame,
  reachable,
  rollClueDie,
  skipSuggestion,
  suggest,
} from './clueEngine';

type Mark = 'none' | 'no' | 'maybe' | 'yes';
const NEXT_MARK: Record<Mark, Mark> = { none: 'no', no: 'maybe', maybe: 'yes', yes: 'none' };
const MARK_GLYPH: Record<Mark, string> = { none: '', no: '✕', maybe: '?', yes: '✓' };
const MARK_STYLE: Record<Mark, string> = {
  none: 'text-slate-600',
  no: 'text-rose-400',
  maybe: 'text-amber-300',
  yes: 'text-emerald-300',
};

interface ClueGameProps {
  onBackToShelf: () => void;
  onGameOver?: (winner: string, isRealMatch: boolean) => void;
  playerName?: string;
}

/**
 * Clue with the real deduction loop: a hidden case file, a dealt deck, movement
 * on the mansion grid, suggestions that drag the suspect and weapon into the
 * room, refutation in turn order, secret passages, and a notebook you mark up
 * yourself. Opponents track what they are shown and accuse when only one
 * combination is left.
 */
export function ClueGame({ onBackToShelf, onGameOver, playerName = 'You' }: ClueGameProps) {
  const [state, setState] = useState<ClueState>(() => newClueGame(playerName));
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [draft, setDraft] = useState<{ suspect: Suspect; weapon: Weapon }>({
    suspect: 'Scarlett',
    weapon: 'Candlestick',
  });
  const [accuseOpen, setAccuseOpen] = useState(false);
  const [accuseRoom, setAccuseRoom] = useState<RoomName>('Study');
  const aiTimer = useRef<number | null>(null);
  const reported = useRef(false);

  const me = state.players[0];
  const active = state.players[state.turn];
  const myTurn = state.turn === 0 && !me.outOfGame;

  // Cards in your hand start crossed off, because you know they are not it.
  useEffect(() => {
    setMarks(prev => {
      const next = { ...prev };
      me.hand.forEach(c => {
        if (!next[cardKey(c)]) next[cardKey(c)] = 'no';
      });
      return next;
    });
  }, [me.hand]);

  useEffect(
    () => () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    },
    [],
  );

  // When an opponent shows you a card, cross it off automatically.
  useEffect(() => {
    const r = state.lastRefutation;
    if (!r || r.hidden || !r.card || state.lastSuggestion?.by !== 0) return;
    setMarks(prev => ({ ...prev, [cardKey(r.card!)]: 'no' }));
  }, [state.lastRefutation, state.lastSuggestion]);

  const { tiles, rooms } = useMemo(
    () => (state.stage === 'move' && myTurn ? reachable(state, state.stepsLeft) : { tiles: [], rooms: [] }),
    [myTurn, state],
  );

  const secretExit = me.room ? SECRET_PASSAGES[me.room] : undefined;

  /* ------------------------------ opponent -------------------------------- */
  useEffect(() => {
    if (state.stage === 'over' || !active.isAI) return;

    aiTimer.current = window.setTimeout(() => {
      setState(s => {
        const p = s.players[s.turn];
        if (!p.isAI) return s;

        if (s.stage === 'roll') {
          const sure = aiShouldAccuse(s);
          if (sure && p.room === sure.room) return accuse(s, sure);
          sound.playDieLand();
          return rollClueDie(s);
        }
        if (s.stage === 'move') {
          const room = aiRoomChoice(s);
          if (room) {
            sound.playTokenPlace();
            return moveToRoom(s, room);
          }
          const tile = aiTileChoice(s);
          if (tile) {
            sound.playTokenPlace();
            return moveToTile(s, tile[0], tile[1]);
          }
          return skipSuggestion(s);
        }
        if (s.stage === 'suggest') {
          sound.playPieceSelect();
          return suggest(s, aiSuggestion(s));
        }
        return closeReveal(s);
      });
    }, state.stage === 'reveal' ? 1500 : 850);

    return () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    };
  }, [active.isAI, state]);

  useEffect(() => {
    if (state.stage !== 'over' || reported.current) return;
    reported.current = true;
    if (state.winner === playerName) sound.playVictoryFanfare();
    else sound.playDefeat();
    onGameOver?.(state.winner === playerName ? `${playerName} (You)` : state.winner ?? 'Nobody', true);
  }, [onGameOver, playerName, state.stage, state.winner]);

  /* ------------------------------- actions -------------------------------- */

  const doRoll = useCallback(() => {
    sound.playDiceShake();
    setState(s => rollClueDie(s));
  }, []);

  const doSuggest = useCallback(() => {
    if (!me.room) return;
    sound.playPieceSelect();
    setState(s => suggest(s, { ...draft, room: s.players[0].room! }));
  }, [draft, me.room]);

  const toggleMark = useCallback((key: string) => {
    sound.playButtonClick();
    setMarks(prev => ({ ...prev, [key]: NEXT_MARK[prev[key] ?? 'none'] }));
  }, []);

  /* -------------------------------- render -------------------------------- */

  const cellSize = `calc(100% / ${GRID})`;
  const roomOf = (x: number, y: number) => ROOM_RECTS.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);

  const notebookRow = (kind: 'suspect' | 'weapon' | 'room', value: string, label: string) => {
    const key = `${kind}:${value}`;
    const mark = marks[key] ?? 'none';
    const inHand = me.hand.some(c => cardKey(c) === key);
    return (
      <button
        key={key}
        type="button"
        onClick={() => toggleMark(key)}
        className={`flex items-center justify-between w-full rounded-md px-2 py-[3px] text-left transition ${
          inHand ? 'bg-sky-500/10 border border-sky-400/25' : 'hover:bg-white/5 border border-transparent'
        }`}
      >
        <span className={`text-[11px] ${mark === 'no' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
          {label}
        </span>
        <span className={`w-4 text-center text-[12px] font-black ${MARK_STYLE[mark]}`}>
          {MARK_GLYPH[mark] || '·'}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full text-white">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/80 font-bold">On the table</p>
          <h2 className="font-display text-3xl leading-tight">Clue</h2>
          <p className="text-[11px] text-slate-400">
            {state.stage === 'over'
              ? `${state.winner} solved it`
              : myTurn
                ? state.stage === 'roll'
                  ? 'Your roll'
                  : state.stage === 'move'
                    ? `Move up to ${state.stepsLeft}`
                    : state.stage === 'suggest'
                      ? `You are in the ${me.room}`
                      : 'Reading the card'
                : `${active.name} is moving`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state.players.map(p => {
            const sus = SUSPECTS.find(s => s.id === p.suspect)!;
            return (
              <div
                key={p.id}
                className={`rounded-xl border px-2 py-1 ${
                  state.turn === p.id ? 'border-amber-300/70 bg-amber-400/10' : 'border-white/10 bg-black/30'
                } ${p.outOfGame ? 'opacity-40' : ''}`}
              >
                <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: sus.colour }}>
                  {p.name}
                </p>
                <p className="text-[9px] text-slate-500">{p.room ?? 'corridor'}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-4 p-4">
        {/* mansion */}
        <div className="relative mx-auto w-full max-w-[600px] aspect-square rounded-2xl border-4 border-[#3a2016] bg-[#2b1a12] overflow-hidden shadow-2xl">
          {/* corridor grid */}
          <div className="absolute inset-0">
            {Array.from({ length: GRID }).map((_, y) =>
              Array.from({ length: GRID }).map((__, x) => {
                if (!isCorridor(x, y)) return null;
                const hit = tiles.find(t => t.x === x && t.y === y);
                return (
                  <button
                    key={`${x}-${y}`}
                    type="button"
                    disabled={!hit}
                    onClick={() => {
                      sound.playTokenPlace();
                      setState(s => moveToTile(s, x, y));
                    }}
                    className={`absolute border border-black/20 transition ${
                      hit ? 'bg-amber-300/35 hover:bg-amber-300/60' : 'bg-[#6a5340]/70'
                    }`}
                    style={{ left: `calc(${x} * ${cellSize})`, top: `calc(${y} * ${cellSize})`, width: cellSize, height: cellSize }}
                  />
                );
              }),
            )}
          </div>

          {/* rooms */}
          {ROOM_RECTS.map(r => {
            const hit = rooms.find(x => x.room === r.name);
            const canSecret = secretExit === r.name && state.stage === 'suggest';
            const openable = Boolean(hit) || canSecret;
            const weaponsHere = WEAPONS.filter(w => state.weaponRooms[w.id] === r.name);
            const here = state.players.filter(p => p.room === r.name);
            return (
              <button
                key={r.name}
                type="button"
                disabled={!openable}
                onClick={() => {
                  sound.playTokenPlace();
                  setState(s => moveToRoom(s, r.name));
                }}
                className={`absolute flex flex-col items-center justify-center gap-0.5 border-2 transition ${
                  openable
                    ? 'border-amber-300 bg-amber-200/25 hover:bg-amber-200/40'
                    : 'border-[#6b4a32] bg-[#4a3222]'
                }`}
                style={{
                  left: `calc(${r.x} * ${cellSize})`,
                  top: `calc(${r.y} * ${cellSize})`,
                  width: `calc(${r.w} * ${cellSize})`,
                  height: `calc(${r.h} * ${cellSize})`,
                }}
              >
                <span className="text-[9px] sm:text-[10px] font-display leading-none text-amber-100/90 text-center px-1">
                  {r.name}
                </span>
                {weaponsHere.length > 0 && (
                  <span className="text-[10px] leading-none">{weaponsHere.map(w => w.glyph).join('')}</span>
                )}
                {here.length > 0 && (
                  <span className="flex gap-0.5">
                    {here.map(p => {
                      const sus = SUSPECTS.find(s => s.id === p.suspect)!;
                      return (
                        <span
                          key={p.id}
                          className="w-2.5 h-2.5 rounded-full border border-black/50"
                          style={{ background: sus.colour }}
                        />
                      );
                    })}
                  </span>
                )}
                {SECRET_PASSAGES[r.name] && (
                  <span className="absolute bottom-0 right-0.5 text-[7px] text-amber-200/70">passage</span>
                )}
              </button>
            );
          })}

          {/* cellar holds the case file */}
          <div
            className="absolute flex flex-col items-center justify-center bg-[#1a0f0a] border-2 border-[#5d3b26]"
            style={{
              left: `calc(${CELLAR.x} * ${cellSize})`,
              top: `calc(${CELLAR.y} * ${cellSize})`,
              width: `calc(${CELLAR.w} * ${cellSize})`,
              height: `calc(${CELLAR.h} * ${cellSize})`,
            }}
          >
            <span className="text-[9px] uppercase tracking-[0.15em] text-amber-200/70 font-bold">Case file</span>
            <span className="text-lg">🗂️</span>
            {state.stage === 'over' && (
              <span className="text-[8px] text-amber-100 text-center leading-tight px-1">
                {state.solution.suspect} · {state.solution.weapon} · {state.solution.room}
              </span>
            )}
          </div>

          {/* suspects standing in corridors */}
          {state.players
            .filter(p => !p.room)
            .map(p => {
              const sus = SUSPECTS.find(s => s.id === p.suspect)!;
              return (
                <span
                  key={p.id}
                  className="absolute rounded-full border-2 border-black/60 shadow-lg pointer-events-none"
                  style={{
                    left: `calc(${p.at[0]} * ${cellSize})`,
                    top: `calc(${p.at[1]} * ${cellSize})`,
                    width: cellSize,
                    height: cellSize,
                    background: sus.colour,
                    outline: state.turn === p.id ? '2px solid #fbbf24' : undefined,
                  }}
                />
              );
            })}
        </div>

        {/* notebook + actions */}
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/35 p-3 space-y-2">
            {state.stage === 'over' ? (
              <>
                <p className="font-display text-xl">{state.winner} cracks the case.</p>
                <p className="text-[11px] text-slate-400">
                  It was {state.solution.suspect} in the {state.solution.room} with the {state.solution.weapon}.
                </p>
                <button
                  type="button"
                  onClick={onBackToShelf}
                  className="w-full rounded-xl bg-amber-400 text-black px-4 py-2 text-xs font-black uppercase tracking-wider"
                >
                  Pack up &amp; return
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Your turn</p>
                  {state.die > 0 && <p className="font-mono text-sm text-amber-200">die {state.die}</p>}
                </div>

                {myTurn && state.stage === 'roll' && (
                  <button
                    type="button"
                    onClick={doRoll}
                    className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 text-xs font-black uppercase tracking-wider"
                  >
                    Roll the die
                  </button>
                )}

                {myTurn && state.stage === 'move' && (
                  <p className="text-[11px] text-slate-400">
                    Click a lit corridor tile or a lit room. {rooms.length} room{rooms.length === 1 ? '' : 's'} in range.
                  </p>
                )}

                {myTurn && state.stage === 'suggest' && me.room && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-300">
                      Suggest a solution in the <span className="font-bold">{me.room}</span>.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={draft.suspect}
                        onChange={e => setDraft(d => ({ ...d, suspect: e.target.value as Suspect }))}
                        className="rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-[11px]"
                      >
                        {SUSPECTS.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.full}
                          </option>
                        ))}
                      </select>
                      <select
                        value={draft.weapon}
                        onChange={e => setDraft(d => ({ ...d, weapon: e.target.value as Weapon }))}
                        className="rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-[11px]"
                      >
                        {WEAPONS.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.glyph} {w.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={doSuggest}
                      className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-black uppercase tracking-wider"
                    >
                      Make the suggestion
                    </button>
                    {secretExit && (
                      <button
                        type="button"
                        onClick={() => setState(s => moveToRoom(s, secretExit))}
                        className="w-full rounded-xl border border-amber-300/40 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-200"
                      >
                        Take the passage to the {secretExit}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setState(s => skipSuggestion(s))}
                      className="w-full rounded-xl border border-white/15 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300"
                    >
                      Say nothing
                    </button>
                  </div>
                )}

                {state.stage === 'reveal' && (
                  <div className="rounded-xl border border-sky-400/40 bg-sky-500/10 p-2.5">
                    {state.lastRefutation?.by === -1 ? (
                      <p className="text-[11px] text-sky-100">Nobody could disprove it.</p>
                    ) : state.lastRefutation?.hidden ? (
                      <p className="text-[11px] text-sky-100">
                        {state.players[state.lastRefutation.by].name} showed a card in private.
                      </p>
                    ) : (
                      <p className="text-[11px] text-sky-100">
                        {state.players[state.lastRefutation!.by].name} showed you the{' '}
                        <span className="font-bold">{String(state.lastRefutation!.card!.value)}</span>.
                      </p>
                    )}
                    {state.lastSuggestion?.by === 0 && (
                      <button
                        type="button"
                        onClick={() => setState(s => closeReveal(s))}
                        className="mt-2 w-full rounded-lg bg-sky-500 px-3 py-1.5 text-[10px] font-black uppercase"
                      >
                        Note it and pass
                      </button>
                    )}
                  </div>
                )}

                {myTurn && (
                  <div className="pt-1 border-t border-white/10">
                    {accuseOpen ? (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-rose-300 font-bold">
                          Final accusation
                        </p>
                        <select
                          value={accuseRoom}
                          onChange={e => setAccuseRoom(e.target.value as RoomName)}
                          className="w-full rounded-lg bg-black/50 border border-white/15 px-2 py-1.5 text-[11px]"
                        >
                          {ROOMS.map(r => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              sound.playGuillotineBlade();
                              setState(s => accuse(s, { ...draft, room: accuseRoom }));
                              setAccuseOpen(false);
                            }}
                            className="flex-1 rounded-lg bg-rose-600 px-3 py-1.5 text-[10px] font-black uppercase"
                          >
                            Accuse
                          </button>
                          <button
                            type="button"
                            onClick={() => setAccuseOpen(false)}
                            className="flex-1 rounded-lg bg-slate-700 px-3 py-1.5 text-[10px] font-black uppercase"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-500">
                          Uses the suspect and weapon selected above. Get it wrong and you are out.
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAccuseOpen(true)}
                        className="mt-2 w-full rounded-xl border border-rose-400/40 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300"
                      >
                        Make an accusation
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={onBackToShelf}
                  className="w-full rounded-xl border border-white/15 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white"
                >
                  Pack up &amp; return
                </button>
              </>
            )}
          </div>

          {/* detective notebook */}
          <div className="rounded-2xl border border-amber-900/40 bg-[#1b1512] p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/70 font-bold mb-1.5">
              Detective notebook
            </p>
            <p className="text-[9px] text-slate-500 mb-2">
              Tap to cycle ✕ ruled out · ? suspected · ✓ confirmed. Your own cards are shaded.
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold px-1">Who</p>
                {SUSPECTS.map(s => notebookRow('suspect', s.id, s.full))}
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold px-1">What</p>
                {WEAPONS.map(w => notebookRow('weapon', w.id, `${w.glyph} ${w.id}`))}
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold px-1">Where</p>
                {ROOMS.map(r => notebookRow('room', r, r))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/35 p-3 max-h-40 overflow-y-auto">
            {state.log.map((line, i) => (
              <p key={i} className={`text-[11px] leading-relaxed ${i === 0 ? 'text-slate-200' : 'text-slate-500'}`}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
