import React, { useEffect, useRef } from 'react';
import { nowSeconds } from './channels';
import { isRouted, routeToSpeaker, setSpeakerVolume, unroute } from './surround';
import { adAfter, adLabel, adsOnAir, slotAfter, type Ad, type AdAir } from './lineups/ads90s';

interface AdBreakTvProps {
  style: React.CSSProperties;
  volume: number;
  /** The picture locked on, or the next spot started (its title and year). */
  onPlaying: (label: string) => void;
  /** Nothing on the channel will play. */
  onFail: () => void;
  /** The browser would only start it muted. */
  onMuted: () => void;
  /** Throwback Trivia borrowed the speakers. */
  quiet?: boolean;
}

/** Spots that won't play in a row before the set gives up and shows NO SIGNAL. */
const MAX_FAILS = 8;

/** Tuning in this close to a spot's start just starts it from the top. */
const SNAP_SECONDS = 1.5;

/**
 * Channel 90 on the TV glass. Two <video>s take turns: one is on air while
 * the next spot loads behind it, so the cut between commercials is clean the
 * way Retro Viewer's VLC playlist was. Each spot plays where the shared clock
 * says it should be, spots that won't load are skipped, and the sound goes
 * through the room's TV speaker, whose leveller brings a quiet 1993 soup ad and
 * a loud 1999 soda ad out at about the same level (archive.org sends CORS
 * headers; if a browser won't take them, the channel plays straight from the
 * <video> rather than not at all).
 */
