import { audio } from './noise';

/**
 * Room speakers. Borrowed from the Dark Night Theater's screen audio: each
 * sound source in the room (the TV, the boombox playing the room music, the
 * PC) gets an HRTF panner at the object, and the camera is the listener, so
 * the sound comes from the thing wherever you stand or look, with a touch of
 * bedroom behind it.
 *
 * The theater ran its own distance curve on top of the panner's, which is why
 * it got so quiet walking away. This room is a few metres across, so there is
 * one gentle linear curve: across the room is about 2 dB down, enough to notice
 * which way the sound is coming from and never enough to reach for the remote.
 *
 * The TV also gets a leveller with makeup gain (shows on archive.org were
 * mastered all over the place) and a volume that goes past full, which the
 * <video> element alone can't do.
 */

export type SpeakerId = 'tv' | 'boombox' | 'pc' | 'furby' | 'poochi';

/** TV volume tops out here: 1 is the set's old full volume, the rest is boost. */
export const TV_MAX_VOLUME = 2;

/** Full level inside REF metres; MIN_GAIN at FAR and beyond. */
const REF = 1.2;
const FAR = 6.5;
const MIN_GAIN = 0.78;

interface SpeakerSpec {
  /** Compressor + makeup that brings quiet material up. */
  level?: { threshold: number; ratio: number; makeup: number };
  /** Starting volume, 0..TV_MAX_VOLUME. */
  volume: number;
  /** How much the back of the speaker is turned down. */
  backGain: number;
}

const SPECS: Record<SpeakerId, SpeakerSpec> = {
  tv: { level: { threshold: -28, ratio: 4, makeup: 1.5 }, volume: 0.8, backGain: 0.8 },
  // The music is already mastered; it only needs placing.
  boombox: { volume: 1, backGain: 0.85 },
  // A beige tower's little speakers: loud system sounds and quiet MIDI alike.
  pc: { level: { threshold: -24, ratio: 3, makeup: 1.3 }, volume: 1, backGain: 0.75 },
  // Toys babble in every direction, so the cone barely narrows — you still hear
  // which corner the Furby is chattering from as you turn.
  furby: { volume: 1, backGain: 0.92 },
  poochi: { volume: 1, backGain: 0.92 },
};

interface Speaker {
  input: GainNode;
  volume: GainNode;
  panner: PannerNode;
}

interface Room {
  ctx: AudioContext;
  out: AudioNode;
  speakers: Partial<Record<SpeakerId, Speaker>>;
}

let room: Room | null = null;

/** Small, dark impulse response: a bedroom with carpet, not a hall. */
function roomImpulse(ctx: AudioContext) {
  const seconds = 0.45;
  const length = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
  }
  return ir;
}

function buildRoom(ctx: AudioContext): Room {
  const out = ctx.createGain();
  const dry = ctx.createGain();
  dry.gain.value = 1;
  const verb = ctx.createConvolver();
  verb.buffer = roomImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.08;
  out.connect(dry).connect(ctx.destination);
  out.connect(verb).connect(wet).connect(ctx.destination);
  return { ctx, out, speakers: {} };
}

function buildSpeaker(r: Room, id: SpeakerId): Speaker {
  const { ctx } = r;
  const spec = SPECS[id];
  const input = ctx.createGain();
  let chain: AudioNode = input;

  if (spec.level) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = spec.level.threshold;
    comp.knee.value = 14;
    comp.ratio.value = spec.level.ratio;
    comp.attack.value = 0.012;
    comp.release.value = 0.35;
    const makeup = ctx.createGain();
    makeup.gain.value = spec.level.makeup;
    chain = chain.connect(comp).connect(makeup);
  }

  const volume = ctx.createGain();
  volume.gain.value = spec.volume;

  // Boost can push past 0 dBFS; this catches the peaks instead of clipping.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;

  const panner = ctx.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'linear';
  panner.refDistance = REF;
  panner.maxDistance = FAR;
  panner.rolloffFactor = 1 - MIN_GAIN;
  panner.coneInnerAngle = 200;
  panner.coneOuterAngle = 330;
  panner.coneOuterGain = spec.backGain;

  chain.connect(volume).connect(limiter).connect(panner).connect(r.out);
  return { input, volume, panner };
}

function speaker(id: SpeakerId): Speaker | null {
  const ctx = audio();
  if (!ctx) return null;
  if (!room || room.ctx !== ctx) room = buildRoom(ctx);
  return (room.speakers[id] ??= buildSpeaker(room, id));
}

/** Where a source's sound goes in. Null when the browser has no Web Audio. */
export function speakerInput(id: SpeakerId): AudioNode | null {
  return speaker(id)?.input ?? null;
}

/** True once the context can actually play; routing into a suspended one is silence. */
export function speakersRunning() {
  return audio()?.state === 'running';
}

