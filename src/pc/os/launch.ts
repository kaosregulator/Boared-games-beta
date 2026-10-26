import type { IconName } from './icons';
import { hourglass } from './settings';
import { sfx } from './sound';
import { messageBox, openWindow, type AppId } from './wm';
import { openWebGame, SANDWICH_STACKER, THING_THING } from '../apps/webgames';

/** Title, icon and opening size for every program. The components live in apps/index.tsx. */
export type LaunchId = Exclude<AppId, 'dialog' | 'popup' | 'antivirus' | 'webgame'>;

export const APP_INFO: Record<LaunchId, { title: string; icon: IconName; w: number; h: number; single?: boolean; load?: number }> = {
  minesweeper: { title: 'Minesweeper', icon: 'mine', w: 170, h: 260, single: true },
  pinball: { title: '3D Pinball for Windows - Space Cadet', icon: 'pinball', w: 620, h: 520, single: true, load: 1400 },
  paint: { title: 'untitled - Paint', icon: 'paint', w: 640, h: 470, load: 700 },
  wordpad: { title: 'Document - WordPad', icon: 'wordpad', w: 600, h: 440, load: 700 },
  media: { title: 'Windows Media Player', icon: 'media', w: 470, h: 420, single: true, load: 900 },
  notepad: { title: 'Untitled - Notepad', icon: 'notepad', w: 440, h: 320 },
  explorer: { title: 'My Computer', icon: 'computer', w: 470, h: 330 },
  ie: { title: 'Microsoft Internet Explorer', icon: 'ie', w: 640, h: 480, single: true, load: 900 },
  display: { title: 'Display Properties', icon: 'display', w: 380, h: 430, single: true },
  run: { title: 'Run', icon: 'run', w: 350, h: 160, single: true },
  help: { title: 'Windows Help', icon: 'help', w: 470, h: 360, single: true },
  solitaire: { title: 'Solitaire', icon: 'solitaire', w: 600, h: 470, single: true, load: 600 },
  y2k: { title: 'Y2K Countdown', icon: 'warning', w: 300, h: 250, single: true },
  // Card games from btahir/stillplay (public/pc/stillplay/), each in an iframe.
  freecell: { title: 'FreeCell', icon: 'freecell', w: 640, h: 500, single: true, load: 600 },
  hearts: { title: 'The Microsoft Hearts Network', icon: 'hearts', w: 660, h: 566, single: true, load: 600 },
  spider: { title: 'Spider Solitaire', icon: 'spider', w: 680, h: 520, single: true, load: 600 },
  // Windows Entertainment Pack remakes.
  tetris: { title: 'Tetris', icon: 'tetris', w: 292, h: 404, single: true, load: 500 },
  taipei: { title: 'TaiPei', icon: 'taipei', w: 640, h: 500, single: true, load: 600 },
  pegged: { title: 'Pegged', icon: 'pegged', w: 330, h: 390, single: true, load: 400 },
  arcade: { title: 'Cartoon Network Arcade', icon: 'arcade', w: 520, h: 440, single: true, load: 900 },
};

export function launch(app: LaunchId, arg?: unknown, title?: string) {
  const info = APP_INFO[app];
  if (info.load) {
    hourglass(info.load);
    sfx.disk(info.load / 1000, 0.8);
  }
  const open = () => openWindow({ app, title: title ?? info.title, icon: info.icon, w: info.w, h: info.h, arg, single: info.single });
  if (info.load) window.setTimeout(open, info.load * 0.6);
  else open();
}

/** Typed into Run..., or double-clicked as a file name. */
export const COMMANDS: Record<string, () => void> = {
  winmine: () => launch('minesweeper'),
  minesweeper: () => launch('minesweeper'),
  pinball: () => launch('pinball'),
  mspaint: () => launch('paint'),
  pbrush: () => launch('paint'),
  paint: () => launch('paint'),
  wordpad: () => launch('wordpad'),
  write: () => launch('wordpad'),
  wordart: () => launch('wordpad', { wordart: true }),
  notepad: () => launch('notepad'),
  mplayer: () => launch('media'),
  wmplayer: () => launch('media'),
  iexplore: () => launch('ie'),
  explorer: () => launch('explorer', 'My Computer'),
  sol: () => launch('solitaire'),
  solitaire: () => launch('solitaire'),
  y2k: () => launch('y2k'),
  freecel: () => launch('freecell'),
  freecell: () => launch('freecell'),
  mshearts: () => launch('hearts'),
  hearts: () => launch('hearts'),
  spider: () => launch('spider'),
  tetris: () => launch('tetris'),
  tp: () => launch('taipei'),
  taipei: () => launch('taipei'),
  pegged: () => launch('pegged'),
  arcade: () => launch('arcade'),
  sandwich: () => openWebGame(SANDWICH_STACKER),
  thingthing: () => openWebGame(THING_THING),
  control: () => launch('explorer', 'Control Panel', 'Control Panel'),
  winhelp: () => launch('help'),
  'desk.cpl': () => launch('display'),
  command: () => cannot('MS-DOS Prompt', 'Restart in MS-DOS mode from Shut Down to get a C:\\> prompt.'),
  regedit: () => cannot('Registry Editor', "Nice try. Nobody's breaking this computer before Mom gets home."),
  format: () => cannot('Format', 'Absolutely not.'),
};

function cannot(title: string, text: string) {
  messageBox(title, { icon: 'warning', text, sound: 'exclaim' });
}

export function runCommand(raw: string): boolean {
  const cmd = raw.trim().toLowerCase().replace(/^.*\\/, '').replace(/\.exe$/, '');
  const fn = COMMANDS[cmd];
  if (fn) {
    fn();
    return true;
  }
  if (/^https?:|^www\./.test(cmd)) {
    launch('ie', raw.trim());
    return true;
  }
  messageBox(raw.trim() || 'Run', {
    icon: 'error',
    text: `Cannot find the file '${raw.trim()}' (or one of its components). Make sure the path and filename are correct and that all required libraries are available.`,
    sound: 'chord',
  });
  return false;
}

// Dev hook for scripts and screenshots: window.__run('taipei') is the same as typing it into Run.
(window as unknown as { __run?: typeof runCommand }).__run = runCommand;
