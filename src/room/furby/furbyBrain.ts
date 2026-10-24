import * as THREE from 'three';
import type { FurbyRig } from './furbyRig';
import { chomp, motorPlan, motorPlay, mouth, speak, voiceOver, voiceTime, type FurbyTag, type Voice } from './furbyAudio';

/**
 * How a 1998 Furby behaves, as a little state machine per toy. It reads
 * like the real firmware's sensor list: a back switch (petting), a tummy
 * switch (tickling), the tongue (feeding), a tilt/invert switch (flipped or
 * shaken), a light sensor (lights out means bedtime), plus a hunger counter
 * that runs down while it's awake. Every response says something in
 * Furbish, with the English in the speech bubble, and plays a real 1998 Furby
 * sound (the user's recordings plus the named CD-ROM sound pack).
 */

export type FurbyAction =
  | 'hello'
  | 'pet'
  | 'tickle'
  | 'feed'
  | 'hug'
  | 'flip'
  | 'shake'
  | 'sleep'
  | 'wake'
  | 'sing'
  | 'chat'
  | 'dance'
  | 'hungry'
  | 'achoo'
  | 'putdown';

export interface Pose {
  lean: number;
  sway: number;
  nod: number;
  turn: number;
  earL: number;
  earR: number;
  jaw: number;
  lid: number;
  squint: number;
  lookX: number;
  lookY: number;
  hop: number;
  squash: number;
}

const REST: Pose = { lean: 0, sway: 0, nod: 0, turn: 0, earL: 0.62, earR: 0.62, jaw: 0, lid: 0, squint: 0, lookX: 0, lookY: 0, hop: 0, squash: 1 };

type Line = [furbish: string, english: string];

const LINES: Record<FurbyAction | 'grumpy' | 'dark' | 'burp' | 'full', Line[]> = {
  hello: [
    ['Wah! Kah toh-loo u-nye!', 'Yay! Me like you!'],
    ['Doo? U-nye?', 'Who? You?'],
    ['E-day! Dah noo-loo!', 'Good! Big happy!'],
    ['Dah a-loh!', 'Big light!'],
  ],
  pet: [
    ['Kah may-may u-nye.', 'Me love you.'],
    ['Ooh… kah noo-loo.', 'Ooh… me happy.'],
    ['Koh-koh! Doo-moh!', 'Again! Please!'],
    ['E-day, e-day.', 'Good, good.'],
  ],
  tickle: [
    ['Hee hee! Nah-bah! Nah-bah!', 'Hee hee! No! No!'],
    ['Wah! Dah toh-loo!', 'Yay! Big fun!'],
    ['Kah dah… hee hee hee!', 'Me big… hee hee hee!'],
  ],
  feed: [
    ['Yum! Kah a-tay!', 'Yum! Me hungry!'],
    ['Mmm, koh-koh!', 'Mmm, more!'],
    ['E-day! Yum yum!', 'Good! Yum yum!'],
  ],
  full: [['Kah dah… nah-bah koh-koh.', 'Me full… no more.']],
  burp: [
    ['…urrp! Hee hee.', '…burp! Hee hee.'],
    ['Kah boh-bay…', 'Me no feel good…'],
  ],
  hug: [
    ['May-lah! Kah may-may u-nye!', 'Hug! Me love you!'],
    ['Dah may-lah!', 'Big hug!'],
    ['U-nye may-may kah?', 'You love me?'],
  ],
  flip: [
    ['Whee! Doo?!', 'Whee! What?!'],
    ['Uh-oh! Kah boh-bay!', 'Uh oh! Me scared!'],
    ['Dah boh-bay! Doo-moh!', 'Very scared! Please!'],
  ],
  shake: [
    ['Wheee!', 'Wheee!'],
    ['Doo-ay! Dah boh-bay!', 'Hey! Big scared!'],
  ],
  sleep: [
    ['Kah way-loh…', 'Me sleep…'],
    ['Ooh… dah way-loh…', 'Ooh… big sleep…'],
  ],
  wake: [
    ['Doo? Kah way-loh…', 'Huh? Me was sleeping…'],
    ['E-day a-loh!', 'Good morning!'],
  ],
  grumpy: [['Kah way-loh! Nah-bah!', 'Me sleeping! No!']],
  dark: [['Doo? Dah a-loh-nah…', 'What? Big dark…']],
  sing: [
    ['Wee-tee kah wah-loh!', 'Me sing!'],
    ['Dah wee-tee!', 'Big song!'],
  ],
  chat: [
    ['U-nye dah toh-loo?', 'You big fun?'],
    ['Doo-moh u-nye noh-lah!', 'Please, you dance!'],
    ['Kah toh-loo u-nye.', 'Me like you.'],
    ['Doo? U-nye wee-tee?', 'What? You sing?'],
  ],
  dance: [['Noh-lah! Noh-lah!', 'Dance! Dance!']],
  hungry: [
    ['Kah a-tay! Kah a-tay!', 'Me hungry! Me hungry!'],
    ['Dah a-tay… doo-moh?', 'Very hungry… please?'],
  ],
  achoo: [['A-choo! Kah boh-bay…', 'Achoo! Me sick…']],
  putdown: [
    ['Koh-koh?', 'Again?'],
    ['U-nye-loo-lay-doo?', 'Want to play?'],
  ],
};

