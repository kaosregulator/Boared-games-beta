import React, { useEffect, useRef, useState } from 'react';
import catalog from '../rewards/catalog.json';
import {
  chooseGeneration,
  ensureSession,
  fetchAuthStatus,
  fetchDiscordStatus,
  fetchProfile,
  onProfile,
  signInUrl,
  signOut,
  type DiscordStatus,
  type PlayerProfile,
} from '../net/roomApi';
import { sound } from '../utils/audio';

type Role = (typeof catalog.roles)[number];
const byKey = new Map<string, Role>(catalog.roles.map(r => [r.key, r]));
const GENERATIONS = catalog.roles.filter(r => r.family === 'generation');
const RARITY = catalog.rarityColors as Record<string, string>;

const SIGNIN_MESSAGES: Record<string, string> = {
  ok: 'Signed in with Discord.',
  cancelled: 'Sign-in cancelled. You can keep playing as a guest.',
  expired: 'That sign-in took too long or came from another tab. Try again.',
  unavailable: "Discord sign-in isn't set up on this server yet.",
  'discord-unreachable': "Discord didn't answer. Try again in a minute — you can keep playing meanwhile.",
  'code-rejected': 'Discord turned that sign-in down. Try again.',
  failed: 'Sign-in failed. Try again.',
};

/** The result of coming back from Discord (?signin=…), shown once and removed from the address bar. */
export function takeSignInResult(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const result = params.get('signin');
  if (!result) return null;
  params.delete('signin');
  const q = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`);
  return SIGNIN_MESSAGES[result] ?? SIGNIN_MESSAGES.failed;
}

const MEMBERSHIP: Record<string, string> = {
  member: 'In the Nostalgia Game Room server ✓',
  'not-member': 'Not in the Nostalgia Game Room server yet. Join it to get your roles there.',
  unavailable: "Couldn't check the server right now. Your roles are saved and will be sent later.",
};

/** Profile and sign-in. Guests play everything; signing in keeps progress across devices and puts roles in Discord. */
export function ProfilePanel({ open, onClose, notice }: { open: boolean; onClose: () => void; notice: string | null }) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [discord, setDiscord] = useState<DiscordStatus | null>(null);
  const [canSignIn, setCanSignIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => onProfile(setProfile), []);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void ensureSession().then(() => fetchProfile());
    void fetchAuthStatus().then(s => live && setCanSignIn(s.discord));
    void fetchDiscordStatus().then(s => live && setDiscord(s));
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      live = false;
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose]);

  if (!open) return null;
  const p = profile?.player ?? null;
  const signedIn = p?.kind === 'discord';
  const earned = (profile?.awards ?? []).map(a => byKey.get(a.key)).filter((r): r is Role => Boolean(r) && r!.family !== 'generation');
  const syncOf = (key: string) => discord?.sync?.find(s => s.key === key)?.status;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-3 backdrop-blur-[3px]"
      onPointerDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Profile"
    >
      <div className="flex max-h-[min(680px,92dvh)] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#140c14]/85 text-white shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {p?.avatar ? (
              <img src={p.avatar} alt="" className="h-10 w-10 rounded-full border border-white/20" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg">🎮</div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/80">{signedIn ? 'Signed in with Discord' : 'Playing as a guest'}</p>
              <h2 className="truncate text-base font-black">{p?.displayName ?? '…'}</h2>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-11 shrink-0 rounded-full border border-white/20 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80 hover:bg-white/10"
          >
            Back
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4 text-sm">
          {notice && <p className="rounded-xl border border-amber-200/30 bg-amber-200/10 px-3 py-2 text-amber-50">{notice}</p>}

          {!signedIn && (
            <div className="flex flex-col gap-2">
              <p className="text-white/70">
                Everything in the room works as a guest. Your scores are saved to this browser. Sign in with Discord to keep them on any device and get your roles in the
                Nostalgia Game Room server.
              </p>
              {canSignIn ? (
                <a
                  href={signInUrl()}
                  onClick={() => sound.playButtonClick()}
                  className="flex min-h-11 items-center justify-center rounded-xl bg-[#5865F2] px-4 text-sm font-bold text-white hover:bg-[#4752c4]"
                >
                  Sign in with Discord
                </a>
              ) : (
                <p className="text-[12px] text-white/45">Discord sign-in isn't switched on for this server yet.</p>
              )}
            </div>
          )}

          {signedIn && discord?.membership && <p className="text-[13px] text-white/75">{MEMBERSHIP[discord.membership]}</p>}

          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Your generation</p>
            <p className="text-[12px] text-white/50">Pick the one you feel part of. It's a badge, not an age check, and you can change it.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {GENERATIONS.map(g => {
                const on = p?.generation === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    disabled={busy || !p}
                    aria-pressed={on}
                    onClick={async () => {
                      sound.playButtonClick();
                      setBusy(true);
                      await chooseGeneration(on ? null : g.key);
                      setBusy(false);
                    }}
                    className={`flex min-h-11 flex-col items-start rounded-xl border px-3 py-1.5 text-left disabled:opacity-50 ${
                      on ? 'border-amber-200/80 bg-amber-200/15' : 'border-white/15 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-[13px] font-bold">
                      {g.emoji} {g.name}
                    </span>
                    <span className="text-[10px] text-white/45">{'years' in g ? g.years : ''}</span>
                  </button>
                );
              })}
            </div>
            {p?.generation && <p className="text-[11px] italic text-white/50">{byKey.get(p.generation)?.meaning}</p>}
            {!signedIn && p?.generation && <p className="text-[11px] text-white/40">Sign in with Discord to wear it in the server too.</p>}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Roles earned · {earned.length}</p>
            {earned.length === 0 && <p className="text-[12px] text-white/45">None yet. Win a board game, clear the helicopter rings, or beat Minesweeper on Expert.</p>}
            <ul className="flex flex-col gap-1">
              {earned.map(r => {
                const sync = signedIn ? syncOf(r.key) : undefined;
                return (
                  <li key={r.key} className="flex items-center gap-2 rounded-lg px-1 py-1">
                    <span aria-hidden>{r.emoji}</span>
                    <span className="flex-1 truncate text-[13px] font-bold">{r.name}</span>
                    <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: ('color' in r && r.color) || RARITY[r.rarity] }}>
                      {r.rarity}
                    </span>
                    {sync && (
                      <span className="w-14 text-right text-[10px] text-white/40" title={sync === 'failed' ? 'Discord turned it down; staff can retry' : undefined}>
                        {sync === 'synced' ? 'in Discord' : sync === 'pending' ? 'sending…' : 'not sent'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {p && (
            <p className="text-[11px] leading-relaxed text-white/35">
              {p.visits} visit{p.visits === 1 ? '' : 's'} · since {new Date(p.firstSeen).toLocaleDateString()}. The room keeps your scores, roles, generation and language
              {signedIn ? ' with your Discord id, name and avatar' : ''}, nothing else.
            </p>
          )}

          {signedIn && (
            <button
              type="button"
              onClick={async () => {
                sound.playButtonClick();
                setBusy(true);
                await signOut();
                setDiscord(null);
                setBusy(false);
              }}
              className="min-h-11 rounded-xl border border-white/20 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 hover:bg-white/10"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
