import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Icon } from './icons';
import { hourglass } from './settings';
import { hz, sfx, tone } from './sound';
import { closeWindow, getWm, messageBox, openWindow, updateWindow } from './wm';

/**
 * The jokes. Things that make you think the computer just died (a blue
 * screen, a frozen program, "This program has performed an illegal
 * operation"), a pop-up ad storm that multiplies when you close it, and the
 * Y2K countdown. Every one of them ends on a punchline and nothing breaks.
 */

type Overlay = null | { kind: 'bsod'; step: number } | { kind: 'y2k'; step: 'glitch' | 'panic' | 'party' };

let overlay: Overlay = null;
const listeners = new Set<() => void>();
function set(o: Overlay) {
  overlay = o;
  listeners.forEach(l => l());
}
export function useGagOverlay() {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => overlay,
  );
}

/** Say it out loud, if the browser can. */
export function speak(text: string, { pitch = 1, rate = 1 } = {}) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = pitch;
    u.rate = rate;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* no voice */
  }
}

// ---------- blue screen ----------

export function bsod() {
  sfx.chord();
  set({ kind: 'bsod', step: 0 });
}

const BSOD_LINES = [
  'A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) +',
  '00010E36. The current application will be terminated.',
  '',
  '*  Press any key to terminate the current application.',
  '*  Press CTRL+ALT+DEL again to restart your computer. You will',
  '   lose any unsaved information in all applications.',
];

export function Bsod({ step }: { step: number }) {
  useEffect(() => {
    const next = () => {
      if (step === 0) {
        set({ kind: 'bsod', step: 1 });
        hourglass(1600);
        window.setTimeout(() => {
          set(null);
          messageBox('Windows', {
            icon: 'info',
            text: 'Just kidding. 😜\n\nWindows has recovered from a serious error.\n(It was not serious. Nothing was lost. Your high scores are safe.)',
            sound: 'tada',
          });
        }, 1600);
      }
    };
    const id = window.setTimeout(() => {
      window.addEventListener('keydown', next);
      window.addEventListener('pointerdown', next);
    }, 700);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', next);
      window.removeEventListener('pointerdown', next);
    };
  }, [step]);
  if (step === 1) return <div className="gag-black" />;
  return (
    <div className="bsod">
      <div className="bsod-title">
        <span>Windows</span>
      </div>
      {BSOD_LINES.map((l, i) => (
        <div key={i}>{l || ' '}</div>
      ))}
      <div className="bsod-continue">
        Press any key to continue <span className="blink">_</span>
      </div>
    </div>
  );
}

// ---------- not responding / illegal operation ----------

const DETAILS = [
  'PINBALL caused an invalid page fault in\nmodule KERNEL32.DLL at 0167:bff9d3ff.\n\nRegisters:\nEAX=c00309e8 CS=0167 EIP=bff9d3ff\nCause: too much fun.',
  'EXPLORER caused a general protection fault\nin module USER.EXE at 0004:00003b4a.\n\nCause: someone picked up the phone.',
  'MSPAINT caused an invalid page fault in\nmodule CRAYON.DLL at 0137:00ff00ff.\n\nCause: ran out of cyan.',
];

/** The focused window freezes, the title says (Not Responding), then the famous dialog. */
export function freeze() {
  const { windows, focused } = getWm();
  const win = windows.find(w => w.id === focused && w.app !== 'dialog' && !w.minimized);
  if (!win) return false;
  const title = win.title;
  updateWindow(win.id, { title: `${title} (Not Responding)` });
  hourglass(4200);
  const block = document.createElement('div');
  block.className = 'gag-freeze';
  block.dataset.cursor = 'wait';
  document.querySelector('.screen')?.appendChild(block);
  window.setTimeout(() => {
    block.remove();
    updateWindow(win.id, { title });
    const program = win.title.split(' - ').pop()?.toUpperCase().replace(/\s+/g, '') ?? 'PROGRAM';
    const details = DETAILS[Math.floor(Math.random() * DETAILS.length)];
    const show = (more: boolean) =>
      messageBox(program, {
        icon: 'error',
        text: `This program has performed an illegal operation and will be shut down.\n\nIf the problem persists, contact the program vendor.${more ? `\n\n${details}` : ''}`,
        buttons: more ? ['Close'] : ['Close', 'Details >>'],
        sound: 'chord',
        onButton: b => {
          if (b === 'Details >>') show(true);
          else window.setTimeout(() => messageBox(program, { icon: 'info', text: "...just kidding. It's fine. Carry on. 😎", sound: 'ding' }), 400);
        },
      });
    show(false);
  }, 4200);
  return true;
}