export function AdBreakTv({ style, volume, onPlaying, onFail, onMuted, quiet = false }: AdBreakTvProps) {
  const host = useRef<HTMLDivElement>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const quietRef = useRef(quiet);
  quietRef.current = quiet;
  const cb = useRef({ onPlaying, onFail, onMuted });
  cb.current = { onPlaying, onFail, onMuted };
  /** Set by the running channel so volume and Throwback holds reach it. */
  const control = useRef<{ volume: () => void; hold: (on: boolean) => void } | null>(null);

  useEffect(() => {
    const box = host.current;
    if (!box) return;
    let alive = true;
    /** Try levelled sound first; drop it if the first spot won't load that way. */
    let cors = true;
    let everPlayed = false;
    let forcedMute = false;
    let fails = 0;
    let gapTimer = 0;
    let lastLabel = '';
    let playing: AbortController | null = null;
    let held = quietRef.current;
    let standbyAd: Ad | null = null;
    const failed = new Set<number>();

    const make = () => {
      const v = document.createElement('video');
      v.playsInline = true;
      v.preload = 'auto';
      v.crossOrigin = 'anonymous';
      // 4:3 tapes stay 4:3: pillarboxed, never stretched or cropped
      v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;opacity:0';
      box.appendChild(v);
      return v;
    };
    let active = make();
    let standby = make();

    const applyVolume = (el: HTMLVideoElement) => {
      const v = volumeRef.current;
      if (isRouted(el)) {
        el.volume = 1;
        setSpeakerVolume('tv', v);
      } else el.volume = Math.min(1, v);
      el.muted = forcedMute;
    };

    // Into the TV speaker once a spot has proven the browser accepts the CORS copy.
    const route = (el: HTMLVideoElement) => {
      if (cors) routeToSpeaker(el, 'tv');
      applyVolume(el);
    };

    const show = (el: HTMLVideoElement | null) => {
      active.style.opacity = el === active ? '1' : '0';
      standby.style.opacity = el === standby ? '1' : '0';
    };

    const load = (el: HTMLVideoElement, ad: Ad, at: number) => {
      el.src = ad.url;
      const seekTo = ad.from + at;
      if (seekTo > 0.2) {
        el.addEventListener(
          'loadedmetadata',
          () => {
            el.currentTime = seekTo;
          },
          { once: true },
        );
      }
      el.load();
    };

    const announce = (ad: Ad) => {
      const label = adLabel(ad);
      if (label === lastLabel) return;
      lastLabel = label;
      cb.current.onPlaying(label);
    };

    // Load the spot after this one behind the picture, so the cut is instant.
    const prepare = (air: AdAir) => {
      const next = adAfter(air)?.ad ?? null;
      if (!next || next === standbyAd || failed.has(next.index)) return;
      standbyAd = next;
      standby.pause();
      load(standby, next, 0);
      standby.addEventListener(
        'error',
        () => {
          if (standbyAd !== next) return;
          failed.add(next.index);
          standbyAd = null;
        },
        { once: true },
      );
    };

    const start = (el: HTMLVideoElement) => {
      applyVolume(el);
      el.play().catch((err: unknown) => {
        if (!alive || el !== active) return;
        if ((err as DOMException)?.name !== 'NotAllowedError') return;
        // Autoplay with sound refused: keep the picture, mute, and say so.
        forcedMute = true;
        el.muted = true;
        void el.play().catch(() => {});
        cb.current.onMuted();
      });
    };

    /** Put on whatever the shared clock says is airing; `after` skips past a slot that just ended or failed. */
    const sync = (after?: AdAir) => {
      if (!alive) return;
      window.clearTimeout(gapTimer);
      let air = adsOnAir(nowSeconds());
      if (air && after && air.day === after.day && air.index <= after.index) air = slotAfter(after);
      // jump over spots already known not to play
      for (let guard = 0; air && air.slot.ad && failed.has(air.slot.ad.index) && guard < 50; guard += 1) air = slotAfter(air);
      if (!air) {
        cb.current.onFail();
        return;
      }
      if (held) return;
      if (!air.slot.ad) {
        // the beat of black between breaks
        playing?.abort();
        active.pause();
        show(null);
        prepare(air);
        const gap = air;
        gapTimer = window.setTimeout(() => sync(gap), Math.max(50, (air.slot.seconds - air.offset) * 1000));
        return;
      }
      play(air);
    };

    const play = (air: AdAir) => {
      const ad = air.slot.ad as Ad;
      const offset = air.offset < SNAP_SECONDS ? 0 : air.offset;
      playing?.abort();
      const ac = new AbortController();
      playing = ac;
      if (standbyAd === ad && standby.src) {
        // cut to the spot that was loaded and waiting
        [active, standby] = [standby, active];
        standbyAd = null;
        if (offset > 0) active.currentTime = ad.from + offset;
      } else load(active, ad, offset);
      standby.pause();
      show(active);
      const el = active;
      const end = ad.from + ad.seconds - 0.08;
      let done = false;
      const finish = () => {
        if (done || ac.signal.aborted) return;
        done = true;
        sync(air);
      };
      el.addEventListener(
        'playing',
        () => {
          if (ac.signal.aborted) return;
          everPlayed = true;
          fails = 0;
          route(el);
          announce(ad);
          prepare(air);
        },
        { signal: ac.signal },
      );
      el.addEventListener('timeupdate', () => el.currentTime >= end && finish(), { signal: ac.signal });
      el.addEventListener('ended', finish, { signal: ac.signal });
      el.addEventListener(
        'error',
        () => {
          if (ac.signal.aborted) return;
          if (cors && !everPlayed) {
            // The first spot wouldn't load with CORS: play everything plainly instead.
            cors = false;
            for (const v of [active, standby]) v.removeAttribute('crossorigin');
            standbyAd = null;
            play(air);
            return;
          }
          failed.add(ad.index);
          fails += 1;
          if (fails >= MAX_FAILS) {
            cb.current.onFail();
            return;
          }
          sync(air);
        },
        { signal: ac.signal },
      );
      start(el);
    };

    control.current = {
      volume: () => {
        if (volumeRef.current > 0 && forcedMute) forcedMute = false;
        applyVolume(active);
        applyVolume(standby);
      },
      hold: on => {
        if (on === held) return;
        held = on;
        if (on) {
          window.clearTimeout(gapTimer);
          playing?.abort();
          active.pause();
        } else sync();
      },
    };

    sync();

    return () => {
      alive = false;
      control.current = null;
      window.clearTimeout(gapTimer);
      playing?.abort();
      for (const v of [active, standby]) {
        v.pause();
        v.removeAttribute('src');
        v.load();
        unroute(v);
        v.remove();
      }
    };
  }, []);

  useEffect(() => {
    control.current?.hold(quiet);
  }, [quiet]);

  useEffect(() => {
    control.current?.volume();
  }, [volume]);

  return <div ref={host} data-ads-channel style={{ ...style, position: style.position ?? 'absolute', background: '#000', overflow: 'hidden' }} />;
}
