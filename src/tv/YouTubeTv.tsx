import React, { useEffect, useRef } from 'react';
import { nowSeconds } from './channels';
import { ytOnAir, ytShowAt, type YtChannel } from './lineups/youtube247';
import { YT_STATE, liveOffset, loadYouTubeApi, type YTNamespace, type YTPlayer } from './youtube';

interface YouTubeTvProps {
  channel: YtChannel;
  style: React.CSSProperties;
  volume: number;
  /** The picture locked on, or a new show started (its title). */
  onPlaying: (title: string) => void;
  /** Nothing on this channel will play. */
  onFail: () => void;
  /** The browser would only start it muted. */
  onMuted: () => void;
  /** Throwback Trivia borrowed the speakers. */
  quiet?: boolean;
}

/** One YouTube player on the glass: the one on air, or the next video waiting behind it. */
interface Slot {
  wrap: HTMLDivElement;
  player: YTPlayer | null;
  index: number;
  /** Still needs to drop into the live point once it knows its length. */
  needsSeek: boolean;
  /** Standby only: playing muted for a moment so it is buffered and ready. */
  warming: boolean;
}

/** How long before a video ends the next one is loaded behind it. */
const PRELOAD_SECONDS = 60;

/**
 * One 24/7 YouTube channel on the TV glass. Starts the video that is "on air"
 * at the point it would have reached on the shared clock, loads the next video
 * out of sight before this one ends and cuts straight to it, starts over after
 * the last one, and quietly skips any that won't play.
 */