// ---------- pop-up ad storm ----------

const ADS = [
  { title: 'CONGRATULATIONS!!!', body: 'You are the 1,000,000th visitor!!!\nClick OK to claim your FREE Pentium II computer!!!', color: '#ff0', button: 'CLAIM NOW!!!' },
  { title: 'Punch the Monkey!', body: 'PUNCH THE MONKEY AND WIN $20!!!', color: '#ffd27a', button: 'PUNCH!', monkey: true },
  { title: 'Your computer is running SLOW!', body: 'Your computer may be infected with 4,096 viruses!\nDownload SpeedUp98 Pro NOW!', color: '#f66', button: 'Fix Now' },
  { title: 'HOT SINGLES IN YOUR AREA', body: 'Just kidding. It\'s HOT POCKETS in your area.\nThey are in the microwave. 2 minutes.', color: '#ff9ad5', button: 'Mmm' },
  { title: 'Free Screensavers!!', body: 'Dancing baby! Flying toasters! Download 500 screensavers FREE!!!', color: '#9f9', button: 'Download' },
  { title: 'Make $$$ from home!', body: 'Forward this to 10 friends and Bill Gates will send you $1,000!\n(This is real. My cousin got a check.)', color: '#7df', button: 'Forward' },
];

let storm = 0;

export function popupStorm(count = 1) {
  for (let i = 0; i < count; i += 1) {
    const ad = ADS[Math.floor(Math.random() * ADS.length)];
    openWindow({
      app: 'popup',
      title: ad.title,
      icon: 'ie',
      w: 280,
      h: ad.monkey ? 190 : 150,
      x: 40 + Math.random() * 440,
      y: 20 + Math.random() * 360,
      arg: ad,
    });
  }
  tone(hz(84), 0, 0.12, { type: 'square', gain: 0.03 });
}

/** Closing one opens two more, until the "antivirus" shows up and sweeps them all. */
export function closePopup(id: number) {
  closeWindow(id);
  storm += 1;
  if (storm < 5) popupStorm(storm < 3 ? 2 : 1);
  else if (storm === 5) {
    window.setTimeout(() => {
      openWindow({ app: 'antivirus', title: 'Norton AntiVirus 98 (just kidding, it\'s Mom)', icon: 'warning', w: 340, h: 170 });
    }, 500);
  }
}

export function Popup({ ad, id }: { ad: (typeof ADS)[number]; id: number }) {
  const [x, setX] = useState(0);
  const [won, setWon] = useState(false);
  useEffect(() => {
    if (!ad.monkey) return;
    const iv = window.setInterval(() => setX(v => (v + 7) % 220), 60);
    return () => window.clearInterval(iv);
  }, [ad.monkey]);
  return (
    <div className="popup-ad" style={{ background: ad.color }}>
      <div className="popup-blink">{ad.title}</div>
      <p>{won ? 'YOU WIN!!!\n...the monkey. You win the monkey.' : ad.body}</p>
      {ad.monkey && !won && (
        <div className="monkey-lane">
          <button type="button" className="monkey" style={{ left: x }} onClick={() => setWon(true)}>
            🐒
          </button>
        </div>
      )}
      <button type="button" onClick={() => closePopup(id)}>
        {ad.button}
      </button>
    </div>
  );
}

export function AntiVirus({ id }: { id: number }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const iv = window.setInterval(() => setP(v => Math.min(100, v + 4)), 120);
    return () => window.clearInterval(iv);
  }, []);
  useEffect(() => {
    if (p < 100) return;
    getWm()
      .windows.filter(w => w.app === 'popup')
      .forEach(w => closeWindow(w.id));
    storm = 0;
    sfx.tada();
  }, [p]);
  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Icon name="warning" />
        <span>{p < 100 ? 'Scanning for pop-ups, dancing babies and chain letters...' : 'All clear! 6 pop-ups removed. Please stop clicking on monkeys.'}</span>
      </div>
      <div className="progress-98">
        <div style={{ width: `${p}%` }} />
      </div>
      <button type="button" disabled={p < 100} onClick={() => closeWindow(id)} style={{ alignSelf: 'flex-end' }}>
        OK
      </button>
    </div>
  );
}

// ---------- Y2K ----------

