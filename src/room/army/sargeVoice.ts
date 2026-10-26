/**
 * Sarge's voice, in memory of R. Lee Ermey (1944-2018), the voice of the
 * green army men's sergeant. The user's two recordings of him are cut by
 * scripts/split-sarge-audio.py into one sprite
 * (public/audio/sarge/sarge.mp3 + sarge.json), every line with its words
 * and the moments it fits:
 *
 *   intro       his talk when you first shrink down (INTRO, in that order)
 *   start       the first wave, a new siege
 *   again       going again after the town's saved
 *   wave        a wave of tan soldiers stepping out
 *   combat      now and then while the shooting's on
 *   miss        you fire and hit nothing
 *   shot        a tan soldier tips you over
 *   good        you topple one, now and then
 *   cleared     a wave cleared
 *   win         the town saved, a ceasefire
 *   buddy       one of the green men gets knocked flat and Sarge has words for him
 *   grunt, oof  no words: in front of a line when you step off, land or get hit
 *   fall        off the shelf, on the way to the chute
 *   hardland    a long drop without the chute
 *   bail        jumping out of the chopper and leaving it to fly itself down
 *   chute       now and then while you fly the canopy
 *   land        touching down under the chute
 *   heli        now and then while you fly the chopper
 *   explore     now and then while you walk around the room
 *   duck-*      the shelf duck range: the story (DUCK_STORY), a round
 *               starting, a hit, a miss, a perfect round, losing
 *
 * Each moment is its own shuffled deck: every line plays once before any
 * line plays twice. Some deck entries are two lines that go together, like
 * "...Yes, sir!" into the Code Red order. Only one line plays at a time, and
 * after each one he goes quiet for a while unless the moment can't wait.
 */

export type SargeTag =
  | 'intro'
  | 'start'
  | 'again'
  | 'wave'
  | 'combat'
  | 'miss'
  | 'shot'
  | 'good'
  | 'cleared'
  | 'win'
  | 'buddy'
  | 'grunt'
  | 'oof'
  | 'fall'
  | 'hardland'
  | 'bail'
  | 'chute'
  | 'land'
  | 'heli'
  | 'explore'
  | 'duck-story'
  | 'duck-start'
  | 'duck-hit'
  | 'duck-miss'
  | 'duck-perfect'
  | 'duck-over';

export interface SargeClip {
  id: string;
  tags: SargeTag[];
  start: number;
  dur: number;
  /** The words, for the speech bubble. Empty for a grunt. */
  text: string;
}

/** What he's saying: one clip or a few run together. */
export interface SargeLine {
  clips: SargeClip[];
  /** The words of all of it, for the bubble. */
  text: string;
  /** Seconds until he's done. */
  dur: number;
}

/** His shrink-down talk, in order: one line per step card. */
export const INTRO = ['freak-out', 'deployed', 'sound-off', 'roll-call', 'good-luck'];

/** The duck story on the shelf, in order: one line per bubble. */
export const DUCK_STORY = ['situation', 'stealth', 'we-can-help', 'hit-target'];

/** Lines that play back to back, as one entry in a moment's deck. */
export const COMBOS: Partial<Record<SargeTag, string[][]>> = {
  bail: [['yes-sir', 'code-red']],
  wave: [['situation', 'move-move-move']],
  explore: [
    ['spotlights-trucks', 'alarm'],
    ['we-can-help', 'free-em'],
    ['stealth', 'watch-spotlights'],
  ],
};

/** Gap between two lines run together, seconds. */
const JOIN = 0.12;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let buffer: AudioBuffer | null = null;
let clips: SargeClip[] = [];
let loading: Promise<void> | null = null;
let playing: { srcs: AudioBufferSourceNode[]; gain: GainNode; until: number } | null = null;
/** Audio-clock time his last line ends. */
let lastEnd = -Infinity;
const decks = new Map<SargeTag, SargeClip[][]>();
const cools = new Map<SargeTag, number>();

