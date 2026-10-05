import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../../utils/audio';
import {
  LOAN_REPAY,
  LifeState,
  TRACK,
  aiCareerChoice,
  aiHouseChoice,
  aiTakesCollege,
  chooseCareer,
  chooseHouse,
  choosePath,
  netWorth,
  newLifeGame,
  repayLoan,
  spin,
} from './lifeEngine';
import { COLLEGE_COST } from './lifeEngine';

interface LifeGameProps {
  onBackToShelf: () => void;
  onGameOver?: (winner: string, isRealMatch: boolean) => void;
  playerName?: string;
}

const SPACE_TINT: Record<string, string> = {
  start: 'bg-slate-500',
  payday: 'bg-emerald-500',
  collect: 'bg-sky-500',
  pay: 'bg-rose-500',
  tax: 'bg-rose-700',
  'spin-pay': 'bg-rose-400',
  life: 'bg-amber-400',
  baby: 'bg-pink-400',
  'stop-career': 'bg-violet-500',
  'stop-marry': 'bg-fuchsia-500',
  'stop-house': 'bg-orange-500',
  'stop-family': 'bg-teal-500',
  'stop-retire': 'bg-yellow-300',
};

/** Spinner needle, pointing at the last number spun. */
function Spinner({ value, live }: { value: number; live: boolean }) {
  const angle = value > 0 ? (value / 10) * 360 - 18 : 0;
  return (
    <div className="relative w-28 h-28 shrink-0">
      <div className="absolute inset-0 rounded-full border-4 border-slate-800 overflow-hidden shadow-inner">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              clipPath: 'polygon(50% 50%, 50% 0, 81% 5%, 100% 30%)',
              transform: `rotate(${i * 36}deg)`,
              background: i % 2 === 0 ? '#2f7bb5' : '#e8e2d2',
            }}
          />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={`n${i}`}
            className="absolute text-[10px] font-black text-slate-900"
            style={{
              left: '50%',
              top: '50%',
              transform: `rotate(${i * 36 + 18}deg) translate(0,-40px) rotate(${-(i * 36 + 18)}deg)`,
              marginLeft: '-4px',
              marginTop: '-6px',
            }}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <div
        className="absolute left-1/2 top-1/2 origin-bottom w-[3px] h-[44%] -ml-[1.5px] -mt-[44%] rounded-full bg-rose-600 shadow transition-transform duration-700"
        style={{ transform: `rotate(${angle}deg)` }}
      />
      <div className="absolute left-1/2 top-1/2 w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-slate-900 border-2 border-white" />
      {live && (
        <p className="absolute -bottom-5 left-0 right-0 text-center text-[10px] uppercase tracking-[0.2em] font-bold text-amber-200">
          {value}
        </p>
      )}
    </div>
  );
}

/**
 * The Game of Life on its real track: college or straight to work, careers with
 * salaries and tax bands, Pay Days collected when passed, Life tiles, bank
 * loans at $25,000 a repayment, houses bought and sold back at retirement, and
 * a net-worth tally at the end.
 */
