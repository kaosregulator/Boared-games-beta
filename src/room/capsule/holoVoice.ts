import { useSyncExternalStore } from 'react';
import { sound } from '../../utils/audio';

/**
 * The hologram voice: a time capsule read aloud like an old recorded
 * transmission. Each voice is made ahead of time (scripts/voice), the card's
 * own words run through a radio filter, echo and static, so the room only
 * plays a small file. Which voice reads is picked in the menu, under Sound.
 */

export type VoiceId = 'transmission' | 'message' | 'computer';

export const VOICES: { id: VoiceId; name: string; blurb: string }[] = [
  { id: 'transmission', name: 'Old Transmission', blurb: 'An older man, calm and a little mysterious, over a crackly radio' },
  { id: 'message', name: 'Hologram Message', blurb: 'A recorded plea from far away, flickering in and out' },
  { id: 'computer', name: 'Ship Computer', blurb: 'The starship talking, crisp and a little robotic' },
];

const KEY = 'holo-voice';
const BEEPS_KEY = 'holo-beeps';
const listeners = new Set<() => void>();

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode: it just won't stick */
  }
}

let voice: VoiceId | 'off' = (() => {
  if (typeof window === 'undefined') return 'transmission';
  const v = read(KEY);
  return v === 'off' || VOICES.some(x => x.id === v) ? (v as VoiceId | 'off') : 'transmission';
})();
let beeps = typeof window === 'undefined' ? true : read(BEEPS_KEY) !== '0';

const emit = () => listeners.forEach(fn => fn());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export function setHoloVoice(v: VoiceId | 'off') {
  voice = v;
  write(KEY, v);
  emit();
}
export function setHoloBeeps(on: boolean) {
  beeps = on;
  write(BEEPS_KEY, on ? '1' : '0');
  emit();
}
export const useHoloVoice = () => useSyncExternalStore(subscribe, () => voice, () => voice);
export const useHoloBeeps = () => useSyncExternalStore(subscribe, () => beeps, () => beeps);

/** Which cards have a voice file, per voice (public/voice/manifest.json). */
type Manifest = Record<string, Record<string, { file: string; seconds: number; hash: string }>>;
let manifest: Manifest | null = null;
let loading: Promise<Manifest | null> | null = null;

export function loadVoiceManifest(): Promise<Manifest | null> {
  if (manifest) return Promise.resolve(manifest);
  loading ??= fetch('/voice/manifest.json')
    .then(r => (r.ok ? (r.json() as Promise<Manifest>) : null))
    .catch(() => null)
    .then(m => {
      manifest = m;
      // A failed fetch is tried again by the next card that opens.
      if (!m) loading = null;
      emit();
      return m;
    });
  return loading;
}

/** The voice file for a card, if that voice has read it. */
export function voiceFile(v: VoiceId | 'off', key: string) {
  if (v === 'off' || !manifest) return null;
  const entry = manifest[v]?.[key];
  // The hash in the URL, so a re-recorded card is fetched fresh.
  return entry ? `/voice/${v}/${entry.file}?v=${entry.hash}` : null;
}
export const useVoiceManifest = () => useSyncExternalStore(subscribe, () => manifest, () => null);

let ctx: AudioContext | null = null;

/**
 * The little burst of beeps when a capsule opens: a few quick chirps, like an
 * old droid saying hello, made on the spot so there's nothing to download.
 */
export function playOpenBeeps() {
  if (!beeps || sound.isMuted() || typeof window === 'undefined') return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + 0.02;
    const out = ctx.createGain();
    out.gain.value = 0.11;
    out.connect(ctx.destination);
    const chirps = 4 + Math.floor(Math.random() * 3);
    let t = t0;
    for (let i = 0; i < chirps; i++) {
      const len = 0.045 + Math.random() * 0.07;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 3 === 2 ? 'triangle' : 'sine';
      const f0 = 900 + Math.random() * 1700;
      const f1 = f0 * (0.6 + Math.random() * 0.9);
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f1, t + len);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + len + 0.02);
      t += len + 0.012 + Math.random() * 0.03;
    }
  } catch {
    /* no audio: no beeps */
  }
}