/** Volume for one speaker, 0..TV_MAX_VOLUME (1 is plain full volume). */
export function setSpeakerVolume(id: SpeakerId, v: number) {
  const s = speaker(id);
  if (!s || !room) return;
  s.volume.gain.setTargetAtTime(Math.max(0, Math.min(TV_MAX_VOLUME, v)), room.ctx.currentTime, 0.03);
}

const routed = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

/**
 * Send a <video>/<audio> through a speaker. Same-origin files, or cross-origin
 * ones loaded with crossOrigin="anonymous" that the server allowed; anything
 * else would come out silent, so callers only route media they know is clean.
 * The element's own volume still applies on the way in (the room music fades
 * that way); the TV keeps it at 1 so its speaker volume can boost past full.
 * Returns false if it plays straight instead.
 */
export function routeToSpeaker(el: HTMLMediaElement, id: SpeakerId): boolean {
  if (routed.has(el)) return true;
  const ctx = audio();
  const input = speakerInput(id);
  if (!ctx || !input || ctx.state !== 'running') return false;
  try {
    const src = ctx.createMediaElementSource(el);
    src.connect(input);
    routed.set(el, src);
    return true;
  } catch {
    return false;
  }
}

/**
 * routeToSpeaker, or as soon as the audio context is running if it's still
 * waiting on the first tap. `then` runs once routed.
 */
export function routeWhenReady(el: HTMLMediaElement, id: SpeakerId, then?: () => void) {
  if (routeToSpeaker(el, id)) {
    then?.();
    return;
  }
  const ctx = audio();
  if (!ctx || ctx.state === 'closed') return;
  const retry = () => {
    if (ctx.state !== 'running') return;
    ctx.removeEventListener('statechange', retry);
    if (el.isConnected && routeToSpeaker(el, id)) then?.();
  };
  ctx.addEventListener('statechange', retry);
}

/** For media elements being thrown away, so the graph doesn't keep them alive. */
export function unroute(el: HTMLMediaElement) {
  routed.get(el)?.disconnect();
  routed.delete(el);
}

export function isRouted(el: HTMLMediaElement | null | undefined) {
  return Boolean(el && routed.has(el));
}

interface Vec {
  x: number;
  y: number;
  z: number;
}

/** Where the ears are this frame (the camera): position, facing and up, in world space. */
export interface Ears {
  at: Vec;
  forward: Vec;
  up: Vec;
}

const distances: Partial<Record<SpeakerId, number>> = {};

/** Metres from the ears to a speaker, as of its anchor's last frame; null before the first. */
export function speakerDistance(id: SpeakerId): number | null {
  return distances[id] ?? null;
}

/**
 * Once a frame from each anchor: move the listener to the camera and the
 * speaker to `spot`, facing `face`. Plain numbers so the sound engine can
 * import this without pulling three.js along.
 */
export function placeSpeaker(id: SpeakerId, ears: Ears, spot: Vec, face: Vec) {
  distances[id] = Math.hypot(spot.x - ears.at.x, spot.y - ears.at.y, spot.z - ears.at.z);
  if (!room) return;
  const s = room.speakers[id];
  const { ctx } = room;
  const listener = ctx.listener;
  const { at: ear, forward: fwd, up } = ears;
  const t = ctx.currentTime;
  const ramp = 0.04;
  if (listener.positionX) {
    listener.positionX.setTargetAtTime(ear.x, t, ramp);
    listener.positionY.setTargetAtTime(ear.y, t, ramp);
    listener.positionZ.setTargetAtTime(ear.z, t, ramp);
    listener.forwardX.setTargetAtTime(fwd.x, t, ramp);
    listener.forwardY.setTargetAtTime(fwd.y, t, ramp);
    listener.forwardZ.setTargetAtTime(fwd.z, t, ramp);
    listener.upX.setTargetAtTime(up.x, t, ramp);
    listener.upY.setTargetAtTime(up.y, t, ramp);
    listener.upZ.setTargetAtTime(up.z, t, ramp);
  } else {
    // Firefox before AudioParam listeners
    listener.setPosition(ear.x, ear.y, ear.z);
    listener.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
  }
  if (!s) return;
  const { panner } = s;
  if (panner.positionX) {
    panner.positionX.setTargetAtTime(spot.x, t, ramp);
    panner.positionY.setTargetAtTime(spot.y, t, ramp);
    panner.positionZ.setTargetAtTime(spot.z, t, ramp);
    panner.orientationX.setTargetAtTime(face.x, t, ramp);
    panner.orientationY.setTargetAtTime(face.y, t, ramp);
    panner.orientationZ.setTargetAtTime(face.z, t, ramp);
  } else {
    panner.setPosition(spot.x, spot.y, spot.z);
    panner.setOrientation(face.x, face.y, face.z);
  }
}