// Which sounds each response can use; one is picked at random. The named
// ones (yum, purr, kiss, scared...) are the original toy's own sounds.
const SOUND: Record<string, FurbyTag[]> = {
  hello: ['hello', 'chirp'],
  pet: ['purr', 'happy', 'purr'],
  tickle: ['laugh', 'laugh', 'tickle'],
  feed: ['yum'],
  full: ['yuck'],
  burp: ['burp'],
  hug: ['hug', 'kiss'],
  flip: ['scared', 'whee'],
  shake: ['whee', 'uhoh'],
  sleep: ['yawn', 'night'],
  wake: ['wake', 'hello'],
  grumpy: ['ow', 'uhoh'],
  dark: ['scared', 'uhoh'],
  sing: ['sing'],
  chat: ['talk'],
  dance: ['dance', 'sing'],
  hungry: ['hungry'],
  achoo: ['achoo'],
  putdown: ['sigh', 'chirp'],
};

export interface Bubble {
  furbish: string;
  english: string;
  /** Which Furby is talking. */
  who: string;
  at: number;
}

let bubble: Bubble | null = null;
const bubbleSubs = new Set<(b: Bubble | null) => void>();
export function onBubble(fn: (b: Bubble | null) => void) {
  bubbleSubs.add(fn);
  fn(bubble);
  return () => {
    bubbleSubs.delete(fn);
  };
}
function say(b: Bubble | null) {
  bubble = b;
  bubbleSubs.forEach(fn => fn(b));
}

interface Anim {
  kind: FurbyAction | 'burp' | 'full' | 'grumpy' | 'dark';
  t: number;
  dur: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pickTag = (tags: FurbyTag[] = ['talk']) => tags[Math.floor(Math.random() * tags.length)];
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const bell = (t: number, a: number, b: number) => ease((t - a) / 0.15) * (1 - ease((t - b) / 0.2));

export class FurbyBrain {
  readonly name: string;
  pose: Pose = { ...REST };
  private want: Pose = { ...REST };
  asleep = false;
  /** 1 = just fed, 0 = starving. Above 1 is overfed. */
  hunger = 0.75;
  /** Muted Furbies mime (the dancing Boom, or before the voice loads). */
  voiced = true;
  pitch = 1;
  volume = 1;
  private voice: Voice | null = null;
  private anim: Anim | null = null;
  private blinkAt = rand(1, 3);
  private blinkT = -1;
  private lookAt = 2;
  private look = { x: 0, y: 0 };
  private chatterAt = rand(8, 16);
  private snoreAt = 2;
  private time = 0;
  private chewing = 0;
  private lastChomp = 0;
  private tuft = new THREE.Vector2();
  private tuftV = new THREE.Vector2();
  /** Stops the gearbox sound of the line playing now. */
  private stopMotor: () => void = () => {};
  /** Set from outside each frame. */
  dark = false;
  /** Talk on its own only when someone is around (held, nearby, at the table). */
  attentive = false;
  /** A finger is in its mouth: it chews. */
  finger = false;

  constructor(name: string, opts: { pitch?: number; voiced?: boolean; volume?: number } = {}) {
    this.name = name;
    this.pitch = opts.pitch ?? 1;
    this.voiced = opts.voiced ?? true;
    this.volume = opts.volume ?? 1;
  }

  get busy() {
    return this.anim !== null;
  }

