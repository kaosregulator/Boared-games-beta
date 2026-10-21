import { useEffect, useState } from 'react';
import { resolveArchive } from '../tv/archive';
import { startStatic, type StaticHandle } from '../tv/noise';
import { FM_MAX, FM_MIN, STATIONS, streamUrls, type Station } from './stations';

/**
 * A tuner, not a playlist. The dial sits on a frequency; static fills the
 * gaps; a station bleeds in as the needle nears it and locks when it lands.
 * Lives outside React so the music keeps playing after you step back.
 */

export interface RadioSnapshot {
  power: boolean;
  freq: number;
  volume: number;
  station: Station | null;
  /** 0 = pure static, 1 = locked on. */
  strength: number;
  scanning: boolean;
  seeking: boolean;
  error: string | null;
}

/** How far off-frequency (MHz) a station can still be heard through the hiss. */
const REACH = 0.4;
const STEP = 0.1;

const round = (f: number) => Math.round(f * 10) / 10;

class RadioEngine {
  private snap: RadioSnapshot = {
    power: false,
    freq: 92.7,
    volume: 0.7,
    station: null,
    strength: 0,
    scanning: false,
    seeking: false,
    error: null,
  };
  private subs = new Set<(s: RadioSnapshot) => void>();
  private audio: HTMLAudioElement | null = null;
  private loadedId: string | null = null;
  private loadToken = 0;
  private hiss: StaticHandle | null = null;
  private moving = 0;
  private sweepTimer: number | null = null;
  private holdTimer: number | null = null;
  private raf = 0;

  get state() {
    return this.snap;
  }

  subscribe(fn: (s: RadioSnapshot) => void) {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  }

  private set(patch: Partial<RadioSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.subs.forEach(fn => fn(this.snap));
  }

  private element() {
    if (!this.audio) {
      const el = document.createElement('audio');
      el.preload = 'none';
      el.setAttribute('playsinline', 'true');
      document.body.appendChild(el);
      this.audio = el;
    }
    return this.audio;
  }

  private nearest(freq: number) {
    let best: Station | null = null;
    let dist = Infinity;
    for (const s of STATIONS) {
      const d = Math.abs(s.freq - freq);
      if (d < dist) {
        dist = d;
        best = s;
      }
    }
    return { station: best, dist };
  }

  /** Point the audio element at a station, from its live position. */
  private load(station: Station) {
    if (this.loadedId === station.id) return;
    const el = this.element();
    const token = ++this.loadToken;
    this.loadedId = station.id;
    el.pause();
    if (station.source.kind === 'stream') {
      const urls = streamUrls(station.source.mount);
      const attempt = (i: number) => {
        if (token !== this.loadToken) return;
        if (i >= urls.length) {
          this.set({ error: `${station.name} is off the air right now` });
          return;
        }
        el.onerror = () => attempt(i + 1);
        el.src = urls[i];
        void el.play().catch(() => attempt(i + 1));
      };
      attempt(0);
      return;
    }
    const id = station.source.id;
    resolveArchive(id, 'audio').then(file => {
      if (token !== this.loadToken) return;
      if (!file) {
        this.set({ error: `${station.call} tape did not answer` });
        return;
      }
      el.onerror = () => this.set({ error: `${station.call} tape did not answer` });
      el.src = file.url;
      el.onloadedmetadata = () => {
        const length = Number.isFinite(el.duration) ? el.duration : file.length ?? 0;
        if (length > 30) el.currentTime = (Date.now() / 1000) % (length - 10);
      };
      void el.play().catch(() => {});
    });
  }

