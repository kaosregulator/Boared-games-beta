import { audio } from '../../tv/noise';
import { speakerInput } from '../../tv/surround';
import type { Kind } from './game';

/**
 * Sandwich Stacker's own sounds and theme (public/sandwich/sfx, from the
 * original game), out of the PC's spot in the room's surround: the game is
 * on the desk right in front of it.
 */
const GROUPS = {
  meat: 7,
  vegetable: 2,
  condiment: 2,
  icky: 3,
  bleh: 3,
  eat: 4,
  toaster: 3,
  woosh: 0,
  thud: 0,
  click: 0,
  bell: 0,
} as const;
type Group = keyof typeof GROUPS;

const VOLUME: Partial<Record<Group, number>> = { bleh: 0.45, condiment: 0.77, woosh: 0.6, click: 0.6 };

const buffers = new Map<string, AudioBuffer>();
let loading: Promise<void> | null = null;
let music: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let out: GainNode | null = null;

function files() {
  const names: string[] = ['theme'];
  for (const [g, n] of Object.entries(GROUPS)) {
    if (n === 0) names.push(g);
    else for (let i = 1; i <= n; i += 1) names.push(`${g}${i}`);
  }
  return names;
}

function output(ctx: AudioContext) {
  if (!out) {
    out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(speakerInput('pc') ?? ctx.destination);
  }
  return out;
}

export function loadSandwichSounds() {
  const ctx = audio();
  if (!ctx || loading) return loading;
  loading = Promise.all(
    files().map(async name => {
      try {
        const res = await fetch(`/sandwich/sfx/${name}.mp3`);
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        buffers.set(name, buf);
      } catch {
        // a missing sound is just silence
      }
    }),
  ).then(() => undefined);
  return loading;
}

export function sfx(group: Group, opts: { rate?: number; volume?: number } = {}) {
  const ctx = audio();
  if (!ctx) return;
  const n = GROUPS[group];
  const name = n === 0 ? group : `${group}${1 + Math.floor(Math.random() * n)}`;
  const buf = buffers.get(name);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const vary = group === 'icky' || group === 'condiment' || group === 'vegetable' || group === 'meat';
  src.playbackRate.value = (opts.rate ?? 1) + (vary ? (Math.random() - 0.5) * 0.2 : 0);
  const gain = ctx.createGain();
  gain.gain.value = opts.volume ?? VOLUME[group] ?? 1;
  src.connect(gain).connect(output(ctx));
  src.start();
}

/** Ingredient.OnCollisionEnter2D's sound for each kind. */
export function landSound(kind: Kind) {
  if (kind === 'mustard' || kind === 'mayo') sfx('condiment');
  else if (kind === 'pepper' || kind === 'pickles' || kind === 'bacon') sfx('vegetable');
  else sfx('meat');
}

export function startMusic() {
  const ctx = audio();
  if (!ctx || music) return;
  const play = () => {
    const buf = buffers.get('theme');
    if (!buf || music) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 1.2);
    src.connect(gain).connect(output(ctx));
    src.start();
    music = { src, gain };
  };
  if (buffers.has('theme')) play();
  else void loadSandwichSounds()?.then(play);
}

export function stopMusic() {
  const ctx = audio();
  if (!ctx || !music) return;
  const { src, gain } = music;
  music = null;
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
  src.stop(ctx.currentTime + 0.55);
}

export function duckMusic(on: boolean) {
  const ctx = audio();
  if (!ctx || !music) return;
  music.gain.gain.setTargetAtTime(on ? 0.08 : 0.32, ctx.currentTime, 0.15);
}