  private speakLine(key: keyof typeof LINES, tag?: FurbyTag, maxDur?: number) {
    const lines = LINES[key];
    const [furbish, english] = lines[Math.floor(Math.random() * lines.length)];
    say({ furbish, english, who: this.name, at: performance.now() });
    this.voice?.stop();
    this.stopMotor();
    this.voice = this.voiced ? speak(tag ?? pickTag(SOUND[key]), { pitch: this.pitch, volume: this.volume, maxDur }) : null;
    // The gearbox runs in bursts through the line, the way the real one's did.
    if (this.voiced) this.stopMotor = motorPlay(this.voice ? this.voice.at : voiceTime() + 0.02, motorPlan(this.voice ? this.voice.clip.dur : 1.2), 0.2 * this.volume);
  }

  /** Something happened to the Furby. Returns false if it ignored it. */
  act(kind: FurbyAction) {
    if (this.asleep && kind !== 'wake' && kind !== 'sleep') {
      // Petting or tickling a sleeping Furby wakes it up, grumpy.
      if (kind === 'pet' || kind === 'tickle' || kind === 'shake' || kind === 'flip' || kind === 'feed' || kind === 'hello') {
        this.asleep = false;
        this.start('grumpy', 2.2);
        this.speakLine('grumpy');
        return true;
      }
      return false;
    }
    if (kind === 'sleep') {
      if (this.asleep) return false;
      this.start('sleep', 3.2);
      this.speakLine('sleep');
      return true;
    }
    if (kind === 'wake') {
      if (!this.asleep) return false;
      this.asleep = false;
      this.start('wake', 2);
      this.speakLine('wake');
      return true;
    }
    if (kind === 'feed') {
      this.hunger += 0.22;
      if (this.hunger > 1.35) {
        this.hunger = 1.1;
        this.start('burp', 2.4);
        this.speakLine('burp');
        return true;
      }
      if (this.hunger > 1.15) {
        this.start('full', 2);
        this.speakLine('full');
        return true;
      }
      this.start('feed', 2.4);
      this.chewing = 2.2;
      this.speakLine('feed');
      return true;
    }
    const dur: Partial<Record<FurbyAction, number>> = {
      hello: 1.8,
      pet: 2.6,
      tickle: 2.8,
      hug: 3,
      flip: 2.2,
      shake: 1.8,
      sing: 6,
      chat: 3.2,
      dance: 6,
      hungry: 2.6,
      achoo: 1.6,
      putdown: 1.4,
    };
    this.start(kind, dur[kind] ?? 2);
    const maxDur = kind === 'chat' ? 5 : kind === 'pet' || kind === 'hug' || kind === 'hungry' ? 4.5 : undefined;
    this.speakLine(kind, undefined, maxDur);
    return true;
  }

  private start(kind: Anim['kind'], dur: number) {
    this.anim = { kind, t: 0, dur };
  }

  /** A Furby in the dark falls asleep; turn the lights on and it wakes up. */
  private senseLight() {
    if (this.dark && !this.asleep && !this.anim) {
      this.start('dark', 1.6);
      this.speakLine('dark');
      globalThis.setTimeout(() => {
        if (this.dark && !this.asleep) this.act('sleep');
      }, 1800);
    }
  }

  update(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05);
    this.time += dt;
    const t = this.time;
    const w = this.want;
    Object.assign(w, REST);

    // Hunger runs down while awake: about four minutes from full to hungry.
    if (!this.asleep) this.hunger = Math.max(0, this.hunger - dt / 300);
    if (this.dark && !this.asleep) this.senseLight();
    else if (!this.dark && this.asleep && !this.anim && Math.random() < dt / 4) this.act('wake');

    // Speech drives the beak; while a clip is still loading it mimes.
    let talk = 0;
    if (this.voice && !voiceOver(this.voice)) talk = mouth(this.voice, this.pitch);
    else if (this.voice) this.voice = null;
    if (!this.voice && this.anim && !this.voiced) talk = Math.max(0, Math.sin(t * 13)) * 0.7 * bell(this.anim.t / this.anim.dur, 0.05, 0.85);