export function LifeGame({ onBackToShelf, onGameOver, playerName = 'You' }: LifeGameProps) {
  const [state, setState] = useState<LifeState>(() => newLifeGame(playerName));
  const aiTimer = useRef<number | null>(null);
  const reported = useRef(false);

  const me = state.players[0];
  const active = state.players[state.turn];
  const myTurn = state.turn === 0 && !me.retired;

  useEffect(
    () => () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (state.stage === 'over' || !active.isAI) return;
    aiTimer.current = window.setTimeout(() => {
      setState(s => {
        const p = s.players[s.turn];
        if (!p.isAI) return s;
        if (s.stage === 'choose-path') return choosePath(s, aiTakesCollege());
        if (s.stage === 'choose-career') return chooseCareer(s, aiCareerChoice(s));
        if (s.stage === 'choose-house') return chooseHouse(s, aiHouseChoice(s));
        if (s.stage === 'spin') {
          sound.playRouletteSpin();
          return spin(s);
        }
        return s;
      });
    }, 850);
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

  const doSpin = useCallback(() => {
    sound.playRouletteSpin();
    setState(s => spin(s));
  }, []);

  const occupants = useMemo(() => {
    const map = new Map<number, typeof state.players>();
    state.players.forEach(p => {
      const list = map.get(p.at) ?? [];
      list.push(p);
      map.set(p.at, list);
    });
    return map;
  }, [state.players]);

  const money = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div className="w-full text-white">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-sky-300 font-bold">On the table</p>
          <h2 className="font-display text-3xl leading-tight">The Game of Life</h2>
          <p className="text-[11px] text-slate-400">
            {state.stage === 'over' ? `${state.winner} retires richest` : `${active.name}'s turn`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state.players.map(p => (
            <div
              key={p.id}
              className={`rounded-xl border px-2.5 py-1.5 text-right ${
                state.turn === p.id && !p.retired ? 'border-amber-300/70 bg-amber-400/10' : 'border-white/10 bg-black/30'
              }`}
            >
              <p className="text-[9px] uppercase tracking-wider font-bold truncate max-w-[7rem]" style={{ color: p.colour }}>
                {p.name}
              </p>
              <p className="font-mono text-sm">{money(p.cash)}</p>
              <p className="text-[9px] text-slate-500">
                {p.career?.name ?? 'no career'} · {p.children} kids{p.loans > 0 ? ` · ${p.loans} loans` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-4 p-4">
        {/* winding track */}
        <div className="rounded-2xl border border-sky-900/50 bg-gradient-to-br from-[#123047] to-[#0d1f2e] p-3">
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
            {TRACK.map(space => {
              const here = occupants.get(space.i) ?? [];
              const isNow = space.i === active.at;
              return (
                <div
                  key={space.i}
                  title={space.label}
                  className={`relative aspect-square rounded-lg border ${
                    isNow ? 'border-amber-300 ring-2 ring-amber-300/50' : 'border-black/30'
                  } ${SPACE_TINT[space.type] ?? 'bg-slate-600'} flex items-center justify-center overflow-hidden`}
                >
                  <span className="text-[7px] leading-[1.05] text-center px-[2px] font-bold text-black/75">
                    {space.type === 'payday' ? 'PAY DAY' : space.label.split(':')[0]}
                  </span>
                  {here.length > 0 && (
                    <span className="absolute bottom-[1px] left-0 right-0 flex justify-center gap-[2px]">
                      {here.map(p => (
                        <span
                          key={p.id}
                          className="w-2 h-2 rounded-full border border-black/60"
                          style={{ background: p.colour }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[9px] uppercase tracking-wider font-bold text-slate-300">
            {[
              ['bg-emerald-500', 'Pay Day'],
              ['bg-sky-500', 'Collect'],
              ['bg-rose-500', 'Pay'],
              ['bg-amber-400', 'Life tile'],
              ['bg-violet-500', 'Stop'],
              ['bg-yellow-300', 'Retire'],
            ].map(([cls, label]) => (
              <span key={label} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded ${cls}`} /> {label}
              </span>
            ))}
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/35 p-3 space-y-3">
            <div className="flex items-start gap-3">
              <Spinner value={state.spin} live={state.spin > 0} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Your car</p>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {me.degree ? 'College graduate' : 'No degree'} · {me.married ? 'married' : 'single'} ·{' '}
                  {me.children} {me.children === 1 ? 'child' : 'children'}
                </p>
                <p className="text-[11px] text-slate-300">{me.house ? me.house.name : 'Renting'}</p>
                <p className="text-[11px] text-amber-200 font-mono mt-1">Net worth {money(netWorth(me))}</p>
              </div>
            </div>

            {state.stage === 'over' ? (
              <>
                <div className="space-y-1">
                  {[...state.players]
                    .sort((a, b) => netWorth(b) - netWorth(a))
                    .map((p, i) => (
                      <p key={p.id} className="flex justify-between text-[11px]">
                        <span style={{ color: p.colour }}>
                          {i + 1}. {p.name}
                          {p.retirement ? ` · ${p.retirement}` : ''}
                        </span>
                        <span className="font-mono">{money(netWorth(p))}</span>
                      </p>
                    ))}
                </div>
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
                {myTurn && state.stage === 'choose-path' && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-300">
                      College costs {money(COLLEGE_COST)} but opens the degree careers.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playButtonClick();
                          setState(s => choosePath(s, true));
                        }}
                        className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 px-3 py-2 text-[11px] font-black uppercase"
                      >
                        Go to college
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playButtonClick();
                          setState(s => choosePath(s, false));
                        }}
                        className="flex-1 rounded-xl bg-slate-700 hover:bg-slate-600 px-3 py-2 text-[11px] font-black uppercase"
                      >
                        Start working
                      </button>
                    </div>
                  </div>
                )}

                {myTurn && state.stage === 'spin' && (
                  <button
                    type="button"
                    onClick={doSpin}
                    className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2.5 text-xs font-black uppercase tracking-wider"
                  >
                    Spin the wheel
                  </button>
                )}

                {myTurn && state.stage === 'choose-career' && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300 font-bold">Pick a career</p>
                    {state.careerOffer.map(c => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          sound.playCheckChime();
                          setState(s => chooseCareer(s, c));
                        }}
                        className="w-full flex items-center justify-between rounded-lg border border-violet-400/40 bg-violet-500/10 hover:bg-violet-500/20 px-2.5 py-1.5"
                      >
                        <span className="text-[11px] font-bold">{c.name}</span>
                        <span className="text-[10px] font-mono text-violet-200">
                          {money(c.salary)} · tax {money(c.tax)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {myTurn && state.stage === 'choose-house' && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-orange-300 font-bold">Buy a house</p>
                    {state.houseOffer.map(h => (
                      <button
                        key={h.name}
                        type="button"
                        onClick={() => {
                          sound.playTokenPlace();
                          setState(s => chooseHouse(s, h));
                        }}
                        className="w-full flex items-center justify-between rounded-lg border border-orange-400/40 bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-1.5"
                      >
                        <span className="text-[11px] font-bold">{h.name}</span>
                        <span className="text-[10px] font-mono text-orange-200">
                          {money(h.price)} · sells {money(h.resale)}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setState(s => chooseHouse(s, null))}
                      className="w-full rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-300"
                    >
                      Keep renting
                    </button>
                  </div>
                )}

                {me.loans > 0 && myTurn && (
                  <button
                    type="button"
                    disabled={me.cash < LOAN_REPAY}
                    onClick={() => {
                      sound.playChipCollect();
                      setState(s => repayLoan(s));
                    }}
                    className="w-full rounded-xl border border-rose-400/40 disabled:opacity-40 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-200"
                  >
                    Repay a loan ({money(LOAN_REPAY)}) · {me.loans} outstanding
                  </button>
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

          {me.lifeTiles.length > 0 && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200 font-bold mb-1">
                Life tiles ({me.lifeTiles.length})
              </p>
              <p className="text-[11px] font-mono text-amber-100">
                Face down until retirement · {money(me.lifeTiles.reduce((a, b) => a + b, 0))}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-black/35 p-3 max-h-44 overflow-y-auto">
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
