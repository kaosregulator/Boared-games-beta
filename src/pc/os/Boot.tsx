import React, { useEffect, useMemo, useState } from 'react';
import { clouds } from './art';
import { Flag } from './icons';
import { sfx } from './sound';

/**
 * Power on to the login box: the tube warming up, the BIOS memory count and
 * drive detection, "Starting Windows 98...", then the sky splash with the bar
 * rolling along the bottom while the hard drive chatters. Any key or click
 * hurries it along, like hammering Esc on the real thing.
 */

const BIOS_LINES: [number, string][] = [
  [200, 'BoaredSoft Modular BIOS v4.51PG, An Energy Saver Ally'],
  [260, 'Copyright (C) 1984-98, BoaredSoft Software, Inc.'],
  [500, ''],
  [520, 'BG440BX ATX Main Board  Rev. 1.2'],
  [700, ''],
  [760, 'Main Processor : Pentium II 400MHz (100x4.0)'],
  [900, 'Memory Testing : '],
];

const DRIVES: [number, string][] = [
  [2700, 'Detecting IDE Primary Master   ... BOARED 6.4GB ULTRA DMA'],
  [3050, 'Detecting IDE Primary Slave    ... None'],
  [3300, 'Detecting IDE Secondary Master ... 32X CD-ROM'],
  [3550, 'Detecting IDE Secondary Slave  ... None'],
  [3900, ''],
  [3950, 'Floppy disk(s) fail (40) ... just kidding, Floppy A: 1.44M 3.5in'],
];

const MEMORY_KB = 65536;

export function Bios({ onDone }: { onDone: () => void }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    sfx.crtOn();
    sfx.fan(7);
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const now = performance.now() - start;
      setT(now);
      if (now > 5200) {
        onDone();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const beep = window.setTimeout(() => sfx.post(), 2450);
    const disk = window.setTimeout(() => sfx.disk(2.4, 0.6), 2700);
    const skip = () => onDone();
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(beep);
      window.clearTimeout(disk);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [onDone]);

  const mem = Math.min(MEMORY_KB, Math.max(0, Math.floor(((t - 900) / 1400) * MEMORY_KB / 1024) * 1024));
  return (
    <div className="bios crt-warm">
      <div className="bios-logo">
        <div className="bios-star">★</div>
        <div>
          <b>ENERGY SAVER</b>
          <br />
          <small>Pollution Preventer</small>
        </div>
      </div>
      {BIOS_LINES.filter(([at]) => t >= at).map(([, line], i) => (
        <div key={i}>{line}{line.startsWith('Memory') ? `${mem}K${mem >= MEMORY_KB ? ' OK' : ''}` : ''}&nbsp;</div>
      ))}
      {t > 2350 && <div>&nbsp;</div>}
      {t > 2400 && <div>Plug and Play BIOS Extension v1.0A</div>}
      {t > 2500 && <div>&nbsp;</div>}
      {DRIVES.filter(([at]) => t >= at).map(([, line], i) => (
        <div key={i}>{line}&nbsp;</div>
      ))}
      <div className="bios-foot">
        Press <b>DEL</b> to enter SETUP
        <br />
        10/26/98-i440BX-BOARED-2A69KB0FC-00
      </div>
    </div>
  );
}

export function StartingWindows({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 1500);
    return () => window.clearTimeout(id);
  }, [onDone]);
  return (
    <div className="bios">
      <div>Starting Windows 98...</div>
      <div className="blink">_</div>
    </div>
  );
}

/**
 * The splash: clouds, the waving flag, the name, and the colour bar sliding
 * along the bottom edge.
 */
export function Splash({ onDone, shuttingDown = false }: { onDone?: () => void; shuttingDown?: boolean }) {
  const sky = useMemo(() => clouds(400, 300, shuttingDown ? 31 : 98), [shuttingDown]);
  useEffect(() => {
    if (!onDone) return;
    sfx.disk(4.5, 0.75);
    const id = window.setTimeout(onDone, 4800);
    const skip = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') onDone();
    };
    window.addEventListener('keydown', skip);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', skip);
    };
  }, [onDone]);
  return (
    <div className="splash" style={{ backgroundImage: `url(${sky})` }}>
      <div className="splash-logo">
        <Flag size={110} />
        <div className="splash-text">
          <div className="splash-ms">Microsoft<sup>®</sup></div>
          <div className="splash-win">
            Windows<span className="splash-98">98</span>
          </div>
        </div>
      </div>
      {shuttingDown ? (
        <div className="splash-msg">Windows is shutting down...</div>
      ) : (
        <div className="splash-bar">
          <div className="splash-bar-run" />
        </div>
      )}
    </div>
  );
}

/** Orange on black. The best screen in Windows. */
export function SafeToTurnOff({ onPower }: { onPower: () => void }) {
  useEffect(() => {
    const go = () => onPower();
    const id = window.setTimeout(() => {
      window.addEventListener('pointerdown', go);
      window.addEventListener('keydown', go);
    }, 900);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
    };
  }, [onPower]);
  return (
    <div className="safe-off">
      <div>It's now safe to turn off</div>
      <div>your computer.</div>
      <small>(click to turn it back on)</small>
    </div>
  );
}

/** Dark tube, faint reflection. Click (or the room's power button) to switch on. */
export function PoweredOff({ onPower }: { onPower: () => void }) {
  return (
    <div className="powered-off" onClick={onPower}>
      <div className="power-hint">⏻ Click to turn on the computer</div>
    </div>
  );
}
