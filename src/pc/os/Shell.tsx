import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppWindows } from '../apps';
import { Bios, PoweredOff, SafeToTurnOff, Splash, StartingWindows } from './Boot';
import { onPowerButton, toRoom, useRoomFocus } from './bridge';
import { Cursor } from './Cursor';
import { Desktop } from './Desktop';
import { Dos } from './Dos';
import { Icon } from './icons';
import { Login } from './Login';
import { Screensaver } from './Screensaver';
import { getSettings, hourglass, useSettings } from './settings';
import { preloadSamples, resume, setRoomLevel, setVolume, sfx } from './sound';
import { StartMenu, Taskbar } from './Taskbar';
import { closeAll, getWm } from './wm';
import { Bsod, useGagOverlay, useRandomGags, Y2KOverlay } from './gags';

type Phase = 'off' | 'bios' | 'starting' | 'splash' | 'login' | 'welcome' | 'desktop' | 'shutting' | 'safe' | 'dos';

const bootNow = new URLSearchParams(location.search).has('boot');

export function Shell() {
  const [phase, setPhase] = useState<Phase>(bootNow ? 'bios' : 'off');
  const [startOpen, setStartOpen] = useState(false);
  const [shutDialog, setShutDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [iconsIn, setIconsIn] = useState(true);
  const focus = useRoomFocus();
  const settings = useSettings();
  const lastInput = useRef(performance.now());
  const gag = useGagOverlay();
  useRandomGags(phase === 'desktop');

  useEffect(() => {
    setVolume(getSettings().volume);
  }, []);
  useEffect(() => {
    setRoomLevel(focus ? 1 : 0.35);
  }, [focus]);
  useEffect(() => {
    toRoom({ evt: 'power', on: phase !== 'off' && phase !== 'safe' });
    // fetch the Windows sounds while the BIOS counts memory
    if (phase === 'bios') preloadSamples();
  }, [phase]);

  const power = useCallback(() => {
    resume();
    closeAll();
    setPhase(p => (p === 'off' || p === 'safe' ? 'bios' : p));
  }, []);
  useEffect(() => onPowerButton(power), [power]);

  // Escape steps back to the room, F asks it for big screen; Ctrl+Esc and the
  // Windows key open Start.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      lastInput.current = performance.now();
      if (saving) {
        setSaving(false);
        return;
      }
      if ((e.key === 'Escape' && e.ctrlKey) || e.key === 'Meta' || e.key === 'OS') {
        e.preventDefault();
        if (phase === 'desktop') setStartOpen(o => !o);
        return;
      }
      // F is the room's big-screen key, unless you're typing into something.
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.altKey && !e.metaKey && !e.repeat) {
        const el = document.activeElement as HTMLElement | null;
        if (!el?.closest('input, textarea, select, [contenteditable="true"]')) toRoom({ evt: 'big' });
        return;
      }
      if (e.key !== 'Escape') return;
      if (startOpen) setStartOpen(false);
      else if (shutDialog) setShutDialog(false);
      else toRoom({ evt: 'escape' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, saving, shutDialog, startOpen]);

  // First click anywhere wakes the audio, if the room couldn't.
  useEffect(() => {
    const wake = () => resume();
    window.addEventListener('pointerdown', wake);
    return () => window.removeEventListener('pointerdown', wake);
  }, []);

  // Screen saver after the wait with no input, only on the desktop.
  useEffect(() => {
    if (phase !== 'desktop') return;
    const poke = () => {
      lastInput.current = performance.now();
      setSaving(s => (s ? false : s));
    };
    const events = ['pointermove', 'pointerdown', 'wheel'] as const;
    events.forEach(ev => window.addEventListener(ev, poke, { passive: true }));
    const id = window.setInterval(() => {
      const s = getSettings();
      if (s.saver === 'none') return;
      // a game or the player running doesn't count as idle
      const busyApp = getWm().windows.some(w => !w.minimized && (w.app === 'pinball' || w.app === 'media'));
      if (busyApp) lastInput.current = performance.now();
      if (performance.now() - lastInput.current > s.saverWait * 60_000) setSaving(true);
    }, 2000);
    return () => {
      events.forEach(ev => window.removeEventListener(ev, poke));
      window.clearInterval(id);
    };
  }, [phase]);

  const loggedIn = useCallback(() => {
    setPhase('welcome');
    setIconsIn(false);
    hourglass(2600);
    sfx.disk(2.2, 0.8);
    window.setTimeout(() => setIconsIn(true), 900);
    window.setTimeout(() => {
      void sfx.startup();
      setPhase('desktop');
    }, 1600);
  }, []);

  const doShutdown = (mode: 'shutdown' | 'restart' | 'dos') => {
    setShutDialog(false);
    setStartOpen(false);
    closeAll();
    if (mode === 'dos') {
      sfx.disk(1, 0.6);
      setPhase('dos');
      return;
    }
    sfx.shutdown();
    setPhase('shutting');
    window.setTimeout(() => {
      if (mode === 'restart') setPhase('bios');
      else {
        sfx.crtOff();
        setPhase('safe');
      }
    }, 3200);
  };

  const logOff = () => {
    setStartOpen(false);
    closeAll();
    sfx.shutdown();
    window.setTimeout(() => setPhase('login'), 1200);
  };

  let screen: React.ReactNode;
  switch (phase) {
    case 'off':
      screen = <PoweredOff onPower={power} />;
      break;
    case 'bios':
      screen = <Bios onDone={() => setPhase('starting')} />;
      break;
    case 'starting':
      screen = <StartingWindows onDone={() => setPhase('splash')} />;
      break;
    case 'splash':
      screen = <Splash onDone={() => setPhase('login')} />;
      break;
    case 'shutting':
      screen = <Splash shuttingDown />;
      break;
    case 'safe':
      screen = <SafeToTurnOff onPower={power} />;
      break;
    case 'dos':
      screen = (
        <Dos
          onExit={() => {
            setPhase('splash');
          }}
        />
      );
      break;
    case 'login':
      screen = (
        <>
          <Desktop />
          <Login onDone={loggedIn} />
        </>
      );
      break;
    default:
      screen = (
        <>
          <div className={iconsIn ? '' : 'icons-hidden'}>
            <Desktop />
          </div>
          {phase === 'desktop' && (
            <>
              <AppWindows />
              {startOpen && <div className="click-catcher" onPointerDown={() => setStartOpen(false)} />}
              {startOpen && (
                <StartMenu
                  onClose={() => setStartOpen(false)}
                  onShutDown={() => {
                    setStartOpen(false);
                    setShutDialog(true);
                  }}
                  onLogOff={logOff}
                />
              )}
            </>
          )}
          <Taskbar
            startOpen={startOpen}
            onStart={() => {
              if (phase !== 'desktop') return;
              sfx.click();
              setStartOpen(o => !o);
            }}
          />
          {shutDialog && <ShutDownDialog onCancel={() => setShutDialog(false)} onOk={doShutdown} />}
        </>
      );
  }

  const showCursor = phase === 'login' || phase === 'welcome' || phase === 'desktop';
  return (
    <div className={`screen${phase === 'off' ? ' off' : ''}`}>
      {screen}
      {saving && phase === 'desktop' && (
        <div className="saver-wrap" onPointerMove={() => setSaving(false)} onPointerDown={() => setSaving(false)}>
          <Screensaver kind={settings.saver} />
        </div>
      )}
      {gag?.kind === 'bsod' && <Bsod step={gag.step} />}
      {gag?.kind === 'y2k' && <Y2KOverlay step={gag.step} />}
      {showCursor && !saving && <Cursor forced={phase === 'welcome' ? 'wait' : undefined} />}
      <div className="crt-glass" aria-hidden />
    </div>
  );
}

function ShutDownDialog({ onCancel, onOk }: { onCancel: () => void; onOk: (mode: 'shutdown' | 'restart' | 'dos') => void }) {
  const [mode, setMode] = useState<'shutdown' | 'restart' | 'dos'>('shutdown');
  useEffect(() => sfx.ding(), []);
  return (
    <div className="shutdown-dim">
      <div className="window shutdown-box">
        <div className="title-bar">
          <div className="title-bar-text">Shut Down Windows</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onCancel} />
          </div>
        </div>
        <div className="window-body" style={{ display: 'flex', gap: 14, padding: '10px 12px' }}>
          <Icon name="shutdown" />
          <div>
            <p style={{ marginTop: 0 }}>What do you want the computer to do?</p>
            {(
              [
                ['shutdown', 'Shut down'],
                ['restart', 'Restart'],
                ['dos', 'Restart in MS-DOS mode'],
              ] as const
            ).map(([v, label]) => (
              <div className="field-row" key={v}>
                <input id={`sd-${v}`} type="radio" name="sd" checked={mode === v} onChange={() => setMode(v)} />
                <label htmlFor={`sd-${v}`}>{label}</label>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 14, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => onOk(mode)}>
                OK
              </button>
              <button type="button" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" disabled>
                Help
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