function audio() {
  if (!ctx && typeof window !== 'undefined') {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  if (ctx?.state === 'suspended') void ctx.resume();
  return ctx;
}

export function loadSarge() {
  if (loading) return loading;
  const ac = audio();
  if (!ac) return Promise.resolve();
  loading = Promise.all([
    fetch('/audio/sarge/sarge.json').then(r => r.json() as Promise<{ clips: SargeClip[] }>),
    fetch('/audio/sarge/sarge.mp3')
      .then(r => r.arrayBuffer())
      .then(bytes => ac.decodeAudioData(bytes)),
  ])
    .then(([index, decoded]) => {
      clips = index.clips;
      buffer = decoded;
    })
    .catch(() => {
      // No voice: the bubbles still say their lines.
      loading = null;
    });
  return loading;
}

/** True once the voice has loaded. */
export function sargeReady() {
  return buffer !== null && clips.length > 0;
}

export function sargeClip(id: string) {
  return clips.find(c => c.id === id) ?? null;
}

/** These clips, in this order, skipping any that aren't there. */
export function sargeClips(ids: readonly string[]) {
  return ids.map(sargeClip).filter((c): c is SargeClip => c !== null);
}

/** Every clip that fits this moment, in the order they were recorded. */
export function sargeLines(tag: SargeTag) {
  return clips.filter(c => c.tags.includes(tag));
}

/** A moment's deck before shuffling: its lines on their own, and the pairs that go together. */
export function sargeEntries(tag: SargeTag): SargeClip[][] {
  const combos = (COMBOS[tag] ?? []).map(sargeClips).filter(e => e.length > 0);
  const paired = new Set(combos.flat().map(c => c.id));
  return [...sargeLines(tag).filter(c => !paired.has(c.id)).map(c => [c]), ...combos];
}

/** Deal the next entry for a moment from its shuffled deck, refilling it once it runs out. */
export function dealLine(tag: SargeTag, rand = Math.random) {
  let deck = decks.get(tag);
  if (!deck || deck.length === 0) {
    deck = sargeEntries(tag);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    decks.set(tag, deck);
  }
  return deck.pop() ?? null;
}

/** True while Sarge is mid-line: the next one waits rather than talking over him. */
export function sargeBusy() {
  return Boolean(playing && ctx && ctx.currentTime < playing.until);
}

/** Seconds since his last line finished (Infinity before the first). */
export function sargeQuietFor() {
  if (!ctx) return Infinity;
  return ctx.currentTime - lastEnd;
}

export interface SayOpts {
  /** Cut off whatever he's saying. For the moments that can't wait: a jump, a landing. */
  cut?: boolean;
  /** Seconds of quiet he needs since his last line first. Ignored with `cut`. Default 4. */
  quiet?: number;
  /** Seconds before this moment can have another line. */
  cool?: number;
  /** Odds of saying anything at all, 0..1. */
  chance?: number;
  /** A grunt or an oof in front of the line. */
  lead?: 'grunt' | 'oof';
  /** A grunt or an oof and nothing else, this often (0..1). Needs `lead`. */
  leadOnly?: number;
  volume?: number;
}

/**
 * Sarge says a line for this moment. Returns what he's saying (its words go
 * in the bubble), or null when the voice isn't loaded, he's not done with
 * the last line, the moment is cooling down, or the dice said no.
 */
export function sargeSay(tag: SargeTag, opts: SayOpts = {}): SargeLine | null {
  void loadSarge();
  const ac = audio();
  if (!ac || !buffer || !master) return null;
  const now = ac.currentTime;
  if (!opts.cut && (sargeBusy() || now - lastEnd < (opts.quiet ?? 4))) return null;
  if ((cools.get(tag) ?? -Infinity) > now) return null;
  if (opts.chance !== undefined && Math.random() >= opts.chance) return null;
  const lead = opts.lead ? dealLine(opts.lead) : null;
  const only = lead && opts.leadOnly !== undefined && Math.random() < opts.leadOnly;
  const entry = only ? [] : dealLine(tag);
  if (!entry) return null;
  const seq = [...(lead ?? []), ...entry];
  if (seq.length === 0) return null;
  if (opts.cool) cools.set(tag, now + opts.cool);
  return sargeSeq(seq, opts.volume);
}

/** Play these clips back to back (the intro and the duck story go through his in order). */
export function sargeSeq(seq: readonly SargeClip[], volume = 1): SargeLine | null {
  void loadSarge();
  const ac = audio();
  if (!ac || !buffer || !master || seq.length === 0) return null;
  sargeStop();
  const gain = ac.createGain();
  gain.gain.value = volume;
  gain.connect(master);
  const t0 = ac.currentTime + 0.02;
  let at = t0;
  const srcs = seq.map(c => {
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.connect(gain);
    src.start(at, c.start, c.dur);
    at += c.dur + JOIN;
    return src;
  });
  const until = at - JOIN;
  playing = { srcs, gain, until };
  lastEnd = until;
  return { clips: [...seq], text: seq.map(c => c.text).filter(Boolean).join(' '), dur: until - ac.currentTime };
}

export function sargePlay(clip: SargeClip, volume = 1) {
  return sargeSeq([clip], volume);
}

export function sargeStop() {
  if (!playing || !ctx) return;
  const t = ctx.currentTime;
  playing.gain.gain.setTargetAtTime(0, t, 0.03);
  for (const src of playing.srcs) {
    try {
      src.stop(t + 0.15);
    } catch {
      // never started
    }
  }
  // Cut short: the quiet starts now, not when the line would have ended.
  lastEnd = Math.min(lastEnd, t);
  playing = null;
}

/** For tests: load an index without the network. */
export function setSargeClips(list: SargeClip[]) {
  clips = list;
  decks.clear();
  cools.clear();
}