export function YouTubeTv({ channel, style, volume, onPlaying, onFail, onMuted, quiet = false }: YouTubeTvProps) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  /** The browser refused sound, so it plays muted until the volume is touched. */
  const forcedMute = useRef(false);
  const quietRef = useRef(quiet);
  quietRef.current = quiet;
  const pausedByHold = useRef(false);
  const cb = useRef({ onPlaying, onFail, onMuted });
  cb.current = { onPlaying, onFail, onMuted };

  useEffect(() => {
    const air = ytOnAir(channel, nowSeconds());
    if (!air) {
      cb.current.onFail();
      return;
    }
    const links = channel.links;
    let alive = true;
    let locked = false;
    let fails = 0;
    let muteTimer = 0;
    let poll = 0;
    let lastShow = '';
    let active: Slot | null = null;
    let standby: Slot | null = null;

    const drop = (s: Slot | null) => {
      if (!s) return;
      try {
        s.player?.destroy();
      } catch {
        // already gone
      }
      s.wrap.remove();
    };

    const sound = (p: YTPlayer) => {
      p.setVolume(Math.round(volumeRef.current * 100));
      if (forcedMute.current) p.mute();
      else if (volumeRef.current > 0) p.unMute();
    };

    // The caption names the show inside a long block, and changes when the next one starts.
    const announce = (s: Slot) => {
      const p = s.player;
      if (!p) return;
      const link = links[s.index];
      const title = link.shows?.length ? ytShowAt(link, p.getCurrentTime()).now : p.getVideoData?.().title || link.title;
      if (title === lastShow) return;
      lastShow = title;
      cb.current.onPlaying(title);
    };

    // The first PLAYING tells us the length; that is when we drop into the live point.
    const catchUp = (s: Slot) => {
      if (!s.needsSeek || !s.player) return;
      const d = s.player.getDuration();
      if (d > 0) {
        s.needsSeek = false;
        const at = liveOffset(d, nowSeconds());
        if (at > 5) s.player.seekTo(at, true);
      }
    };

    const advance = () => {
      const cur = active;
      if (!cur?.player) return;
      if (links.length === 1) {
        cur.player.seekTo(0, true);
        cur.player.playVideo();
        return;
      }
      const nextIndex = (cur.index + 1) % links.length;
      if (standby && standby.index === nextIndex && standby.player) {
        // cut to the video that was loaded and waiting
        const next = standby;
        standby = null;
        next.warming = false;
        next.wrap.style.opacity = '1';
        active = next;
        player.current = next.player;
        drop(cur);
        const p = next.player as YTPlayer;
        p.seekTo(0, true);
        sound(p);
        p.playVideo();
        return;
      }
      drop(standby);
      standby = null;
      cur.index = nextIndex;
      cur.needsSeek = false;
      cur.player.loadVideoById({ videoId: links[nextIndex].id, startSeconds: 0 });
    };

    const make = (YT: YTNamespace, index: number, start: number, onAir: boolean): Slot | null => {
      const box = host.current;
      if (!box) return null;
      const wrap = document.createElement('div');
      wrap.style.cssText = `position:absolute;inset:0;opacity:${onAir ? 1 : 0};pointer-events:none`;
      const mount = document.createElement('div');
      wrap.appendChild(mount);
      // the waiting video sits underneath the one on air
      if (onAir) box.appendChild(wrap);
      else box.insertBefore(wrap, box.firstChild);
      const s: Slot = { wrap, player: null, index, needsSeek: onAir && links[index].seconds === undefined, warming: !onAir };
      s.player = new YT.Player(mount, {
        videoId: links[index].id,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: onAir ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          start: Math.floor(start),
          origin: window.location.origin,
        },
        events: {
          onReady: e => {
            if (!alive) return;
            const p = e.target;
            if (s !== active) {
              // buffer the next video silently; it pauses again as soon as it plays
              p.mute();
              p.playVideo();
              return;
            }
            player.current = p;
            if (quietRef.current) {
              p.pauseVideo();
              pausedByHold.current = true;
              return;
            }
            sound(p);
            p.playVideo();
            // If sound was refused, start muted rather than not at all.
            muteTimer = window.setTimeout(() => {
              if (!alive || p.getPlayerState() === YT_STATE.PLAYING) return;
              forcedMute.current = true;
              p.mute();
              p.playVideo();
              cb.current.onMuted();
            }, 3000);
          },
          onStateChange: e => {
            if (!alive) return;
            if (s !== active) {
              if (s.warming && e.data === YT_STATE.PLAYING) {
                s.warming = false;
                e.target.pauseVideo();
                e.target.seekTo(0, true);
              }
              return;
            }
            if (e.data === YT_STATE.PLAYING) {
              if (quietRef.current) {
                e.target.pauseVideo();
                pausedByHold.current = true;
                return;
              }
              catchUp(s);
              fails = 0;
              locked = true;
              announce(s);
            } else if (e.data === YT_STATE.ENDED) advance();
          },
          onError: () => {
            if (!alive) return;
            if (s !== active) {
              // the waiting video won't play: the cut falls back to loading the one after it
              if (standby === s) standby = null;
              drop(s);
              return;
            }
            // removed, private, or embedding switched off: try the next video, quietly
            fails += 1;
            if (fails < links.length) advance();
            else cb.current.onFail();
          },
        },
      });
      return s;
    };

    loadYouTubeApi()
      .then(YT => {
        if (!alive) return;
        active = make(YT, air.index, air.offset ?? 0, true);
        if (!active) return;
        player.current = active.player;
        // Keep the caption on the current show, and get the next video ready before this one ends.
        poll = window.setInterval(() => {
          const cur = active;
          if (!alive || !cur?.player || !locked) return;
          announce(cur);
          if (links.length < 2 || standby) return;
          const d = cur.player.getDuration();
          const left = d - cur.player.getCurrentTime();
          if (d > 0 && left < PRELOAD_SECONDS) standby = make(YT, (cur.index + 1) % links.length, 0, false);
        }, 4000);
      })
      .catch(() => cb.current.onFail());

    return () => {
      alive = false;
      window.clearTimeout(muteTimer);
      window.clearInterval(poll);
      drop(standby);
      drop(active);
      player.current = null;
    };
  }, [channel]);

  useEffect(() => {
    const p = player.current;
    if (!p?.pauseVideo) return;
    try {
      if (quiet) {
        p.pauseVideo();
        pausedByHold.current = true;
      } else if (pausedByHold.current) {
        pausedByHold.current = false;
        p.playVideo();
      }
    } catch {
      // not ready yet; onStateChange catches a late start
    }
  }, [quiet]);

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    try {
      p.setVolume(Math.round(volume * 100));
      if (volume > 0 && p.isMuted()) {
        p.unMute();
        forcedMute.current = false;
      }
    } catch {
      // not ready yet; onReady applies it
    }
  }, [volume]);

  return (
    <div
      ref={host}
      data-yt-channel={channel.number}
      style={{ ...style, position: style.position ?? 'absolute', background: '#000', overflow: 'hidden' }}
    />
  );
}
