import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../../utils/audio';
import {
  BOARD,
  GROUP_COLORS,
  TOKENS,
  edgeOf,
  gridCell,
} from './monopolyData';
import {
  GameState,
  aiBuildTarget,
  aiWantsToBuy,
  build,
  buyPending,
  canBuild,
  endTurn,
  hasMonopoly,
  netWorth,
  newGame,
  ownedCountInGroup,
  rentFor,
  rollDice,
  spaceAt,
} from './monopolyEngine';

interface MonopolyGameProps {
  onBackToShelf: () => void;
  onGameOver?: (winner: string, isRealMatch: boolean) => void;
  playerName?: string;
}

const EDGE_BAR: Record<string, string> = {
  bottom: 'top-0 left-0 right-0 h-[18%] border-b',
  left: 'top-0 right-0 bottom-0 w-[18%] border-l',
  top: 'bottom-0 left-0 right-0 h-[18%] border-t',
  right: 'top-0 left-0 bottom-0 w-[18%] border-r',
};

function Pip({ value }: { value: number }) {
  const spots: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
  };
  return (
    <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-white to-slate-300 shadow-inner border border-slate-400">
      {(spots[value] ?? []).map(([cx, cy], i) => (
        <span
          key={i}
          className="absolute w-[6px] h-[6px] rounded-full bg-slate-900"
          style={{ left: `${14 + cx * 28}%`, top: `${14 + cy * 28}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Monopoly on the real board: all 40 spaces, the printed rent tables, even
 * building, railroad and utility rent rules, jail with doubles and the fine,
 * both card decks, and bankruptcy that hands the deeds to the creditor.
 */
export function MonopolyGame({ onBackToShelf, onGameOver, playerName = 'You' }: MonopolyGameProps) {
  const [state, setState] = useState<GameState>(() =>
    newGame([
      { name: playerName, isAI: false, token: TOKENS[0].id, glyph: TOKENS[0].glyph },
      { name: 'Vegas_Viper', isAI: true, token: TOKENS[1].id, glyph: TOKENS[1].glyph },
      { name: 'PixelKnight', isAI: true, token: TOKENS[3].id, glyph: TOKENS[3].glyph },
    ]),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const aiTimer = useRef<number | null>(null);
  const reported = useRef(false);

  const me = state.players[0];
  const active = state.players[state.turn];
  const myTurn = state.turn === 0 && !active.bankrupt;

  useEffect(
    () => () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    },
    [],
  );

  const doRoll = useCallback(() => {
    sound.playDiceShake();
    setState(s => {
      const next = rollDice(s);
      window.setTimeout(() => sound.playDieLand(), 120);
      return next;
    });
  }, []);

  const doBuy = useCallback((buy: boolean) => {
    if (buy) sound.playChipCollect();
    else sound.playMoveClack();
    setState(s => buyPending(s, buy));
  }, []);

  const doBuild = useCallback((i: number) => {
    sound.playTokenPlace();
    setState(s => build(s, i));
  }, []);

  const doEnd = useCallback(() => {
    sound.playButtonClick();
    setState(s => endTurn(s));
  }, []);

  /* ------------------------------ opponent -------------------------------- */
  useEffect(() => {
    if (state.stage === 'over' || !active.isAI) return;

    const delay = state.stage === 'roll' ? 900 : 750;
    aiTimer.current = window.setTimeout(() => {
      setState(s => {
        const p = s.players[s.turn];
        if (!p.isAI) return s;
        if (s.stage === 'roll') {
          sound.playDiceShake();
          return rollDice(s);
        }
        if (s.stage === 'resolve') {
          if (s.pendingPurchase !== null) return buyPending(s, aiWantsToBuy(s, s.pendingPurchase));
          const target = aiBuildTarget(s);
          if (target !== null) return build(s, target);
          return endTurn(s);
        }
        return endTurn(s);
      });
    }, delay);

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

  /* -------------------------------- render -------------------------------- */

  const occupants = useMemo(() => {
    const map = new Map<number, typeof state.players>();
    state.players.forEach(p => {
      if (p.bankrupt) return;
      const list = map.get(p.at) ?? [];
      list.push(p);
      map.set(p.at, list);
    });
    return map;
  }, [state.players]);

  const myDeeds = BOARD.filter(sp => state.deeds[sp.i]?.owner === 0);
  const buildable = BOARD.filter(sp => canBuild(state, sp.i, 0));
  const selectedSpace = selected !== null ? spaceAt(selected) : null;
  const selectedDeed = selected !== null ? state.deeds[selected] : undefined;

  return (
    <div className="w-full text-white">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-red-300 font-bold">On the table</p>
          <h2 className="font-display text-3xl leading-tight">Monopoly</h2>
          <p className="text-[11px] text-slate-400">
            {state.stage === 'over'
              ? `${state.winner} owns the board`
              : myTurn
                ? state.stage === 'roll'
                  ? 'Your roll'
                  : 'Your move'
                : `${active.name} is playing`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {state.players.map(p => (
            <div
              key={p.id}
              className={`rounded-xl border px-2.5 py-1.5 text-right ${
                state.turn === p.id && !p.bankrupt ? 'border-amber-300/70 bg-amber-400/10' : 'border-white/10 bg-black/30'
              } ${p.bankrupt ? 'opacity-40' : ''}`}
            >
              <p className="text-[9px] uppercase tracking-wider font-bold truncate max-w-[6.5rem]" style={{ color: p.colour }}>
                {p.glyph} {p.name}
              </p>
              <p className="font-mono text-sm">${p.cash}</p>
              <p className="text-[9px] text-slate-500 font-mono">net ${netWorth(state, p)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-4 p-4">
        {/* board */}
        <div className="relative mx-auto w-full max-w-[640px] aspect-square rounded-2xl bg-[#cfe3cd] shadow-2xl border-4 border-[#1c2b1c] overflow-hidden">
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(11,1fr)', gridTemplateRows: 'repeat(11,1fr)' }}>
            {BOARD.map(sp => {
              const cell = gridCell(sp.i);
              const edge = edgeOf(sp.i);
              const deed = state.deeds[sp.i];
              const owner = deed ? state.players[deed.owner] : null;
              const here = occupants.get(sp.i) ?? [];
              const isCorner = sp.i % 10 === 0;
              return (
                <button
                  key={sp.i}
                  type="button"
                  onClick={() => setSelected(sp.i)}
                  style={{ gridColumn: cell.col, gridRow: cell.row }}
                  className={`relative border border-[#1c2b1c]/60 bg-[#e6f0e2] hover:bg-white transition ${
                    selected === sp.i ? 'ring-2 ring-amber-400 z-20' : ''
                  }`}
                >
                  {sp.group && (
                    <span
                      className={`absolute ${EDGE_BAR[edge]} border-[#1c2b1c]/60`}
                      style={{ background: GROUP_COLORS[sp.group] }}
                    />
                  )}
                  <span
                    className={`absolute inset-0 flex items-center justify-center px-[2px] text-center leading-[1.05] font-bold text-[#17251a] ${
                      isCorner ? 'text-[7px]' : 'text-[6px]'
                    }`}
                    style={{ paddingTop: edge === 'bottom' ? '22%' : undefined, paddingBottom: edge === 'top' ? '22%' : undefined }}
                  >
                    {sp.short}
                  </span>
                  {sp.price !== undefined && (
                    <span className="absolute bottom-[1px] left-0 right-0 text-center text-[5px] font-mono text-[#17251a]/70">
                      ${sp.price}
                    </span>
                  )}
                  {/* owner flag */}
                  {owner && (
                    <span
                      className="absolute top-[1px] right-[1px] w-[5px] h-[5px] rounded-full border border-black/40"
                      style={{ background: owner.colour }}
                    />
                  )}
                  {/* houses and hotels */}
                  {deed && (deed.houses > 0 || deed.hotel) && (
                    <span className="absolute inset-x-0 bottom-[6px] flex items-end justify-center gap-[1px]">
                      {deed.hotel ? (
                        <span className="w-[9px] h-[6px] rounded-[1px] bg-red-600 border border-red-900 shadow" />
                      ) : (
                        Array.from({ length: deed.houses }).map((_, h) => (
                          <span key={h} className="w-[4px] h-[4px] rounded-[1px] bg-emerald-600 border border-emerald-900" />
                        ))
                      )}
                    </span>
                  )}
                  {/* tokens */}
                  {here.length > 0 && (
                    <span className="absolute inset-0 flex items-center justify-center gap-[1px] text-[9px] z-10">
                      {here.map(p => (
                        <span
                          key={p.id}
                          className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                          style={{ filter: state.turn === p.id ? 'drop-shadow(0 0 3px #fbbf24)' : undefined }}
                        >
                          {p.glyph}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* centre of the board */}
          <div className="absolute left-[9.09%] top-[9.09%] w-[81.81%] h-[81.81%] flex flex-col items-center justify-center gap-3 bg-[#cfe3cd] pointer-events-none">
            <p
              className="font-display text-[clamp(1.5rem,5vw,2.6rem)] text-[#d2232a] tracking-tight"
              style={{ transform: 'rotate(-45deg)' }}
            >
              MONOPOLY
            </p>
            <div className="flex items-center gap-2">
              <Pip value={state.dice[0]} />
              <Pip value={state.dice[1]} />
            </div>
            {state.freeParkingPot > 0 && (
              <p className="text-[10px] font-mono text-[#17251a]">Free Parking pot ${state.freeParkingPot}</p>
            )}
            {state.drawnCard && (
              <div className="max-w-[78%] rounded-lg bg-white/95 border border-[#1c2b1c]/40 px-3 py-2 text-center">
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#d2232a]">Card drawn</p>
                <p className="text-[11px] text-[#17251a] leading-snug">{state.drawnCard.text}</p>
              </div>
            )}
          </div>
        </div>

        {/* side panel */}
        <div className="flex flex-col gap-3">
          {/* actions */}
          <div className="rounded-2xl border border-white/10 bg-black/35 p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Your turn</p>
            {state.stage === 'over' ? (
              <>
                <p className="font-display text-xl">{state.winner} owns the board.</p>
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
                <button
                  type="button"
                  disabled={!myTurn || state.stage !== 'roll'}
                  onClick={doRoll}
                  className="w-full rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-35 px-4 py-2.5 text-xs font-black uppercase tracking-wider"
                >
                  {me.inJail ? 'Roll for doubles' : 'Roll the dice'}
                </button>

                {myTurn && state.pendingPurchase !== null && (
                  <div className="rounded-xl border border-amber-300/40 bg-amber-400/10 p-2.5">
                    <p className="text-xs font-bold">
                      {spaceAt(state.pendingPurchase).name} — ${spaceAt(state.pendingPurchase).price}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => doBuy(true)}
                        disabled={me.cash < (spaceAt(state.pendingPurchase).price ?? 0)}
                        className="flex-1 rounded-lg bg-emerald-500 disabled:opacity-40 px-3 py-1.5 text-[11px] font-black uppercase"
                      >
                        Buy
                      </button>
                      <button
                        type="button"
                        onClick={() => doBuy(false)}
                        className="flex-1 rounded-lg bg-slate-700 px-3 py-1.5 text-[11px] font-black uppercase"
                      >
                        Pass
                      </button>
                    </div>
                  </div>
                )}

                {myTurn && state.stage !== 'roll' && state.pendingPurchase === null && (
                  <button
                    type="button"
                    onClick={doEnd}
                    className="w-full rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2 text-xs font-black uppercase tracking-wider"
                  >
                    {state.doublesRun > 0 ? 'Roll again (doubles)' : 'End turn'}
                  </button>
                )}

                {buildable.length > 0 && myTurn && (
                  <div className="pt-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300 font-bold mb-1">Build</p>
                    <div className="flex flex-wrap gap-1.5">
                      {buildable.map(sp => (
                        <button
                          key={sp.i}
                          type="button"
                          onClick={() => doBuild(sp.i)}
                          className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 text-[10px] font-bold"
                        >
                          {sp.short} <span className="font-mono text-emerald-300">${sp.houseCost}</span>
                        </button>
                      ))}
                    </div>
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

          {/* selected deed */}
          {selectedSpace && (
            <div className="rounded-2xl border border-white/10 bg-black/35 overflow-hidden">
              {selectedSpace.group && (
                <div className="h-6 flex items-center justify-center" style={{ background: GROUP_COLORS[selectedSpace.group] }}>
                  <p className="text-[9px] uppercase tracking-[0.2em] font-black text-black/80">Title deed</p>
                </div>
              )}
              <div className="p-3">
                <p className="font-display text-lg leading-tight">{selectedSpace.name}</p>
                {selectedSpace.price !== undefined && (
                  <p className="text-[11px] text-slate-400 font-mono">Price ${selectedSpace.price}</p>
                )}
                {selectedSpace.rent && (
                  <div className="mt-2 space-y-0.5 text-[11px] font-mono text-slate-300">
                    {['Site', '1 house', '2 houses', '3 houses', '4 houses', 'Hotel'].map((label, idx) => (
                      <p key={label} className="flex justify-between">
                        <span className="text-slate-500">{label}</span>
                        <span>${selectedSpace.rent![idx]}</span>
                      </p>
                    ))}
                    <p className="flex justify-between pt-1 border-t border-white/10">
                      <span className="text-slate-500">House cost</span>
                      <span>${selectedSpace.houseCost}</span>
                    </p>
                  </div>
                )}
                {selectedSpace.kind === 'railroad' && (
                  <p className="mt-2 text-[11px] text-slate-400">Rent $25 / $50 / $100 / $200 for 1–4 railroads.</p>
                )}
                {selectedSpace.kind === 'utility' && (
                  <p className="mt-2 text-[11px] text-slate-400">4× the dice with one utility, 10× with both.</p>
                )}
                {selectedDeed && (
                  <p className="mt-2 text-[11px]">
                    Owned by{' '}
                    <span className="font-bold" style={{ color: state.players[selectedDeed.owner].colour }}>
                      {state.players[selectedDeed.owner].name}
                    </span>
                    {hasMonopoly(state, selectedDeed.owner, selectedSpace.group) && (
                      <span className="text-amber-300"> · full set</span>
                    )}
                    {selectedSpace.kind !== 'street' && (
                      <span className="text-slate-500">
                        {' '}
                        · {ownedCountInGroup(state, selectedDeed.owner, selectedSpace.group!)} held
                      </span>
                    )}
                    <span className="block text-slate-400 font-mono">
                      Rent now ${rentFor(state, selectedSpace.i, state.dice[0] + state.dice[1])}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* my portfolio */}
          <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-1.5">
              Your deeds ({myDeeds.length})
            </p>
            {myDeeds.length === 0 ? (
              <p className="text-[11px] text-slate-500">Nothing yet. Land on an unowned space to buy it.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {myDeeds.map(sp => {
                  const d = state.deeds[sp.i];
                  return (
                    <button
                      key={sp.i}
                      type="button"
                      onClick={() => setSelected(sp.i)}
                      className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-black"
                      style={{ background: sp.group ? GROUP_COLORS[sp.group] : '#9aa' }}
                    >
                      {sp.short}
                      {d.hotel ? ' ★' : d.houses > 0 ? ` ${'▪'.repeat(d.houses)}` : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* log */}
          <div className="rounded-2xl border border-white/10 bg-black/35 p-3 max-h-48 overflow-y-auto">
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
