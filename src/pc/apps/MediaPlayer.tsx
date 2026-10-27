import React, { useEffect, useRef, useState } from 'react';
import { audio, out, resume } from '../os/sound';
import { closeWindow, messageBox, type WinState } from '../os/wm';
import { VISUALIZERS } from './visualizers';

/**
 * Windows Media Player, 2000-era: the Now Playing view with visualizations
 * (arrows flip through them), a playlist, seek bar, volume and the big
 * round play button. Plays the tracks on the computer, or any audio file you
 * open from your own machine.
 */

interface Track {
  title: string;
  artist: string;
  src?: string;
  file?: File;
  credit?: string;
}

const TRACKS: Track[] = [
  {
    title: 'Brahe',
    artist: 'Punch Deck',
    src: '/pc/music/brahe.mp3',
    credit: '"Brahe" by Punch Deck, CC BY 4.0, punch-deck.com',
  },
];

const decoded = new Map<string, AudioBuffer>();
/** A song you drop in plays for this visit only, and a huge file is refused. */
export const AUDIO_LIMIT = 40 * 1024 * 1024;

export function audioFileProblem(file: { name: string; type: string; size: number }): string | null {
  const audio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name);
  if (!audio) return `"${file.name}" is not an audio file.`;
  if (file.size > AUDIO_LIMIT) return `"${file.name}" is too large to play here. Keep it under 40 MB.`;
  return null;
}

