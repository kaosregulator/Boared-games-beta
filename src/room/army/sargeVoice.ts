/**
 * Sarge's voice, in memory of R. Lee Ermey (1944-2018), the voice of the
 * green army men's sergeant. The user's two recordings of him are cut by
 * scripts/split-sarge-audio.py into one sprite
 * (public/audio/sarge/sarge.mp3 + sarge.json), every line with its words
 * and the moments it fits:
 *
 *   lesson    the sergeant's training talk when you first shrink down
 *   wave      a wave of tan soldiers stepping out
 *   start     the start of a round (the first wave, a new siege)
 *   end       a wave cleared, the town saved, a ceasefire
 *   combat    now and then while the shooting's on
 *   hurt      you get knocked over, or take a tumble
 *   explore   now and then while you walk around the room
 *   bail      jumping out of the chopper and leaving it to fly itself down
 *   fall      off the shelf (or out of the chopper), on the way to the chute
 *   land      touching down under the chute
 *
 * Each moment is its own shuffled deck: every line plays once before any
 * line plays twice.
 */

export type SargeTag = 'lesson' | 'wave' | 'start' | 'end' | 'combat' | 'hurt' | 'explore' | 'fall' | 'bail' | 'land';

export interface SargeClip {
  id: string;
  tags: SargeTag[];
  start: number;
  dur: number;
  /** The words, for the speech bubble. Empty for a grunt. */
  text: string;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let buffer: AudioBuffer | null = null;
let clips: SargeClip[] = [];
let loading: Promise<void> | null = null;
let playing: { src: AudioBufferSourceNode; gain: GainNode; until: number } | null = null;
const decks = new Map<SargeTag, SargeClip[]>();

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

/** Every clip that fits this moment, in the order they were recorded. */
export function sargeLines(tag: SargeTag) {
  return clips.filter(c => c.tags.includes(tag));
}

/** True once the voice has loaded and the moment has lines. */
export function sargeHas(tag: SargeTag) {
  return buffer !== null && clips.some(c => c.tags.includes(tag));
}

/** Deal the next line for a moment from its shuffled deck, refilling it once it runs out. */
export function dealLine(tag: SargeTag, rand = Math.random) {
  let deck = decks.get(tag);
  if (!deck || deck.length === 0) {
    deck = sargeLines(tag);
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

/**
 * Sarge says a line for this moment. Returns the clip (its words go in the
 * bubble) or null when the voice isn't loaded or he's already talking and
 * `cut` isn't set.
 */
export function sargeSay(tag: SargeTag, opts: { cut?: boolean; volume?: number } = {}): SargeClip | null {
  void loadSarge();
  const ac = audio();
  if (!ac || !buffer || !master) return null;
  if (sargeBusy() && !opts.cut) return null;
  const clip = dealLine(tag);
  if (!clip) return null;
  return sargePlay(clip, opts.volume);
}

/** Play this exact line (the lesson goes through his in order). */
export function sargePlay(clip: SargeClip, volume = 1): SargeClip | null {
  void loadSarge();
  const ac = audio();
  if (!ac || !buffer || !master) return null;
  sargeStop();
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(master);
  const at = ac.currentTime + 0.02;
  src.start(at, clip.start, clip.dur);
  playing = { src, gain, until: at + clip.dur };
  return clip;
}

export function sargeStop() {
  if (!playing || !ctx) return;
  const t = ctx.currentTime;
  playing.gain.gain.setTargetAtTime(0, t, 0.03);
  playing.src.stop(t + 0.15);
  playing = null;
}

/** For tests: load an index without the network. */
export function setSargeClips(list: SargeClip[]) {
  clips = list;
  decks.clear();
}
