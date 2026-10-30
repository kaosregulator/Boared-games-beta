/**
 * Procedural Web Audio Sound Synthesizer for Mini Game Party Pack & Casino Poker Lounge
 * Generates tactile clicks, wood knocks, radar pings, explosions, disc drops, dice shakes, cards, chips, slots, roulette, etc.
 */
import { CHIP_TUNES, DEFAULT_TUNE, type ChipNote } from './chiptunes';
import { isRouted, routeWhenReady, unroute } from '../tv/surround';

/**
 * The title screen's song: Brahe by Punch Deck, cut to start at 0:09. It plays
 * while the menu is up and hands over to the room music when you step in (or
 * when it finishes first).
 */
export const MENU_TRACK = { id: 'menu', title: 'Brahe (Punch Deck)', src: '/room/brahe-punch-deck.mp3' } as const;

/** Seconds of overlap when one song runs out and the next comes in. */
const SONG_CROSSFADE = 4;
/** Seconds before a room song ends that the next one is picked and starts buffering, so there's no gap. */
const NEXT_SONG_LEAD = 30;
/** How often the room checks the song is still going when it should be. */
const BED_WATCH_MS = 3000;

/**
 * Events that count as a gesture for sound in every browser. A touch's
 * pointerdown does not (only its pointerup/touchend does), so listening for
 * pointerdown alone left phones and iPads silent after the first tap.
 */
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;

