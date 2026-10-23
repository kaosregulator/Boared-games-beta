import React, { useEffect, useMemo, useRef, useState } from 'react';
import { setPadFrame } from '../devices/gameboyBus';
import { CHANNELS, guideRow, nowSeconds, snickOnAir, type Channel } from './channels';
import { resolveArchive } from './archive';
import { channelClick, paintSnow, startStatic, type StaticHandle } from './noise';
import { snickShowAt } from './snick';
import { blockOnAir } from './lineups/archiveBlocks';
import { CARTRIDGES, cartridgeSrc, type Cartridge } from '../devices/cartridges';
import { TV247_ON } from './tv247';
import { YouTubeTv } from './YouTubeTv';
import { PICK_NUMBER, setPick } from './lineups/youtube247';

export type TvMode = 'off' | 'menu' | 'tv' | 'guide' | 'gaming' | 'emulator' | 'link';

/** WATCH TV, GAMING, and (with the 24/7 switch on) PLAY A YOUTUBE LINK. */
const MENU_COUNT = TV247_ON ? 3 : 2;

export interface TvCommand {
  /** Bumped on every press so the same button twice still fires. */
  seq: number;
  key: 'power' | 'menu' | 'guide' | 'chUp' | 'chDown' | 'volUp' | 'volDown' | 'ok' | 'back' | 'game';
}

interface TvScreenProps {
  width: number;
  height: number;
  command: TvCommand | null;
  initialMode: TvMode;
  /** Reports what the cable box LED and the room should show. */
  onStatus?: (status: { mode: TvMode; channel: number; volume: number }) => void;
  /** Left on in the room: it keeps showing the channel, and the keys belong to walking. */
  inRoom?: boolean;
}

const NEON = '#39ff14';
const OSD_FONT = '"IBM Plex Mono", ui-monospace, monospace';

/** Last channel and volume survive leaning out of the TV and back in. */
const memory = { channel: 2, volume: 0.8 };

function clockLabel(at: Date) {
  return at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function halfHour(at: Date, step: number) {
  const d = new Date(at);
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0);
  d.setMinutes(d.getMinutes() + step * 30);
  return clockLabel(d);
}

/**
 * Everything that appears on the glass: the power-on menu, live cable
 * channels from the Internet Archive with snow between them, the scrolling
 * guide, and the cartridge slot. Lives inside a drei <Html transform>.
 */