    if (this.asleep) {
      w.lid = 1;
      w.earL = w.earR = 0.12;
      w.lean = 0.12 + Math.sin(t * 1.3) * 0.025;
      w.nod = 0.08;
      if (this.attentive && t > this.snoreAt) {
        this.snoreAt = t + rand(5, 9);
        if (this.voiced) this.voice = speak('snore', { pitch: this.pitch, volume: 0.6 * this.volume });
      }
      talk *= 0.25;
    } else {
      // Blink every few seconds, sometimes twice.
      if (t > this.blinkAt) {
        this.blinkT = 0;
        this.blinkAt = t + (Math.random() < 0.2 ? 0.35 : rand(2.2, 6));
      }
      if (this.blinkT >= 0) {
        this.blinkT += dt;
        w.lid = Math.sin(Math.min(1, this.blinkT / 0.22) * Math.PI);
        if (this.blinkT > 0.22) this.blinkT = -1;
      }
      if (t > this.lookAt) {
        this.lookAt = t + rand(1.5, 4.5);
        this.look = Math.random() < 0.35 ? { x: 0, y: 0 } : { x: rand(-0.9, 0.9), y: rand(-0.4, 0.6) };
      }
      w.lookX = this.look.x;
      w.lookY = this.look.y;
      w.turn = this.look.x * 0.08;
      // Idle breathing and the odd ear flick.
      w.lean = Math.sin(t * 0.9) * 0.02;
      w.earL += Math.sin(t * 0.7) * 0.04 + (Math.sin(t * 2.9) > 0.985 ? -0.3 : 0);
      w.earR += Math.sin(t * 0.8 + 1) * 0.04 + (Math.sin(t * 3.1 + 2) > 0.985 ? -0.3 : 0);
      // Unprompted chatter when someone's around.
      if (this.attentive && !this.anim && t > this.chatterAt) {
        this.chatterAt = t + rand(12, 24);
        this.act(this.hunger < 0.3 ? 'hungry' : Math.random() < 0.6 ? 'chat' : 'hello');
      }
    }

    // While talking the motor runs: ears pump, body rocks, eyes go wide.
    if (talk > 0.05 && !this.asleep) {
      w.earL += Math.sin(t * 5) * 0.2;
      w.earR += Math.sin(t * 5) * 0.2;
      w.lean += Math.sin(t * 2.6) * 0.06;
      w.lid = Math.min(w.lid, 0);
    }
    w.jaw = talk;

    const a = this.anim;
    if (a) {
      a.t += dt;
      const k = a.t / a.dur;
      const on = bell(k, 0, 0.9);
      switch (a.kind) {
        case 'hello':
        case 'wake':
        case 'putdown':
          w.earL = w.earR = 0.95;
          w.lean -= 0.12 * on;
          w.hop = Math.max(0, Math.sin(k * Math.PI * 2)) * 0.02 * on;
          break;
        case 'pet':
          // Leans into the hand, eyes half shut, ears down and happy.
          w.squint = 0.8 * on;
          w.lid = Math.max(w.lid, 0.45 * on);
          w.earL = w.earR = 0.62 - 0.35 * on;
          w.nod = -0.12 * on;
          w.sway = Math.sin(a.t * 3) * 0.05 * on;
          break;
        case 'tickle':
          w.squint = 1 * on;
          w.lid = Math.max(w.lid, 0.5 * on);
          w.sway = Math.sin(a.t * 22) * 0.07 * on;
          w.lean += (-0.1 + Math.sin(a.t * 9) * 0.08) * on;
          w.earL = 0.6 + Math.sin(a.t * 14) * 0.4 * on;
          w.earR = 0.6 + Math.sin(a.t * 14 + 1.5) * 0.4 * on;
          w.hop = Math.abs(Math.sin(a.t * 11)) * 0.012 * on;
          break;
        case 'feed':
          w.lookY = -0.6 * on;
          w.nod = 0.1 * on;
          w.squint = 0.5 * on;
          break;
        case 'burp':
          w.lean -= 0.18 * bell(k, 0.1, 0.4);
          w.squash = 1 + 0.06 * bell(k, 0.1, 0.35);
          w.lid = 0.5 * on;
          w.earL = w.earR = 0.3;
          break;
        case 'full':
          w.lid = 0.55 * on;
          w.earL = w.earR = 0.35;
          w.nod = 0.1 * on;
          break;
        case 'hug':
          w.squint = 0.9 * on;
          w.lid = Math.max(w.lid, 0.6 * on);
          w.earL = w.earR = 0.25 + 0.15 * Math.sin(a.t * 2);
          w.squash = 1 - 0.07 * on;
          w.lean += 0.15 * on;
          break;
        case 'flip':
        case 'shake':
        case 'grumpy':
        case 'dark':
          // Eyes wide, ears straight up, a startled rock back.
          w.lid = 0;
          w.squint = 0;
          w.earL = w.earR = 1;
          w.lookX = Math.sin(a.t * 7) * 0.8;
          w.lean -= 0.15 * on;
          if (a.kind === 'grumpy') {
            w.lid = 0.55;
            w.earL = w.earR = 0.2;
            w.lookX = 0;
          }
          break;
        case 'sleep':
          w.lid = ease(k * 1.4);
          w.jaw = Math.max(w.jaw, bell(k, 0.05, 0.5) * 0.9);
          w.lean -= 0.12 * bell(k, 0.05, 0.5);
          w.earL = w.earR = 0.62 - 0.5 * ease(k);
          w.lean += 0.12 * ease((k - 0.5) * 2);
          if (k >= 1) this.asleep = true;
          break;
        case 'sing':
        case 'dance':
          w.sway = Math.sin(a.t * 4.2) * 0.09;
          w.lean += Math.sin(a.t * 8.4) * 0.05;
          w.earL = 0.6 + Math.sin(a.t * 4.2) * 0.35;
          w.earR = 0.6 - Math.sin(a.t * 4.2) * 0.35;
          w.hop = Math.max(0, Math.sin(a.t * 8.4)) * (a.kind === 'dance' ? 0.03 : 0.01);
          w.squint = 0.4;
          break;
        case 'chat':
        case 'hungry':
          w.earL = w.earR = 0.8;
          w.lookX *= 0.3;
          w.lookY = 0.1;
          if (a.kind === 'hungry') w.lean += Math.sin(a.t * 6) * 0.05;
          break;
        case 'achoo':
          w.lean -= 0.2 * bell(k, 0, 0.35);
          w.lean += 0.3 * bell(k, 0.35, 0.55);
          w.lid = bell(k, 0.25, 0.6);
          break;
      }
      // Done once its clip has finished too.
      if (k >= 1 && (voiceOver(this.voice) || a.t > a.dur + 8)) {
        this.anim = null;
        if (this.chatterAt < t + 6) this.chatterAt = t + rand(6, 12);
      }
    }

