import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchBoards, fetchLeaderboard, type BoardIndex, type LeaderboardPage } from '../net/roomApi';
import { sound } from '../utils/audio';

const PAGE = 20;

/** 61.25 s -> "1:01.25"; whole seconds stay whole. */
export function formatValue(value: number, unit: string | null) {
  if (unit !== 's') return value.toLocaleString();
  const m = Math.floor(value / 60);
  const s = value - m * 60;
  const secs = Number.isInteger(value) ? String(Math.floor(s)).padStart(m ? 2 : 1, '0') : s.toFixed(2).padStart(m ? 5 : 4, '0');
  return m ? `${m}:${secs}` : `${secs}s`;
}

const MODE_LABEL: Record<string, string> = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' };

/**
 * The universal leaderboard. It lays over the live room, so whatever you were
 * playing keeps its state underneath; closing it puts you straight back.
 */
export function LeaderboardPanel({ open, onClose, initialGame }: { open: boolean; onClose: () => void; initialGame?: string }) {
  const [index, setIndex] = useState<BoardIndex | null>(null);
  const [offline, setOffline] = useState(false);
  const [game, setGame] = useState<string>('');
  const [metric, setMetric] = useState<string>('');
  const [mode, setMode] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<LeaderboardPage | null>(null);
  const [loading, setLoading] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || index) return;
    let live = true;
    fetchBoards().then(b => {
      if (!live) return;
      if (!b) return setOffline(true);
      setOffline(false);
      setIndex(b);
      const first = b.games.find(g => g.id === initialGame) ?? b.games[0];
      if (first) {
        setGame(first.id);
        setMetric(first.metrics[0]?.id ?? '');
        setMode(first.modes[0] ?? '');
      }
    });
    return () => {
      live = false;
    };
  }, [open, index, initialGame]);

  const current = useMemo(() => index?.games.find(g => g.id === game) ?? null, [index, game]);
  const metricInfo = current?.metrics.find(m => m.id === metric) ?? null;

  useEffect(() => {
    if (!open || !game || !metric) return;
    let live = true;
    setLoading(true);
    fetchLeaderboard({ game, metric, mode, limit: PAGE, offset }).then(p => {
      if (!live) return;
      setLoading(false);
      setOffline(!p);
      setPage(p);
    });
    return () => {
      live = false;
    };
  }, [open, game, metric, mode, offset]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const pickGame = (id: string) => {
    const g = index?.games.find(x => x.id === id);
    if (!g) return;
    sound.playButtonClick();
    setGame(g.id);
    setMetric(g.metrics[0]?.id ?? '');
    setMode(g.modes[0] ?? '');
    setOffset(0);
  };

  return (
    <div
      className="leaderboard-fade fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-3 backdrop-blur-[3px]"
      onPointerDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Leaderboard"
    >
      <style>{`
        .leaderboard-fade { animation: lbIn 180ms ease-out; }
        @keyframes lbIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .leaderboard-fade { animation: none; } }
      `}</style>
      <div className="flex max-h-[min(640px,92dvh)] w-full max-w-[460px] flex-col rounded-2xl border border-white/15 bg-[#140c14]/80 text-white shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/80">High scores</p>
            <h2 className="text-base font-black tracking-wide">Leaderboard</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-white/20 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80 hover:bg-white/10"
          >
            Back
          </button>
        </div>

        {offline && !page ? (
          <p className="px-4 py-8 text-center text-sm text-white/60">
            The leaderboard can't be reached right now. Your results are kept on this device and sent when it's back.
          </p>
        ) : !index ? (
          <p className="px-4 py-8 text-center text-sm text-white/50">Loading…</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 px-4 pt-3">
              <label className="flex flex-col gap-1">
                <span className="sr-only">Game</span>
                <select
                  value={game}
                  onChange={e => pickGame(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-white/15 bg-black/50 px-3 text-sm font-bold text-amber-50"
                >
                  {index.games.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
              {current && (current.metrics.length > 1 || current.modes.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {current.metrics.length > 1 &&
                    current.metrics.map(m => (
                      <Chip key={m.id} on={m.id === metric} onClick={() => (setMetric(m.id), setOffset(0))}>
                        {m.label}
                      </Chip>
                    ))}
                  {current.modes.map(m => (
                    <Chip key={m} on={m === mode} onClick={() => (setMode(m), setOffset(0))}>
                      {MODE_LABEL[m] ?? m}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 min-h-[180px] flex-1 overflow-y-auto px-2" aria-busy={loading}>
              {page && page.rows.length === 0 && (
                <p className="px-2 py-10 text-center text-sm text-white/55">No results yet. Play a round and you're on the board.</p>
              )}
              <ol>
                {page?.rows.map(r => (
                  <li
                    key={`${r.rank}-${r.name}`}
                    className={`flex items-center gap-3 rounded-xl px-2 py-2 ${r.you ? 'bg-amber-200/15 text-amber-50' : 'text-white/85'}`}
                  >
                    <span className={`w-8 text-right font-mono text-sm ${r.rank <= 3 ? 'font-black text-amber-200' : 'text-white/45'}`}>{r.rank}</span>
                    <span className="flex-1 truncate text-sm font-bold">
                      {r.name}
                      {r.you && <span className="ml-1.5 text-[10px] uppercase tracking-[0.14em] text-amber-200/80">you</span>}
                    </span>
                    <span className="font-mono text-sm tabular-nums">{formatValue(r.value, page.unit)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3 text-[11px] text-white/55">
              <span>
                {page?.you ? (
                  <>
                    You: <b className="text-amber-100">#{page.you.rank}</b> · {formatValue(page.you.value, page.unit)}
                  </>
                ) : (
                  'Not on this board yet'
                )}
              </span>
              <span className="flex gap-1.5">
                <Chip on={false} disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
                  Prev
                </Chip>
                <Chip on={false} disabled={!page || offset + PAGE >= page.total} onClick={() => setOffset(offset + PAGE)}>
                  Next
                </Chip>
              </span>
            </div>
            <p className="px-4 pb-3 text-[10px] leading-relaxed text-white/35">
              {metricInfo?.better === 'lower' ? 'Lowest is best. ' : ''}Results are sent by each player's game and are self-reported, not verified.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Chip({ on, onClick, disabled, children }: { on: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={on}
      onClick={() => {
        sound.playButtonClick();
        onClick();
      }}
      className={`min-h-9 rounded-full border px-3 text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-30 ${
        on ? 'border-amber-200/80 bg-amber-200/20 text-amber-50' : 'border-white/20 text-white/75 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