export function TvScreen({ width, height, command, initialMode, onStatus, inRoom = false }: TvScreenProps) {
  const [mode, setMode] = useState<TvMode>(initialMode);
  const [channel, setChannel] = useState(memory.channel);
  const [volume, setVolume] = useState(memory.volume);
  const [menuIndex, setMenuIndex] = useState(initialMode === 'gaming' ? 1 : 0);
  const [guideIndex, setGuideIndex] = useState(() => Math.max(0, CHANNELS.findIndex(c => c.number === memory.channel)));
  const [cartIndex, setCartIndex] = useState(0);
  const [cart, setCart] = useState<Cartridge | null>(null);
  const [tuning, setTuning] = useState(false);
  const [retune, setRetune] = useState(0);
  const [signal, setSignal] = useState<'ok' | 'none'>('ok');
  const [osd, setOsd] = useState<string | null>(null);
  const [lowerThird, setLowerThird] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const video = useRef<HTMLVideoElement>(null);
  const snow = useRef<HTMLCanvasElement>(null);
  const hiss = useRef<StaticHandle | null>(null);
  const tuneToken = useRef(0);
  const osdTimer = useRef<number | null>(null);
  const guideList = useRef<HTMLDivElement>(null);
  const emu = useRef<HTMLIFrameElement>(null);
  /** The YouTube channel reports back through here: locked on, or nothing plays. */
  const ytTune = useRef<{ onPlaying: (label: string) => void; onFail: () => void } | null>(null);
  const [linkText, setLinkText] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  const showOsd = (text: string, ms = 2600) => {
    setOsd(text);
    if (osdTimer.current) window.clearTimeout(osdTimer.current);
    osdTimer.current = window.setTimeout(() => setOsd(null), ms);
  };

  useEffect(() => {
    memory.channel = channel;
    memory.volume = volume;
    onStatus?.({ mode, channel, volume });
  }, [channel, mode, onStatus, volume]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  // Snow animates whenever the set is between stations.
  useEffect(() => {
    if (!tuning && signal === 'ok') return;
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      if (snow.current) paintSnow(snow.current, (performance.now() - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [tuning, signal]);

  useEffect(
    () => () => {
      hiss.current?.stop(0.05);
      if (osdTimer.current) window.clearTimeout(osdTimer.current);
    },
    [],
  );

  const watching = mode === 'tv' || mode === 'guide';

  // Tune: snow + hiss, look the item up, seek to where the channel is "live", fade the hiss.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (!watching) {
      el.pause();
      hiss.current?.stop(0.05);
      hiss.current = null;
      setTuning(false);
      return;
    }
    const ch = CHANNELS.find(c => c.number === channel) ?? CHANNELS[0];
    const token = ++tuneToken.current;
    setTuning(true);
    setSignal('ok');
    channelClick();
    hiss.current?.stop(0.02);
    hiss.current = startStatic(volume, 'tv');
    showOsd(`CH ${String(ch.number).padStart(2, '0')}  ${ch.call}`);
    const tunedAt = performance.now();

    if (ch.kind === 'youtube') {
      // The YouTube player (rendered below) does the playing; the set just waits for it to lock.
      el.pause();
      el.removeAttribute('src');
      let ytGiveUp = window.setTimeout(() => {
        if (token !== tuneToken.current) return;
        setTuning(false);
        setSignal('none');
        hiss.current?.setLevel(volume * 0.45);
      }, 20000);
      ytTune.current = {
        onPlaying: label => {
          if (token !== tuneToken.current) return;
          const wait = Math.max(0, 650 - (performance.now() - tunedAt));
          window.setTimeout(() => {
            if (token !== tuneToken.current) return;
            window.clearTimeout(ytGiveUp);
            setTuning(false);
            setSignal('ok');
            hiss.current?.stop(0.25);
            hiss.current = null;
            setLowerThird(label);
            window.setTimeout(() => setLowerThird(cur => (cur === label ? null : cur)), 4200);
          }, wait);
        },
        onFail: () => {
          if (token !== tuneToken.current) return;
          window.clearTimeout(ytGiveUp);
          setTuning(false);
          setSignal('none');
          hiss.current?.setLevel(volume * 0.45);
        },
      };
      return () => {
        window.clearTimeout(ytGiveUp);
        ytGiveUp = 0;
      };
    }
    ytTune.current = null;

    const lookup =
      ch.kind === 'snick'
        ? (() => {
            const air = snickOnAir();
            return resolveArchive(air.episode[0], 'video', air.episode[2]).then(file =>
              file ? { file, offset: air.offset, label: snickShowAt(air.episode, air.offset) } : null,
            );
          })()
        : ch.kind === 'block'
        ? (() => {
            const air = blockOnAir(ch.block, nowSeconds());
            return resolveArchive(ch.block.id, 'video', air.part.file).then(file =>
              file ? { file, offset: air.offset, label: air.part.title } : null,
            );
          })()
        : resolveArchive((ch as Extract<Channel, { kind: 'cartoon' }>).cartoon.id, 'video').then(file =>
            file
              ? { file, offset: file.length ? nowSeconds() % file.length : -1, label: (ch as Extract<Channel, { kind: 'cartoon' }>).cartoon.title }
              : null,
          );

    let giveUp = window.setTimeout(() => {
      if (token !== tuneToken.current) return;
      setTuning(false);
      setSignal('none');
      hiss.current?.setLevel(volume * 0.45);
    }, 14000);

    lookup.then(found => {
      if (token !== tuneToken.current) return;
      if (!found) {
        window.clearTimeout(giveUp);
        setTuning(false);
        setSignal('none');
        hiss.current?.setLevel(volume * 0.45);
        return;
      }
      el.src = found.file.url;
      el.volume = volume;
      const onMeta = () => {
        const length = Number.isFinite(el.duration) ? el.duration : found.file.length ?? 0;
        const at = found.offset >= 0 ? found.offset : length > 0 ? nowSeconds() % length : 0;
        if (length > 0 && at > 0 && at < length - 5) el.currentTime = at;
      };
      const onPlaying = () => {
        if (token !== tuneToken.current) return;
        // Hold the snow a beat, the way a set takes a moment to lock on.
        const wait = Math.max(0, 650 - (performance.now() - tunedAt));
        window.setTimeout(() => {
          if (token !== tuneToken.current) return;
          window.clearTimeout(giveUp);
          setTuning(false);
          setSignal('ok');
          hiss.current?.stop(0.25);
          hiss.current = null;
          setLowerThird(found.label);
          window.setTimeout(() => setLowerThird(cur => (cur === found.label ? null : cur)), 4200);
        }, wait);
      };
      const onError = () => {
        if (token !== tuneToken.current) return;
        window.clearTimeout(giveUp);
        setTuning(false);
        setSignal('none');
        hiss.current?.setLevel(volume * 0.45);
      };
      el.addEventListener('loadedmetadata', onMeta, { once: true });
      el.addEventListener('playing', onPlaying, { once: true });
      el.addEventListener('error', onError, { once: true });
      void el.play().catch(() => {
        // Autoplay with sound refused: keep the picture, mute, and say so.
        el.muted = true;
        void el.play().catch(onError);
        showOsd('MUTED — PRESS VOL +', 4000);
      });
    });

    return () => {
      window.clearTimeout(giveUp);
      giveUp = 0;
    };
    // volume is applied separately; retuning on volume would restart the stream
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, watching, retune]);

  useEffect(() => {
    if (video.current) {
      video.current.volume = volume;
      if (volume > 0) video.current.muted = false;
    }
    hiss.current?.setLevel(volume * (signal === 'none' ? 0.45 : 1));
    emu.current?.contentWindow?.postMessage({ source: 'room', type: 'volume', value: volume }, location.origin);
  }, [volume, signal]);

  // Keep the highlighted guide row in view.
  useEffect(() => {
    if (mode !== 'guide') return;
    const row = guideList.current?.children[guideIndex] as HTMLElement | undefined;
    row?.scrollIntoView({ block: 'nearest' });
  }, [guideIndex, mode]);

  const stepChannel = (dir: number) => {
    const i = CHANNELS.findIndex(c => c.number === channel);
    const next = CHANNELS[(i + dir + CHANNELS.length) % CHANNELS.length];
    setChannel(next.number);
    setGuideIndex(CHANNELS.indexOf(next));
  };

  const pickMenu = (index: number) => {
    if (index === 0) setMode('tv');
    else if (index === 1) setMode('gaming');
    else {
      setLinkError(null);
      setMode('link');
    }
  };

  /** Paste-a-link: put it on the "Your pick" channel and tune there. */
  const playLink = () => {
    if (!setPick(linkText)) {
      setLinkError("That isn't a YouTube video link.");
      return;
    }
    setLinkError(null);
    setChannel(PICK_NUMBER);
    setGuideIndex(Math.max(0, CHANNELS.findIndex(c => c.number === PICK_NUMBER)));
    setRetune(r => r + 1);
    setMode('tv');
  };

  const insert = (c: Cartridge) => {
    channelClick();
    setCart(c);
    setMode('emulator');
  };

  // Front-panel and cable-box buttons.
  useEffect(() => {
    if (!command) return;
    const vol = (d: number) => {
      setVolume(v => {
        const next = Math.round(Math.min(1, Math.max(0, v + d)) * 10) / 10;
        showOsd(`VOL ${'|'.repeat(Math.round(next * 20)).padEnd(20, '·')}`, 1600);
        return next;
      });
    };
    switch (command.key) {
      case 'power':
        channelClick();
        setMode(m => (m === 'off' ? 'menu' : 'off'));
        break;
      case 'menu':
        setMode(m => (m === 'off' ? m : 'menu'));
        break;
      case 'game':
        channelClick();
        setMenuIndex(1);
        setMode('gaming');
        break;
      case 'guide':
        setMode(m => (m === 'off' ? m : m === 'guide' ? 'tv' : 'guide'));
        break;
      case 'volUp':
        vol(0.1);
        break;
      case 'volDown':
        vol(-0.1);
        break;
      case 'chUp':
      case 'chDown': {
        const dir = command.key === 'chUp' ? 1 : -1;
        if (mode === 'menu') setMenuIndex(i => (i + MENU_COUNT + dir) % MENU_COUNT);
        else if (mode === 'guide') setGuideIndex(i => (i - dir + CHANNELS.length) % CHANNELS.length);
        else if (mode === 'gaming') setCartIndex(i => (i + CARTRIDGES.length + dir) % CARTRIDGES.length);
        else if (mode === 'tv') stepChannel(dir);
        break;
      }
      case 'ok':
        if (mode === 'menu') pickMenu(menuIndex);
        else if (mode === 'guide') {
          setChannel(CHANNELS[guideIndex].number);
          setMode('tv');
        } else if (mode === 'gaming') insert(CARTRIDGES[cartIndex]);
        else if (mode === 'link') playLink();
        break;
      case 'back':
        setMode(m => (m === 'emulator' ? 'gaming' : m === 'off' ? m : 'menu'));
        break;
    }
    // Only react to new presses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command?.seq]);

  // Stepping back with the set on leaves the last channel playing in the room
  // until POWER; coming back over to it from the NES goes straight to the games.
  useEffect(() => {
    if (inRoom) setMode(m => (m === 'off' || m === 'tv' ? m : 'tv'));
    else if (initialMode === 'gaming') {
      setMenuIndex(1);
      setMode(m => (m === 'off' || m === 'emulator' ? m : 'gaming'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRoom]);

  // Keyboard on the TV: arrows = channel/selection, Enter = OK, G = guide, M = menu.
  useEffect(() => {
    if (inRoom || mode === 'emulator' || mode === 'off' || mode === 'link') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        const dir = e.code === 'ArrowUp' ? 1 : -1;
        if (mode === 'menu') setMenuIndex(i => (i + MENU_COUNT + dir) % MENU_COUNT);
        else if (mode === 'guide') setGuideIndex(i => (i - dir + CHANNELS.length) % CHANNELS.length);
        else if (mode === 'gaming') setCartIndex(i => (i + CARTRIDGES.length - dir) % CARTRIDGES.length);
        else if (mode === 'tv') stepChannel(dir);
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        if (mode === 'gaming') setCartIndex(i => (i + CARTRIDGES.length + (e.code === 'ArrowRight' ? 1 : -1)) % CARTRIDGES.length);
        if (mode === 'menu') setMenuIndex(i => (i + MENU_COUNT + (e.code === 'ArrowRight' ? 1 : -1)) % MENU_COUNT);
      } else if (e.code === 'Enter') {
        if (mode === 'menu') pickMenu(menuIndex);
        else if (mode === 'guide') {
          setChannel(CHANNELS[guideIndex].number);
          setMode('tv');
        } else if (mode === 'gaming') insert(CARTRIDGES[cartIndex]);
      } else if (e.code === 'KeyG') {
        setMode(m => (m === 'guide' ? 'tv' : 'guide'));
      } else if (e.code === 'KeyM') {
        setMode('menu');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, menuIndex, guideIndex, cartIndex, channel, inRoom]);

  useEffect(() => {
    if (mode !== 'emulator') return;
    setPadFrame(emu.current);
    const focus = window.setTimeout(() => emu.current?.focus(), 400);
    return () => {
      window.clearTimeout(focus);
      setPadFrame(null);
    };
  }, [mode, cart]);

  const current = CHANNELS.find(c => c.number === channel) ?? CHANNELS[0];
  const rows = useMemo(() => CHANNELS.map(c => ({ c, ...guideRow(c) })), [now]); // eslint-disable-line react-hooks/exhaustive-deps

  const box: React.CSSProperties = {
    width,
    height,
    position: 'relative',
    overflow: 'hidden',
    background: '#000',
    borderRadius: 18,
    fontFamily: OSD_FONT,
    color: NEON,
    userSelect: 'none',
  };

  const videoStyle: React.CSSProperties =
    mode === 'guide'
      ? { position: 'absolute', left: 18, top: 16, width: width * 0.42, height: height * 0.36, objectFit: 'cover', border: '3px solid #f4f1c8' }
      : { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };

  return (
    <div style={box} data-ui="tv">
      <video
        ref={video}
        playsInline
        preload="auto"
        style={{ ...videoStyle, visibility: watching && current.kind !== 'youtube' ? 'visible' : 'hidden', background: '#000' }}
        onEnded={() => {
          // SNICK rolls straight into the next archived Saturday.
          if (current.kind === 'snick' || current.kind === 'block') setRetune(r => r + 1);
          else if (video.current) {
            video.current.currentTime = 0;
            void video.current.play();
          }
        }}
      />

      {watching && current.kind === 'youtube' && (
        <YouTubeTv
          key={`${current.number}-${retune}`}
          channel={current.yt}
          style={videoStyle}
          volume={volume}
          onPlaying={label => ytTune.current?.onPlaying(label)}
          onFail={() => ytTune.current?.onFail()}
          onMuted={() => showOsd('MUTED — PRESS VOL +', 4000)}
        />
      )}

      {watching && (tuning || signal === 'none') && (
        <canvas
          ref={snow}
          width={160}
          height={120}
          style={{
            position: mode === 'guide' ? 'absolute' : 'absolute',
            ...(mode === 'guide'
              ? { left: 18, top: 16, width: width * 0.42, height: height * 0.36 }
              : { inset: 0, width: '100%', height: '100%' }),
            imageRendering: 'pixelated',
            opacity: signal === 'none' && !tuning ? 0.7 : 1,
          }}
        />
      )}

      {mode === 'tv' && signal === 'none' && !tuning && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <p style={{ fontSize: 34, fontWeight: 700, background: 'rgba(0,0,0,0.55)', padding: '6px 14px' }}>NO SIGNAL</p>
        </div>
      )}

      {mode === 'tv' && osd && (
        <p style={{ position: 'absolute', right: 26, top: 18, fontSize: 30, fontWeight: 700, textShadow: '2px 2px 0 #000' }}>{osd}</p>
      )}
      {mode === 'tv' && lowerThird && !tuning && (
        <div
          style={{
            position: 'absolute',
            left: 24,
            bottom: 22,
            maxWidth: width - 48,
            background: 'rgba(0,0,0,0.6)',
            padding: '6px 12px',
            fontSize: 20,
            fontWeight: 700,
            textShadow: '2px 2px 0 #000',
          }}
        >
          {String(current.number).padStart(2, '0')} {current.call} · {lowerThird}
        </div>
      )}

      {mode === 'off' && <div style={{ position: 'absolute', inset: 0, background: '#020202' }} />}

      {mode === 'menu' && (
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 40%, #12305a, #050a18 70%)', padding: 34 }}>
          <p style={{ fontSize: 22, letterSpacing: 4, color: '#9fe7ff' }}>CHANNEL MASTER · INPUT</p>
          <p style={{ fontSize: 15, color: '#9fe7ff', opacity: 0.75, marginTop: 4 }}>{clockLabel(now)}</p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MENU_COUNT}, 1fr)`, gap: 22, marginTop: height * 0.12 }}>
            {['WATCH TV', 'GAMING', 'YOUTUBE LINK'].slice(0, MENU_COUNT).map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setMenuIndex(i);
                  pickMenu(i);
                }}
                onPointerEnter={() => setMenuIndex(i)}
                style={{
                  height: height * 0.42,
                  borderRadius: 14,
                  border: `4px solid ${menuIndex === i ? '#ffe45c' : '#2a5c8a'}`,
                  background: menuIndex === i ? '#173f6b' : '#0b2340',
                  color: menuIndex === i ? '#ffe45c' : '#9fe7ff',
                  fontFamily: OSD_FONT,
                  fontSize: MENU_COUNT > 2 ? 28 : 34,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {label}
                <span style={{ display: 'block', fontSize: 15, marginTop: 10, opacity: 0.8 }}>
                  {i === 0 ? `${CHANNELS.length} cable channels` : i === 1 ? 'NES cartridges' : 'Paste a link, it plays 24/7'}
                </span>
              </button>
            ))}
          </div>
          <p style={{ position: 'absolute', bottom: 18, left: 34, fontSize: 14, color: '#9fe7ff', opacity: 0.8 }}>
            CH ▲▼ to choose · OK on the cable box · or click
          </p>
        </div>
      )}

      {mode === 'link' && (
        <form
          onSubmit={e => {
            e.preventDefault();
            playLink();
          }}
          style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 40%, #5a1212, #180505 70%)', padding: 34, color: '#ffe0e0' }}
        >
          <p style={{ fontSize: 22, letterSpacing: 4, color: '#ff9f9f' }}>YOUTUBE · YOUR PICK</p>
          <p style={{ fontSize: 15, opacity: 0.8, marginTop: 4 }}>Paste a YouTube link. It plays on channel {PICK_NUMBER}, all day, like a real channel.</p>
          <input
            value={linkText}
            onChange={e => setLinkText(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            autoFocus
            inputMode="url"
            spellCheck={false}
            style={{
              marginTop: height * 0.1,
              width: '100%',
              height: 64,
              fontSize: 24,
              fontFamily: OSD_FONT,
              padding: '0 16px',
              borderRadius: 12,
              border: '4px solid #ffe45c',
              background: '#1a0606',
              color: '#fff',
            }}
          />
          {linkError && <p style={{ fontSize: 18, color: '#ffd166', marginTop: 10 }}>{linkError}</p>}
          <div style={{ display: 'flex', gap: 16, marginTop: 22 }}>
            <button
              type="submit"
              style={{ flex: 1, height: 64, borderRadius: 12, border: 0, background: '#ffe45c', color: '#3a0a0a', fontFamily: OSD_FONT, fontSize: 26, fontWeight: 800, cursor: 'pointer' }}
            >
              ▶ PLAY ON CH {PICK_NUMBER}
            </button>
            <button
              type="button"
              onClick={() => setMode('menu')}
              style={{ width: 160, height: 64, borderRadius: 12, border: '3px solid #ff9f9f', background: 'transparent', color: '#ffe0e0', fontFamily: OSD_FONT, fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
            >
              BACK
            </button>
          </div>
        </form>
      )}

      {mode === 'guide' && (
        <div style={{ position: 'absolute', inset: 0, background: '#0d1b6e', color: '#f4f1c8' }}>
          <div style={{ position: 'absolute', left: width * 0.42 + 36, right: 18, top: 16, height: height * 0.36 }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#ffe45c', letterSpacing: 2 }}>CABLE GUIDE</p>
            <p style={{ fontSize: 18, marginTop: 6 }}>{now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            <p style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{clockLabel(now)}</p>
            <p style={{ fontSize: 15, marginTop: 8, color: '#9fe7ff' }}>
              Now on {current.number}: {rows.find(r => r.c.number === current.number)?.now}
            </p>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: height * 0.36 + 30,
              height: 28,
              display: 'grid',
              gridTemplateColumns: '24% 38% 38%',
              background: '#2b3fb8',
              fontSize: 16,
              fontWeight: 700,
              alignItems: 'center',
            }}
          >
            <span style={{ paddingLeft: 12 }}>CH</span>
            <span>{halfHour(now, 0)}</span>
            <span>{halfHour(now, 1)}</span>
          </div>
          <div
            ref={guideList}
            onWheel={e => setGuideIndex(i => (i + (e.deltaY > 0 ? 1 : -1) + CHANNELS.length) % CHANNELS.length)}
            style={{ position: 'absolute', left: 0, right: 0, top: height * 0.36 + 58, bottom: 0, overflow: 'hidden' }}
          >
            {rows.map(({ c, now: on, next }, i) => (
              <div
                key={c.number}
                onClick={() => {
                  setGuideIndex(i);
                  setChannel(c.number);
                  setMode('tv');
                }}
                onPointerEnter={() => setGuideIndex(i)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24% 38% 38%',
                  height: 34,
                  alignItems: 'center',
                  fontSize: 16,
                  cursor: 'pointer',
                  borderBottom: '2px solid #071048',
                  background: i === guideIndex ? '#ffe45c' : i % 2 ? '#14268c' : '#0f1f7c',
                  color: i === guideIndex ? '#0d1b6e' : '#f4f1c8',
                  fontWeight: i === guideIndex ? 800 : 600,
                }}
              >
                <span style={{ paddingLeft: 12, whiteSpace: 'nowrap' }}>
                  {String(c.number).padStart(2, '0')} {c.call}
                </span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>{on}</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8, opacity: 0.85 }}>{next}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'gaming' && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(#1b1b1f, #050505)', padding: 30, color: '#e8e8e8' }}>
          <p style={{ fontSize: 22, letterSpacing: 4, color: '#ff4d4d', fontWeight: 800 }}>NINTENDO ENTERTAINMENT SYSTEM</p>
          <p style={{ fontSize: 15, opacity: 0.7, marginTop: 4 }}>Pick a cartridge</p>
          <div style={{ display: 'flex', gap: 26, justifyContent: 'center', marginTop: height * 0.08 }}>
            {CARTRIDGES.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => insert(c)}
                onPointerEnter={() => setCartIndex(i)}
                style={{
                  width: width * 0.3,
                  height: height * 0.52,
                  borderRadius: '10px 10px 4px 4px',
                  background: '#8b8b8f',
                  border: `5px solid ${cartIndex === i ? '#ffe45c' : '#5a5a5e'}`,
                  boxShadow: cartIndex === i ? '0 0 26px rgba(255,228,92,0.5)' : 'none',
                  padding: 12,
                  cursor: 'pointer',
                  fontFamily: OSD_FONT,
                }}
              >
                <div style={{ height: '72%', borderRadius: 4, background: c.label, display: 'grid', placeItems: 'center', border: '3px solid #2a2a2a' }}>
                  <span style={{ fontSize: 30, fontWeight: 900, color: c.ink, textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}>{c.title}</span>
                </div>
                <p style={{ fontSize: 13, color: '#222', fontWeight: 800, marginTop: 8 }}>{c.publisher}</p>
              </button>
            ))}
          </div>
          <p style={{ position: 'absolute', bottom: 16, left: 30, right: 30, fontSize: 14, opacity: 0.75 }}>
            Arrows move · Z = A · X = B · Enter = Start · V = Select · MENU leaves the game
          </p>
        </div>
      )}

      {mode === 'emulator' && cart && (
        <iframe
          ref={emu}
          title={cart.title}
          src={cartridgeSrc(cart, volume)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, background: '#000' }}
          allow="autoplay; gamepad"
        />
      )}

      {/* Glass: scanlines and a vignette over everything the tube shows. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 2px, transparent 4px), radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
          borderRadius: 18,
        }}
      />
    </div>
  );
}