function fmt(s: number) {
  if (!Number.isFinite(s)) return '00:00';
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/** One playing track: a buffer source we restart to seek. */
class Deck {
  ctx = audio();
  gain = this.ctx.createGain();
  analyser = this.ctx.createAnalyser();
  src: AudioBufferSourceNode | null = null;
  buf: AudioBuffer | null = null;
  startedAt = 0;
  offset = 0;
  playing = false;
  onEnd: () => void = () => {};

  constructor() {
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.75;
    this.gain.connect(this.analyser);
    this.analyser.connect(out());
  }
  get time() {
    return this.playing ? this.offset + this.ctx.currentTime - this.startedAt : this.offset;
  }
  play(at = this.offset) {
    if (!this.buf) return;
    this.stopSource();
    resume();
    const src = this.ctx.createBufferSource();
    src.buffer = this.buf;
    src.connect(this.gain);
    src.onended = () => {
      if (this.src === src && this.playing && this.time >= (this.buf?.duration ?? 0) - 0.3) {
        this.playing = false;
        this.offset = 0;
        this.onEnd();
      }
    };
    this.offset = Math.max(0, Math.min(at, this.buf.duration - 0.05));
    src.start(0, this.offset);
    this.startedAt = this.ctx.currentTime;
    this.src = src;
    this.playing = true;
  }
  pause() {
    if (!this.playing) return;
    this.offset = this.time;
    this.playing = false;
    this.stopSource();
  }
  stop() {
    this.playing = false;
    this.offset = 0;
    this.stopSource();
  }
  stopSource() {
    if (!this.src) return;
    const s = this.src;
    this.src = null;
    try {
      s.stop();
    } catch {
      /* not started */
    }
    s.disconnect();
  }
  dispose() {
    this.stop();
    this.buf = null;
    this.analyser.disconnect();
    decoded.clear();
  }
}

export function MediaPlayer({ win }: { win: WinState }) {
  const deck = useRef<Deck | null>(null);
  if (!deck.current) deck.current = new Deck();
  const [tracks, setTracks] = useState<Track[]>(TRACKS);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<'stopped' | 'loading' | 'playing' | 'paused'>('stopped');
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(0.85);
  const [vis, setVis] = useState(0);
  const [tab, setTab] = useState('Now Playing');
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const visRef = useRef(vis);
  visRef.current = vis;

  const load = async (i: number, autoplay = true) => {
    const d = deck.current!;
    const tr = tracks[i];
    if (!tr) return;
    d.stop();
    setIndex(i);
    setStatus('loading');
    const key = tr.src ?? `file:${tr.file?.name}:${tr.file?.size}`;
    try {
      let buf = decoded.get(key);
      if (!buf) {
        const data = tr.file ? await tr.file.arrayBuffer() : await (await fetch(tr.src!)).arrayBuffer();
        buf = await d.ctx.decodeAudioData(data);
        decoded.set(key, buf);
      }
      d.buf = buf;
      setDur(buf.duration);
      if (autoplay) {
        d.play(0);
        setStatus('playing');
      } else setStatus('stopped');
    } catch {
      setStatus('stopped');
      messageBox('Windows Media Player', { icon: 'error', text: `Windows Media Player cannot play the file "${tr.title}".`, sound: 'chord' });
    }
  };

  useEffect(() => {
    const d = deck.current!;
    d.onEnd = () => {
      setStatus('stopped');
      setIndex(i => {
        const next = (i + 1) % tracks.length;
        if (tracks.length > 1) window.setTimeout(() => void load(next), 300);
        return i;
      });
    };
  });

  useEffect(() => {
    void load(0);
    return () => deck.current?.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    deck.current!.gain.gain.value = vol;
  }, [vol]);

  // draw the visualization and tick the clock
  useEffect(() => {
    const c = canvas.current!;
    const g = c.getContext('2d')!;
    const d = deck.current!;
    const freq = new Uint8Array(d.analyser.frequencyBinCount);
    const wave = new Uint8Array(d.analyser.fftSize);
    const states = VISUALIZERS.map(() => ({}) as Record<string, unknown>);
    let raf = 0;
    let lastVis = -1;
    let tick = 0;
    const loop = (now: number) => {
      d.analyser.getByteFrequencyData(freq);
      d.analyser.getByteTimeDomainData(wave);
      const v = visRef.current;
      if (v !== lastVis) {
        g.fillStyle = '#000';
        g.fillRect(0, 0, c.width, c.height);
        lastVis = v;
      }
      VISUALIZERS[v].draw({ g, w: c.width, h: c.height, freq, wave, t: now / 1000, state: states[v] });
      if (now - tick > 250) {
        tick = now;
        setTime(d.time);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const d = deck.current;
  const playPause = () => {
    if (status === 'playing') {
      d.pause();
      setStatus('paused');
    } else if (d.buf) {
      d.play();
      setStatus('playing');
    } else void load(index);
  };
  const stop = () => {
    d.stop();
    setStatus('stopped');
    setTime(0);
  };
  const go = (step: number) => void load((index + step + tracks.length) % tracks.length);

  const tr = tracks[index];
  const v = VISUALIZERS[vis];
  return (
    <div className="wmp">
      <input
        ref={fileInput}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={e => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (!files.length) return;
          const ok = files.filter(f => {
            const problem = audioFileProblem(f);
            if (problem) messageBox('Windows Media Player', { icon: 'error', text: problem, sound: 'chord' });
            return !problem;
          });
          if (!ok.length) return;
          const start = tracks.length;
          setTracks(t => [...t, ...ok.map(f => ({ title: f.name.replace(/\.[^.]+$/, ''), artist: 'My Music', file: f }))]);
          window.setTimeout(() => void load(start), 50);
        }}
      />
      <div className="wmp-top">
        <span className="wmp-brand">Windows Media Player</span>
        <div className="wmp-menu">
          <button type="button" onClick={() => fileInput.current?.click()}>File ▾</button>
          <button type="button" onClick={() => messageBox('About Windows Media Player', { icon: 'media', text: `${TRACKS[0].credit}\n\nVisualizations drawn for this computer.\nFile opens an audio file on your own machine, up to 40 MB. Closing the player drops it from memory.`, sound: 'none' })}>
            Help ▾
          </button>
          <button type="button" className="wmp-x" onClick={() => closeWindow(win.id)}>
            ✕
          </button>
        </div>
      </div>
      <div className="wmp-main">
        <div className="wmp-nav">
          {['Now Playing', 'Media Guide', 'CD Audio', 'Media Library', 'Radio Tuner', 'Portable Device', 'Skin Chooser'].map(n => (
            <button
              key={n}
              type="button"
              className={`wmp-tab${tab === n ? ' on' : ''}`}
              onClick={() => {
                if (n === 'Now Playing' || n === 'Media Library') setTab(n);
                else messageBox(n, { icon: 'info', text: n === 'Media Guide' || n === 'Radio Tuner' ? 'Connect to the Internet to use this feature. (Mom is on the phone.)' : `${n} is not available on this computer.`, sound: 'ding' });
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="wmp-center">
          <div className="wmp-now">
            <span>{tr ? `${tr.artist} — ${tr.title}` : ''}</span>
            <span>{status === 'loading' ? 'Opening media...' : status === 'playing' ? 'Playing' : status === 'paused' ? 'Paused' : 'Ready'}</span>
          </div>
          <canvas
            ref={canvas}
            width={300}
            height={200}
            className="wmp-vis"
            style={tab === 'Now Playing' ? undefined : { display: 'none' }}
            onClick={() => setVis(x => (x + 1) % VISUALIZERS.length)}
          />
          {tab === 'Now Playing' ? (
            <>
              <div className="wmp-visbar">
                <button type="button" onClick={() => setVis(x => (x + VISUALIZERS.length - 1) % VISUALIZERS.length)}>◀</button>
                <span>
                  {v.family}: {v.name}
                </span>
                <button type="button" onClick={() => setVis(x => (x + 1) % VISUALIZERS.length)}>▶</button>
              </div>
            </>
          ) : (
            <>
              <div className="wmp-library">
                <div className="wmp-lib-head">
                  <span>Title</span>
                  <span>Artist</span>
                </div>
                {tracks.map((t, i) => (
                  <button key={i} type="button" className={`wmp-lib-row${i === index ? ' on' : ''}`} onDoubleClick={() => void load(i)}>
                    <span>{t.title}</span>
                    <span>{t.artist}</span>
                  </button>
                ))}
                <button type="button" className="wmp-add" onClick={() => fileInput.current?.click()}>
                  + Add songs from your computer...
                </button>
              </div>
            </>
          )}
        </div>
        <div className="wmp-list">
          <div className="wmp-list-head">My Playlist</div>
          {tracks.map((t, i) => (
            <button key={i} type="button" className={`wmp-item${i === index ? ' on' : ''}`} onDoubleClick={() => void load(i)} onClick={() => i !== index && void load(i)}>
              {t.title}
            </button>
          ))}
          <button type="button" className="wmp-item add" onClick={() => fileInput.current?.click()}>
            Open...
          </button>
        </div>
      </div>
      <div className="wmp-seek">
        <input
          type="range"
          min={0}
          max={Math.max(1, dur)}
          step={0.1}
          value={Math.min(time, dur)}
          onChange={e => {
            const at = Number(e.target.value);
            setTime(at);
            if (status === 'playing') d.play(at);
            else d.offset = at;
          }}
        />
      </div>
      <div className="wmp-transport">
        <button type="button" className={`wmp-play${status === 'playing' ? ' on' : ''}`} onClick={playPause} aria-label="Play">
          {status === 'playing' ? '❚❚' : '▶'}
        </button>
        <button type="button" className="wmp-btn" onClick={stop} aria-label="Stop">
          ■
        </button>
        <button type="button" className="wmp-btn" onClick={() => go(-1)} aria-label="Previous">
          ⏮
        </button>
        <button type="button" className="wmp-btn" onClick={() => go(1)} aria-label="Next">
          ⏭
        </button>
        <span className="wmp-vol">
          🔈
          <input type="range" min={0} max={1} step={0.01} value={vol} onChange={e => setVol(Number(e.target.value))} />
        </span>
        <span className="wmp-time">
          {fmt(time)} / {fmt(dur)}
        </span>
      </div>
    </div>
  );
}