  private unload() {
    this.loadToken += 1;
    this.loadedId = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
    }
  }

  /** Recompute the mix of station and hiss for the current needle position. */
  private mix = () => {
    this.raf = 0;
    if (!this.snap.power) return;
    const { station, dist } = this.nearest(this.snap.freq);
    const strength = station ? Math.max(0, 1 - dist / REACH) : 0;
    const wobbling = performance.now() - this.moving < 350;
    if (station && strength > 0) {
      this.load(station);
      const el = this.element();
      // Off-centre or while the dial turns, the signal swims.
      const swim = wobbling || strength < 0.98 ? 0.55 + Math.random() * 0.45 : 1;
      el.volume = Math.min(1, this.snap.volume * Math.pow(strength, 1.6) * swim);
      el.muted = false;
    } else {
      this.unload();
    }
    const hissLevel = strength >= 0.98 && !wobbling ? 0.0 : (1 - strength * 0.85) * this.snap.volume;
    this.hiss?.setLevel(hissLevel, 0.06);
    if (station !== this.snap.station || Math.abs(strength - this.snap.strength) > 0.02) {
      this.set({ station: strength > 0 ? station : null, strength });
    }
    // Keep animating while anything is moving so the warble stays alive.
    if (wobbling || (strength > 0 && strength < 0.98)) this.raf = requestAnimationFrame(this.mix);
  };

  private remix() {
    if (!this.raf) this.raf = requestAnimationFrame(this.mix);
  }

  private stopMotion() {
    if (this.sweepTimer) window.clearInterval(this.sweepTimer);
    if (this.holdTimer) window.clearTimeout(this.holdTimer);
    this.sweepTimer = null;
    this.holdTimer = null;
  }

  setPower(on: boolean) {
    if (on === this.snap.power) return;
    if (on) {
      this.hiss = startStatic(this.snap.volume, 'radio');
      this.set({ power: true, error: null });
      this.remix();
    } else {
      this.stopMotion();
      this.hiss?.stop(0.1);
      this.hiss = null;
      this.unload();
      this.set({ power: false, scanning: false, seeking: false, station: null, strength: 0 });
    }
  }

  setFreq(freq: number) {
    const f = round(Math.min(FM_MAX, Math.max(FM_MIN, freq)));
    this.moving = performance.now();
    this.set({ freq: f, error: null });
    this.remix();
  }

  /** One click of the tuning knob. */
  nudge(dir: 1 | -1) {
    if (!this.snap.power) this.setPower(true);
    this.stopMotion();
    this.set({ scanning: false, seeking: false });
    this.setFreq(this.snap.freq + dir * STEP);
  }

  /** Sweep through the static to the next station, then lock. */
  seek(dir: 1 | -1, then?: () => void) {
    if (!this.snap.power) this.setPower(true);
    this.stopMotion();
    const ordered = dir > 0 ? STATIONS : [...STATIONS].reverse();
    const target =
      ordered.find(s => (dir > 0 ? s.freq > this.snap.freq + 0.05 : s.freq < this.snap.freq - 0.05)) ?? ordered[0];
    this.set({ seeking: true });
    this.sweepTimer = window.setInterval(() => {
      let next = this.snap.freq + dir * STEP;
      if (next > FM_MAX) next = FM_MIN;
      if (next < FM_MIN) next = FM_MAX;
      this.setFreq(next);
      if (Math.abs(this.snap.freq - target.freq) < 0.05) {
        this.stopMotion();
        this.set({ seeking: false });
        this.setFreq(target.freq);
        then?.();
      }
    }, 70);
  }

  /** Car-radio scan: hop station to station, five seconds on each. */
  toggleScan() {
    if (this.snap.scanning) {
      this.stopMotion();
      this.set({ scanning: false, seeking: false });
      return;
    }
    this.set({ scanning: true });
    const hop = () => {
      if (!this.snap.scanning) return;
      this.seek(1, () => {
        this.set({ scanning: true });
        this.holdTimer = window.setTimeout(hop, 5000);
      });
      this.set({ scanning: true });
    };
    hop();
  }

  setVolume(volume: number) {
    this.set({ volume: Math.max(0, Math.min(1, Math.round(volume * 10) / 10)) });
    this.remix();
  }
}

export const radio = new RadioEngine();

export function useRadio() {
  const [snap, setSnap] = useState(radio.state);
  useEffect(() => radio.subscribe(setSnap), []);
  return snap;
}