/** Countdown window: ten seconds to midnight, December 31, 1999. */
export function Y2KClock({ id }: { id: number }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      closeWindow(id);
      y2kMidnight();
      return;
    }
    tone(left <= 3 ? hz(88) : hz(76), 0, 0.08, { type: 'square', gain: 0.05 });
    const t = window.setTimeout(() => setLeft(left - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, id]);
  const days = Math.max(0, Math.ceil((new Date(2000, 0, 1).getTime() - new Date(1998, 9, 26).getTime()) / 86_400_000));
  return (
    <div className="y2k">
      <div className="y2k-title">Y2K COUNTDOWN</div>
      {left === null ? (
        <>
          <div className="y2k-days">{days} DAYS LEFT</div>
          <p>Are you ready for the Millennium Bug? Stock up on canned food, cash and batteries!</p>
          <button type="button" onClick={() => setLeft(10)}>
            Skip to New Year's Eve 1999
          </button>
        </>
      ) : (
        <>
          <div className="y2k-date">12/31/1999</div>
          <div className="y2k-digits">11:59:{String(60 - left).padStart(2, '0')} PM</div>
          <div className="y2k-left">{left}</div>
        </>
      )}
    </div>
  );
}

function y2kMidnight() {
  set({ kind: 'y2k', step: 'glitch' });
  for (let i = 0; i < 12; i += 1) tone(200 + Math.random() * 2000, i * 0.07, 0.06, { type: 'sawtooth', gain: 0.04 });
  window.setTimeout(() => set({ kind: 'y2k', step: 'panic' }), 1600);
  window.setTimeout(() => {
    set({ kind: 'y2k', step: 'party' });
    sfx.tada();
    speak('Happy New Year! Nothing happened!', { pitch: 1.2 });
  }, 5600);
  window.setTimeout(() => set(null), 10500);
}

export function Y2KOverlay({ step }: { step: 'glitch' | 'panic' | 'party' }) {
  if (step === 'glitch') {
    return (
      <div className="y2k-glitch">
        <div>01/01/1900 12:00 AM</div>
        <div>01/01/19100</div>
        <div>ERR0R: Y34R 0UT 0F R4NG3</div>
      </div>
    );
  }
  if (step === 'panic') {
    return (
      <div className="y2k-panic">
        <h1>⚠ Y2K DETECTED ⚠</h1>
        <p>The year is now 1900.</p>
        <p>Your VCR is blinking 12:00 forever.</p>
        <p>The toaster has become self-aware.</p>
        <p>Grandma's bank account now has $-9,999,999.</p>
        <p className="blink">Please remain calm.</p>
      </div>
    );
  }
  return (
    <div className="y2k-party" onPointerDown={() => set(null)}>
      <div className="confetti" aria-hidden>
        {Array.from({ length: 60 }, (_, i) => (
          <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 12) * 0.15}s`, background: ['#f24f1c', '#80bb00', '#00a2ed', '#ffb900', '#f0f'][i % 5] }} />
        ))}
      </div>
      <h1>HAPPY NEW YEAR 2000!</h1>
      <p>...and absolutely nothing happened.</p>
      <p>All that canned food in the garage, though.</p>
    </div>
  );
}

// ---------- the random scheduler ----------

/**
 * Once you've been on the desktop a while, one joke at a time: a frozen
 * program, a blue screen, or a pop-up. Never during the first few minutes,
 * and never two in a row too close.
 */
export function useRandomGags(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let timer = 0;
    const schedule = (first: boolean) => {
      const wait = (first ? 150 : 240) * 1000 + Math.random() * 180_000;
      timer = window.setTimeout(() => {
        const roll = Math.random();
        if (overlay) {
          /* busy */
        } else if (roll < 0.4) {
          if (!freeze()) popupStorm(1);
        } else if (roll < 0.7) bsod();
        else popupStorm(1);
        schedule(false);
      }, wait);
    };
    schedule(true);
    return () => window.clearTimeout(timer);
  }, [active]);

  // Ctrl+Alt+Del: the Close Program box
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'End')) {
        e.preventDefault();
        const names = ['Explorer', 'Systray', ...getWm().windows.map(w => w.title)];
        messageBox('Close Program', {
          icon: 'warning',
          text: `${names.join('\n')}\n\nWARNING: Pressing CTRL+ALT+DEL again will restart your computer. You will lose unsaved information in all programs that are running.`,
          buttons: ['End Task', 'Cancel'],
          sound: 'exclaim',
          onButton: b => b === 'End Task' && bsod(),
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

// for poking at the jokes from the console while testing
(window as unknown as { __gag?: Record<string, () => unknown> }).__gag = { bsod, freeze, popups: () => popupStorm(1), y2k: () => openWindow({ app: 'y2k', title: 'Y2K Countdown', icon: 'warning', w: 300, h: 240 }) };