    // Chewing on a finger: the beak chomps, with a wet little chomp sound.
    if (this.finger) this.chewing = Math.max(this.chewing, 0.4);
    if (this.chewing > 0) {
      this.chewing -= dt;
      const c = Math.max(0, Math.sin(t * 9));
      w.jaw = Math.max(w.jaw, c * 0.75);
      w.squint = Math.max(w.squint, 0.5);
      if (c > 0.95 && t - this.lastChomp > 0.3 && this.voiced) {
        this.lastChomp = t;
        chomp(0.2 * this.volume);
      }
    }

    // Ease everything toward where it wants to be; the motor isn't instant.
    const p = this.pose;
    const rate = (k: number) => 1 - Math.exp(-dt * k);
    (Object.keys(p) as (keyof Pose)[]).forEach(key => {
      const speed = key === 'jaw' ? 28 : key === 'lid' ? 30 : key === 'hop' || key === 'sway' ? 18 : 9;
      p[key] += (w[key] - p[key]) * rate(speed);
    });

    // The tuft is a spring hanging off the head.
    const kx = -p.sway * 3 - this.tuft.x;
    const ky = p.lean * 2 - this.tuft.y + p.hop * 20;
    this.tuftV.x += kx * 60 * dt;
    this.tuftV.y += ky * 60 * dt;
    this.tuftV.multiplyScalar(Math.exp(-dt * 6));
    this.tuft.addScaledVector(this.tuftV, dt);
  }

  apply(rig: FurbyRig) {
    const p = this.pose;
    const b = rig.bones;
    b.waist.rotation.set(p.lean, 0, p.sway);
    b.head.rotation.set(p.nod, p.turn, 0);
    // Left ear is on -x: a positive z turn lowers it.
    b.earL.rotation.set(-(p.earL - 0.6) * 0.3, 0, (0.55 - p.earL) * 1.1);
    b.earR.rotation.set(-(p.earR - 0.6) * 0.3, 0, -(0.55 - p.earR) * 1.1);
    b.jaw.rotation.x = p.jaw * 0.42;
    b.tuft.rotation.set(THREE.MathUtils.clamp(this.tuft.y, -0.4, 0.4) * 0.5, 0, THREE.MathUtils.clamp(this.tuft.x, -0.4, 0.4) * 0.5);
    b.root.position.y = p.hop / 0.16;
    b.root.scale.set(1 / Math.sqrt(p.squash), p.squash, 1 / Math.sqrt(p.squash));
    rig.eyes.forEach(eye => {
      eye.lid.rotation.x = THREE.MathUtils.lerp(-1.3, 1.52, p.lid);
      eye.lower.rotation.x = THREE.MathUtils.lerp(1.4, 0.75, p.squint * (1 - p.lid));
      eye.ball.rotation.set(-p.lookY * 0.35, p.lookX * 0.45, 0);
    });
  }

  dispose() {
    this.voice?.stop();
    this.stopMotor();
  }
}