/** A tenth of a second of silence. Playing it during a tap lets that audio element play later without one. */
function silentWav() {
  const n = 800;
  const bytes = new Uint8Array(44 + n);
  const v = new DataView(bytes.buffer);
  const tag = (at: number, text: string) => {
    for (let i = 0; i < 4; i += 1) bytes[at + i] = text.charCodeAt(i);
  };
  tag(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  tag(36, 'data');
  v.setUint32(40, n, true);
  bytes.fill(128, 44);
  let text = '';
  for (const b of bytes) text += String.fromCharCode(b);
  return `data:audio/wav;base64,${btoa(text)}`;
}

/**
 * Room music, out of the boombox. It shuffles (a new song each time one
 * ends, never the same one twice in a row) unless shuffle is switched off,
 * in which case it plays in this order. The picker and Skip still work.
 */
export const ROOM_TRACKS = [
  { id: 'snowfall', title: 'Snowfall (slowed, birds)', src: '/room/snowfall.mp3' },
  { id: 'bedroom', title: 'Bedroom tape', src: '/room/bedroom.mp3' },
  { id: 'growing-up', title: 'Growing Up — Scott Buckley', src: '/room/growing-up.mp3' },
  { id: 'to-see-the-past', title: 'To See The Past — Hayden Folker', src: '/room/to-see-the-past.mp3' },
] as const;

/** Songs that need credit, shown under the title screen and in the Sound menu. */
export const MUSIC_CREDITS = [
  {
    title: 'Growing Up',
    artist: 'Scott Buckley',
    license: 'Free To Use YouTube license',
    source: 'https://breakingcopyright.com/song/scott-buckley-growing-up',
    licenseUrl: null,
  },
  {
    title: 'To See The Past',
    artist: 'Hayden Folker',
    license: 'Creative Commons BY 3.0',
    source: 'https://breakingcopyright.com/song/hayden-folker-to-see-the-past',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
] as const;

function savedShuffle() {
  try {
    return window.localStorage.getItem('room-shuffle') !== '0';
  } catch {
    return true;
  }
}
export type RoomTrackId = (typeof ROOM_TRACKS)[number]['id'];

function savedTrack(): RoomTrackId {
  try {
    const id = window.localStorage.getItem('room-track');
    if (ROOM_TRACKS.some(t => t.id === id)) return id as RoomTrackId;
  } catch {
    // Private windows can refuse storage; the default track is fine.
  }
  return ROOM_TRACKS[0].id;
}

let silent: string | null = null;
const SILENT_WAV = () => (silent ??= silentWav());

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private volume: number = 0.5;
  /** Bedroom tape, separate from effect clicks so the slider can be loud. */
  private musicVolume = 0.92;
  private nostalgiaOn = false;
  /** Throwback cues hush the tape, then give it back. */
  private bedroomHeld = false;
  private nostalgiaTimer: number | null = null;
  private tuneStops: Array<() => void> = [];
  private bedAudio: HTMLAudioElement | null = null;
  private bedFade: number | null = null;
  private bedUnlock: (() => void) | null = null;
  /**
   * Audio elements that have already played once during a tap. Safari lets an
   * element play on its own only after that, so a fresh element for the next
   * song stayed silent until you touched the room again. Every song plays out
   * of one of these, and finished ones come back here.
   */
  private spareBeds: HTMLAudioElement[] = [];
  private blessing = 0;
  private gesturesWatched = false;
  /** The next room song, picked and buffering before this one runs out. */
  private nextBed: { id: RoomTrackId; audio: HTMLAudioElement } | null = null;
  private songListeners = new WeakMap<HTMLAudioElement, AbortController>();
  /** Elements that have made sound at least once, so the browser lets them play again. */
  private playedBeds = new WeakSet<HTMLAudioElement>();
  /** Songs in a row that failed to load; stops a dead connection skipping forever. */
  private bedErrors = 0;
  private bedWatch: number | null = null;
  private track: RoomTrackId = typeof window === 'undefined' ? ROOM_TRACKS[0].id : savedTrack();
  private shuffleOn = typeof window === 'undefined' ? true : savedShuffle();
  private trackListeners = new Set<(id: RoomTrackId) => void>();
  /** The title screen is up: the bed plays MENU_TRACK instead of the room music. */
  private menuMusic = false;
  /** Seconds the next fade-in of the bed takes. */
  private nextFadeIn = 1.28;
  /** 0..1: the room's TV ducks the bedroom tape while it plays (1 = not ducked). */
  private bedDuck = 1;

  /** What the bedroom tape should be at right now: the slider, the mute and the TV's duck. */
  private bedLevel() {
    if (this.muted) return 0;
    return this.menuMusic ? this.musicVolume : this.musicVolume * this.bedDuck;
  }

  /**
   * The TV turns the bedroom tape down while it plays and gives it back when
   * it goes off or you walk away from it. The tape keeps rolling underneath,
   * so it comes back where it would have been, not from the top.
   */
  public setBedDuck(level: number) {
    const k = Math.round(Math.max(0, Math.min(1, level)) * 20) / 20;
    if (k === this.bedDuck) return;
    this.bedDuck = k;
    if (!this.nostalgiaOn || this.bedroomHeld || !this.bedAudio) return;
    this.nextFadeIn = 0.6;
    this.fadeBed(this.bedLevel());
  }

  public getBedDuck() {
    return this.bedDuck;
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted() {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getMusicVolume() {
    return this.musicVolume;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (!this.nostalgiaOn || !this.bedAudio) return;
    // The slider should answer immediately. Fades are for the tape starting and stopping.
    if (this.bedFade !== null) {
      window.clearInterval(this.bedFade);
      this.bedFade = null;
    }
    this.bedAudio.volume = this.bedLevel();
  }

  public getTrack() {
    return this.track;
  }

  public getShuffle() {
    return this.shuffleOn;
  }

  public setShuffle(on: boolean) {
    this.shuffleOn = on;
    try {
      window.localStorage.setItem('room-shuffle', on ? '1' : '0');
    } catch {
      // Not saved; it still applies for this visit.
    }
  }

  /** Called with the new track whenever the room music changes (picker, skip or a song ending). */
  public onTrackChange(fn: (id: RoomTrackId) => void) {
    this.trackListeners.add(fn);
    return () => {
      this.trackListeners.delete(fn);
    };
  }

  /** The song after this one: a random other one when shuffling, the next in the list otherwise. */
  private nextTrack(): RoomTrackId {
    const i = ROOM_TRACKS.findIndex(t => t.id === this.track);
    if (!this.shuffleOn || ROOM_TRACKS.length < 2) return ROOM_TRACKS[(i + 1) % ROOM_TRACKS.length].id;
    const others = ROOM_TRACKS.filter(t => t.id !== this.track);
    return others[Math.floor(Math.random() * others.length)].id;
  }

  /** Skip to the next song now, with a short crossfade. */
  public skipTrack() {
    this.dropNextBed();
    this.track = this.nextTrack();
    for (const fn of this.trackListeners) fn(this.track);
    if (!this.menuMusic) this.swapBed(0.8);
  }

  /** Swap the room music. A playing track crossfades into the new one. */
  public setTrack(id: RoomTrackId) {
    if (id === this.track) return;
    this.dropNextBed();
    this.track = id;
    try {
      window.localStorage.setItem('room-track', id);
    } catch {
      // Not saved; it still changes for this visit.
    }
    for (const fn of this.trackListeners) fn(id);
    if (!this.menuMusic) this.swapBed(0.6);
  }

  /** Title screen up or gone. Leaving it fades the menu song into the room music. */
  public setMenuMusic(on: boolean) {
    if (on === this.menuMusic) return;
    this.menuMusic = on;
    // Nothing is playing yet: start the title song now. Waiting for a later
    // swap meant the song stayed silent until Play, and Play had already
    // switched this flag off, so the title song never started at all.
    if (!this.bedAudio) {
      if (on) {
        this.nextFadeIn = 0.25;
        this.startNostalgia();
      }
      return;
    }
    this.swapBed(on ? 0.6 : 1.4);
  }

  /** Fade the playing song out over `seconds` and bring in whatever should be on now. */
  private swapBed(seconds: number) {
    const old = this.bedAudio;
    if (!old) return;
    this.bedAudio = null;
    if (this.bedFade !== null) window.clearInterval(this.bedFade);
    this.bedFade = null;
    const from = old.volume;
    const start = performance.now();
    const fade = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - start) / (seconds * 1000));
      old.volume = Math.max(0, from * (1 - k));
      if (k >= 1) {
        window.clearInterval(fade);
        this.recycleBed(old);
      }
    }, 50);
    // the next song comes up over the same stretch the last one goes down
    this.nextFadeIn = Math.max(1.28, seconds);
    if (this.nostalgiaOn) this.startNostalgia();
  }

  /** A song is about to run out: the menu song gives way to the room, room songs take turns. */
  private songEnding(audio: HTMLAudioElement) {
    if (audio !== this.bedAudio) return;
    if (this.menuMusic) this.menuMusic = false;
    else {
      // just this visit; the picker's choice is still where it starts next time
      this.track = this.nextBed?.id ?? this.nextTrack();
      for (const fn of this.trackListeners) fn(this.track);
    }
    this.swapBed(SONG_CROSSFADE);
  }

  private ensureBed() {
    if (this.bedAudio) return this.bedAudio;
    const menu = this.menuMusic;
    const src = menu ? MENU_TRACK.src : ROOM_TRACKS.find(t => t.id === this.track)?.src ?? ROOM_TRACKS[0].src;
    const queued = !menu && this.nextBed?.id === this.track ? this.nextBed.audio : null;
    if (!queued) this.dropNextBed();
    this.nextBed = null;
    const audio = queued ?? this.takeBed(src, menu);
    // Stream it. A separate full-file fetch used to run ahead of this element
    // and the title video, and this element then downloaded the song again.
    audio.preload = 'auto';
    audio.autoplay = menu;
    if (menu) {
      try {
        (audio as HTMLAudioElement & { fetchPriority?: string }).fetchPriority = 'high';
      } catch {
        // Older browsers ignore the hint; preload still starts the file.
      }
    }
    audio.volume = 0;
    audio.setAttribute('data-bedroom-music', menu ? 'menu' : this.track);
    this.songListeners.get(audio)?.abort();
    const listen = new AbortController();
    this.songListeners.set(audio, listen);
    const { signal } = listen;
    let ending = false;
    audio.addEventListener('timeupdate', () => {
      if (ending || audio !== this.bedAudio || !Number.isFinite(audio.duration)) return;
      const left = audio.duration - audio.currentTime;
      if (!menu && left <= NEXT_SONG_LEAD) this.queueNextBed();
      if (left > SONG_CROSSFADE) return;
      ending = true;
      this.songEnding(audio);
    }, { signal });
    audio.addEventListener('ended', () => {
      if (ending) return;
      ending = true;
      this.songEnding(audio);
    }, { signal });
    audio.addEventListener('playing', () => {
      this.bedErrors = 0;
      this.playedBeds.add(audio);
      // The room music comes out of the boombox; the menu song stays plain stereo over the title screen.
      if (!menu) routeWhenReady(audio, 'boombox');
    }, { signal });
    // A song that won't load (a dropped connection, a bad deploy) moves on to the next one instead of leaving the room quiet.
    audio.addEventListener('error', () => {
      if (ending || audio !== this.bedAudio) return;
      this.bedErrors += 1;
      if (this.bedErrors > ROOM_TRACKS.length + 1) return;
      ending = true;
      window.setTimeout(() => this.songEnding(audio), 1200);
    }, { signal });
    if (typeof document !== 'undefined') document.body.appendChild(audio);
    this.bedAudio = audio;
    return audio;
  }

  /** An element for a song: one already allowed to play if there is one. The plain menu song never takes one wired to the boombox. */
  private takeBed(src: string, plain: boolean) {
    const i = this.spareBeds.findIndex(a => !plain || !isRouted(a));
    const audio = i >= 0 ? this.spareBeds.splice(i, 1)[0] : new Audio();
    audio.src = src;
    return audio;
  }

  /** A song that has faded out goes back on the shelf for the next one. */
  private recycleBed(audio: HTMLAudioElement) {
    this.songListeners.get(audio)?.abort();
    this.songListeners.delete(audio);
    audio.pause();
    audio.removeAttribute('src');
    audio.removeAttribute('data-bedroom-music');
    audio.load();
    audio.remove();
    // one the browser never let play would only be held again
    if (this.playedBeds.has(audio) && this.spareBeds.length < 3) this.spareBeds.push(audio);
    else unroute(audio);
  }

  /** Pick the next room song now and let it buffer, so it starts the moment this one fades. */
  private queueNextBed() {
    if (this.nextBed || this.menuMusic) return;
    const id = this.nextTrack();
    const src = ROOM_TRACKS.find(t => t.id === id)?.src;
    if (!src) return;
    const audio = this.takeBed(src, false);
    audio.preload = 'auto';
    audio.autoplay = false;
    audio.volume = 0;
    audio.load();
    this.nextBed = { id, audio };
  }

  private dropNextBed() {
    const next = this.nextBed;
    this.nextBed = null;
    if (next) this.recycleBed(next.audio);
  }

  /** From the first song on, every tap keeps two elements ready to play and frees a song the browser was holding. */
  private watchGestures() {
    if (this.gesturesWatched || typeof window === 'undefined') return;
    this.gesturesWatched = true;
    const onGesture = () => {
      this.bedUnlock?.();
      this.blessSpares();
    };
    for (const type of GESTURES) window.addEventListener(type, onGesture, { capture: true, passive: true });
  }

  private blessSpares() {
    while (this.spareBeds.length + this.blessing < 2) {
      const audio = new Audio(SILENT_WAV());
      this.blessing += 1;
      void audio
        .play()
        .then(() => {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
          this.playedBeds.add(audio);
          this.spareBeds.push(audio);
        })
        // not a gesture this browser counts; the next one will be
        .catch(() => undefined)
        .finally(() => {
          this.blessing -= 1;
        });
    }
  }

  /** The browser held the song: the next tap or key starts it. */
  private armUnlock() {
    this.watchGestures();
    if (this.bedUnlock) return;
    const resume = () => {
      const audio = this.bedAudio;
      if (!this.nostalgiaOn || !audio) {
        if (this.bedUnlock === resume) this.bedUnlock = null;
        return;
      }
      if (this.bedroomHeld || !audio.paused) return;
      void audio
        .play()
        .then(() => {
          if (this.bedUnlock === resume) this.bedUnlock = null;
          if (this.nostalgiaOn) this.fadeBed(this.bedLevel());
        })
        .catch(() => undefined);
    };
    this.bedUnlock = resume;
  }

  /**
   * Every few seconds: the song should be playing, so make sure it is. Covers
   * anything that stops it without saying so (the system taking the audio
   * for a call or another tab, a song that ended without the swap).
   */
  private watchBed() {
    if (this.bedWatch !== null || typeof window === 'undefined') return;
    this.bedWatch = window.setInterval(() => {
      const audio = this.bedAudio;
      if (!this.nostalgiaOn || this.bedroomHeld || !audio || this.bedUnlock) return;
      if (audio.ended) {
        this.songEnding(audio);
        return;
      }
      if (audio.paused && !audio.error) void audio.play().catch(() => this.armUnlock());
    }, BED_WATCH_MS);
  }

  /** Ease the tape in or out. A new fade replaces one already running. */
  private fadeBed(to: number, done?: () => void) {
    const audio = this.bedAudio;
    if (!audio) return;
    if (this.bedFade !== null) window.clearInterval(this.bedFade);
    const from = audio.volume;
    const ms = this.nextFadeIn * 1000;
    this.nextFadeIn = 1.28;
    // by the clock, not by ticks, so a busy frame doesn't stretch the fade
    const start = performance.now();
    this.bedFade = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - start) / ms);
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) {
        if (this.bedFade !== null) window.clearInterval(this.bedFade);
        this.bedFade = null;
        audio.volume = Math.max(0, Math.min(1, to));
        done?.();
      }
    }, 80);
  }

  /** Soft footfall on bedroom floorboards; alternates weight per step. */
  private stepScuffs: AudioBuffer[] | null = null;

  public playFootstep(heavy = false) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = 0.11;
    // Two scuffs made once and alternated, instead of a fresh buffer every step.
    if (!this.stepScuffs) {
      const make = () => {
        const buffer = this.ctx!.createBuffer(1, Math.ceil(this.ctx!.sampleRate * len), this.ctx!.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) {
          const decay = Math.pow(1 - i / data.length, 3.2);
          data[i] = (Math.random() * 2 - 1) * decay;
        }
        return buffer;
      };
      this.stepScuffs = [make(), make()];
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.stepScuffs[heavy ? 1 : 0];
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(heavy ? 420 : 320, t);
    const thump = this.ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(heavy ? 78 : 64, t);
    thump.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime((heavy ? 0.16 : 0.1) * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(filter);
    filter.connect(gain);
    thump.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t);
    thump.start(t);
    thump.stop(t + len);
  }

  /** Single die striking a wooden tray. */
  public playDieLand() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + Math.random() * 0.02;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.setValueAtTime(680 + Math.random() * 420, t);
    osc.frequency.exponentialRampToValueAtTime(190, t + 0.06);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, t);
    filter.Q.setValueAtTime(1.6, t);
    gain.gain.setValueAtTime(0.11 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Wooden pawn or token set down on a board. */
  public playTokenPlace() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.07);
    gain.gain.setValueAtTime(0.13 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  // --- Shelf & Unboxing SFX ---
  public playShelfSlide() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.25 * this.volume, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  public playBoxOpen() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(t);
    whiteNoise.stop(t + 0.25);
  }

  public playBoardUnfold() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Cardboard creak and flip friction
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(320, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.4);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.3 * this.volume, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  /** Cardboard lid: tab snap, creak, then the lid settles. */
  public playCardboardLid() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const noiseLen = Math.floor(ctx.sampleRate * 0.55);
    const buffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(380, t);
    bp.frequency.exponentialRampToValueAtTime(1400, t + 0.18);
    bp.frequency.exponentialRampToValueAtTime(500, t + 0.55);
    bp.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.45 * this.volume, t + 0.03);
    ng.gain.exponentialRampToValueAtTime(0.08 * this.volume, t + 0.2);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.55);

    const creak = ctx.createOscillator();
    const cg = ctx.createGain();
    creak.type = 'sawtooth';
    creak.frequency.setValueAtTime(90, t + 0.05);
    creak.frequency.linearRampToValueAtTime(210, t + 0.28);
    creak.frequency.exponentialRampToValueAtTime(60, t + 0.6);
    cg.gain.setValueAtTime(0.0001, t);
    cg.gain.linearRampToValueAtTime(0.08 * this.volume, t + 0.12);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.62);
    creak.connect(cg);
    cg.connect(ctx.destination);
    creak.start(t);
    creak.stop(t + 0.62);

    const thud = ctx.createOscillator();
    const tg = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(120, t + 0.42);
    thud.frequency.exponentialRampToValueAtTime(48, t + 0.7);
    tg.gain.setValueAtTime(0.0001, t + 0.4);
    tg.gain.linearRampToValueAtTime(0.35 * this.volume, t + 0.45);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    thud.connect(tg);
    tg.connect(ctx.destination);
    thud.start(t + 0.4);
    thud.stop(t + 0.75);
  }

  /** One cardboard panel slapping flat. */
  public playBoardFlap() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const noiseLen = Math.floor(ctx.sampleRate * 0.22);
    const buffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4 * this.volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    noise.connect(hp);
    hp.connect(g);
    g.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.22);

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.18);
    og.gain.setValueAtTime(0.2 * this.volume, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** Board lands on the table in front of the player. */
  public playBoardSettle() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.28);
    g.gain.setValueAtTime(0.32 * this.volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  // --- Battleship SFX ---
  public playRadarPing() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(1050, t + 0.3);

    gain.gain.setValueAtTime(0.25 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  public playArtilleryWhistle() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.45);

    gain.gain.setValueAtTime(0.05 * this.volume, t);
    gain.gain.linearRampToValueAtTime(0.2 * this.volume, t + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  public playExplosionHit() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.6);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.6);

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.4);

    subGain.gain.setValueAtTime(0.5 * this.volume, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.4);
  }

  public playWaterSplashMiss() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.35);
  }

  public playSplash() {
    this.playWaterSplashMiss();
  }

  public playShipPlaced() {
    this.playChessMove();
  }

  public playShipSunkAlarm() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [0, 0.18, 0.36].forEach((delay, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(idx % 2 === 0 ? 520 : 680, t + delay);
      gain.gain.setValueAtTime(0.2 * this.volume, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, t + delay + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.15);
    });
  }

  // --- Connect 4 & Checkers SFX ---
  public playDiscDrop() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

    gain.gain.setValueAtTime(0.4 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playMoveClack() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.05);

    gain.gain.setValueAtTime(0.35 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playPieceSelect() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.04);
    gain.gain.setValueAtTime(0.2 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  // --- Chess SFX ---
  public playChessMove() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.07);

    gain.gain.setValueAtTime(0.45 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playChessCapture() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.12);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, t);

    gain.gain.setValueAtTime(0.5 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playChessCheck() {
    this.playCheckChime();
  }

  public playCheckChime() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [587.33, 880].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      gain.gain.setValueAtTime(0.3 * this.volume, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.35);
    });
  }

  // --- Cards & Chips & Poker SFX ---
  public playCardFlip() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.09);
    gain.gain.setValueAtTime(0.25 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playCardDeal() {
    this.playCardFlip();
  }

  public playCoinToss() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
    gain.gain.setValueAtTime(0.2 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playPokerChipsBet() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    [0, 0.04, 0.09].forEach((delay) => {
      setTimeout(() => {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200 + Math.random() * 400, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.06);
        gain.gain.setValueAtTime(0.25 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.005, t + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.06);
      }, delay * 1000);
    });
  }

  public playChipCollect() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + i * 150, t);
        osc.frequency.exponentialRampToValueAtTime(2000, t + 0.05);
        gain.gain.setValueAtTime(0.2 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.005, t + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      }, i * 40);
    }
  }

  // --- Casino Slots & Roulette SFX ---
  public playSlotSpin() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(600, t + 0.2);
    gain.gain.setValueAtTime(0.15 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playSlotStop() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.07);
    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playSlotJackpot() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523, 659, 784, 1046, 1318, 1568];
    const t = this.ctx.currentTime;
    notes.forEach((n, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n, t + idx * 0.08);
      gain.gain.setValueAtTime(0.35 * this.volume, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.4);
    });
  }

  public playRouletteSpin() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    for (let i = 0; i < 12; i++) {
      const delay = (i * 0.08) + (i * i * 0.012);
      setTimeout(() => {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900 - i * 30, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);
        gain.gain.setValueAtTime(0.2 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.005, t + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.04);
      }, delay * 1000);
    }
  }

  public playRouletteBallDrop() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    [0, 0.06, 0.14, 0.25].forEach((d) => {
      setTimeout(() => {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);
        gain.gain.setValueAtTime(0.3 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      }, d * 1000);
    });
  }

  public playDiscordPing() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
    gain.gain.setValueAtTime(0.25 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playPawnHop() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(550, t + 0.06);
    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playSorryBump() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.35);

    gain.gain.setValueAtTime(0.35 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  public playDiceShake() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280 + Math.random() * 150, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);
        gain.gain.setValueAtTime(0.3 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.04);
      }, i * 65);
    }
  }

  public playCupSlam() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    gain.gain.setValueAtTime(0.6 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  public playVictoryFanfare() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const t = this.ctx.currentTime;

    notes.forEach((note, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note, t + idx * 0.12);
      gain.gain.setValueAtTime(0.3 * this.volume, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.12 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.4);
    });
  }

  public playVictory() {
    this.playVictoryFanfare();
  }

  public playDefeat() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 392, 349, 293];
    const t = this.ctx.currentTime;

    notes.forEach((note, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note, t + idx * 0.15);
      gain.gain.setValueAtTime(0.25 * this.volume, t + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.15 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + idx * 0.15);
      osc.stop(t + idx * 0.15 + 0.3);
    });
  }

  /** One soft key-tick, reused so a menu click does not allocate a new buffer every time. */
  private clickTick: AudioBuffer | null = null;

  public playButtonClick() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    if (!this.clickTick) {
      const frames = Math.floor(this.ctx.sampleRate * 0.018);
      const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) {
        const env = 1 - i / frames;
        data[i] = (Math.random() * 2 - 1) * env * env;
      }
      this.clickTick = buffer;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.clickTick;
    const noiseGain = this.ctx.createGain();
    const body = this.ctx.createBiquadFilter();
    body.type = 'highpass';
    body.frequency.setValueAtTime(900, t);
    noiseGain.gain.setValueAtTime(0.045 * this.volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.018);
    noise.connect(body);
    body.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + 0.02);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.045);
    gain.gain.setValueAtTime(0.07 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // --- Throwback Trivia buzzers and stingers ---
  public playTriviaTick(speedFactor: number = 1.0) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 * speedFactor, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.03);

    gain.gain.setValueAtTime(0.2 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  public playTriviaCorrect() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6
    const t = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);
      gain.gain.setValueAtTime(0.3 * this.volume, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.005, t + i * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.3);
    });
  }

  public playTriviaWrong() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(140, t);
    osc2.frequency.setValueAtTime(147, t); // Dissonant low clash

    gain.gain.setValueAtTime(0.4 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.35);
    osc2.stop(t + 0.35);
  }

  public playHostStinger() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 830.61, 880];
    const t = this.ctx.currentTime;
    notes.forEach((note, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note, t + idx * 0.05);
      gain.gain.setValueAtTime(0.18 * this.volume, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.005, t + idx * 0.05 + 0.2);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, t);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.2);
    });
  }

  public playSpookyDrone() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.linearRampToValueAtTime(55, t + 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.4 * this.volume, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  public playGuillotineBlade() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.2);

    gain.gain.setValueAtTime(0.5 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playWireSnip() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);

    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playGhostHaunt() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(600, t + 0.3);
    osc.frequency.linearRampToValueAtTime(350, t + 0.6);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35 * this.volume, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  public stopChiptune() {
    this.tuneStops.forEach(stop => stop());
    this.tuneStops = [];
  }

  /** Two voices, a bass, and a real envelope. The old one-note beeps grew up. */
  public playChiptuneTrack(tuneId: string) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    this.stopChiptune();

    const notes = CHIP_TUNES[tuneId] ?? CHIP_TUNES[DEFAULT_TUNE];
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.06;
    const master = ctx.createGain();
    master.gain.setValueAtTime(this.volume, t0);
    master.connect(ctx.destination);
    this.tuneStops.push(() => {
      try {
        master.disconnect();
      } catch {
        // already torn down
      }
    });

    notes.forEach(note => this.scheduleChip(ctx, master, t0, note));
  }

  private scheduleChip(ctx: AudioContext, dest: AudioNode, t0: number, note: ChipNote) {
    const start = t0 + note.t;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(note.filter ?? 1600, start);
    const peak = Math.max(0.0001, (note.gain ?? 0.16) * 0.9);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.03, note.d * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.d);
    filter.connect(gain);
    gain.connect(dest);

    if (note.wave === 'noise') {
      const length = Math.max(1, Math.ceil(ctx.sampleRate * note.d));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(filter);
      src.start(start);
      src.stop(start + note.d);
      this.tuneStops.push(() => {
        try {
          src.stop();
        } catch {
          // already ended
        }
      });
      return;
    }

    const osc = ctx.createOscillator();
    osc.type = note.wave ?? 'square';
    osc.frequency.setValueAtTime(Math.max(1, note.f), start);
    if (note.slide && note.slide > 0) {
      osc.frequency.exponentialRampToValueAtTime(note.slide, start + note.d);
    }
    osc.connect(filter);
    osc.start(start);
    osc.stop(start + note.d + 0.02);
    this.tuneStops.push(() => {
      try {
        osc.stop();
      } catch {
        // already ended
      }
    });
  }

  /**
   * Bedroom tape. Loops, fades in when you arrive, fades out for the radio.
   */
  /** Pause the bedroom tape without forgetting that the player had it on. */
  public holdBedroom() {
    this.bedroomHeld = true;
    if (this.bedFade !== null) {
      window.clearInterval(this.bedFade);
      this.bedFade = null;
    }
    this.bedAudio?.pause();
  }

  /** The tape comes back only if it was supposed to be playing. */
  public releaseBedroom() {
    this.bedroomHeld = false;
    if (!this.nostalgiaOn) return;
    const audio = this.ensureBed();
    if (audio.paused) {
      void audio.play().catch(() => this.armUnlock());
    }
    this.fadeBed(this.bedLevel());
  }

  public startNostalgia() {
    this.nostalgiaOn = true;
    this.watchGestures();
    this.watchBed();
    if (this.nostalgiaTimer !== null) {
      window.clearTimeout(this.nostalgiaTimer);
      this.nostalgiaTimer = null;
    }
    if (this.bedroomHeld) return;
    const audio = this.ensureBed();
    const target = this.bedLevel();
    if (audio.paused) {
      audio.volume = 0;
      // Browsers hold the song until the first gesture. Any click, tap or key starts it.
      void audio.play().catch(() => this.armUnlock());
    }
    this.fadeBed(target);
  }

  public stopNostalgia() {
    this.nostalgiaOn = false;
    if (this.nostalgiaTimer !== null) {
      window.clearTimeout(this.nostalgiaTimer);
      this.nostalgiaTimer = null;
    }
    if (!this.bedAudio) return;
    this.fadeBed(0, () => {
      if (!this.nostalgiaOn) this.bedAudio?.pause();
    });
  }

  public nostalgiaPlaying() {
    return this.nostalgiaOn;
  }

  /** The browser is holding the song until the first click or key. */
  public musicWaitingForGesture() {
    return this.bedUnlock !== null;
  }

  /**
   * Try the song again. A muted title video starting does not count as a
   * gesture in every browser, but it does in some, and this costs nothing
   * when the song is already playing.
   */
  public retryBlockedMusic() {
    this.bedUnlock?.();
  }
}

export const sound = new SoundEngine();
