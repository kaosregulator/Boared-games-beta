/** The owner's cartridges, served from public/roms and run by EmulatorJS in public/emu. */
export interface Cartridge {
  id: string;
  title: string;
  /** How the title reads in a sentence. */
  name: string;
  publisher: string;
  rom: string;
  core: 'nes' | 'gb';
  /** Label colours for the cartridge drawn in the picker. */
  label: string;
  ink: string;
}

export const CARTRIDGES: Cartridge[] = [
  {
    id: 'tetris',
    title: 'TETRIS',
    name: 'Tetris',
    publisher: 'Nintendo · 1989',
    rom: '/roms/tetris.nes',
    core: 'nes',
    label: 'linear-gradient(135deg, #e0362f, #f7c948 55%, #2f8fe0)',
    ink: '#ffffff',
  },
  {
    id: 'pacman',
    title: 'PAC-MAN',
    name: 'Pac-Man',
    publisher: 'Namco · 1993',
    rom: '/roms/pacman.nes',
    core: 'nes',
    label: 'radial-gradient(circle at 30% 40%, #ffe14d 0 22%, #10123a 23%)',
    ink: '#ffe14d',
  },
];

/** Game Boy Game Paks: the owner's own copy, run on the gambatte core. */
export const GAME_PAKS: Cartridge[] = [
  {
    id: 'tetris-gb',
    title: 'TETRIS',
    name: 'Tetris',
    publisher: 'Nintendo · 1989',
    rom: '/roms/tetris-gb.gb',
    core: 'gb',
    label: '#9bbc0f',
    ink: '#0f380f',
  },
];

export function cartridgeSrc(c: Cartridge, volume = 0.7) {
  const q = new URLSearchParams({ rom: c.rom, core: c.core, name: c.title, volume: String(volume) });
  return `/emu/play.html?${q.toString()}`;
}

/** libretro pad slots EmulatorJS understands, for the on-device buttons. */
export const PAD = { B: 0, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7, A: 8 } as const;

let warmed = false;

/**
 * Fetch what the cartridge player needs into the browser cache while the room
 * is idle, so sitting down with the Game Boy boots the game straight away.
 */
export function warmCartridges() {
  if (warmed || typeof window === 'undefined') return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;
  warmed = true;
  // EmulatorJS takes the "-legacy" core build when there is no WebGL 2.
  const legacy = typeof WebGL2RenderingContext === 'undefined' ? '-legacy' : '';
  const files = [
    '/emu/data/loader.js',
    '/emu/data/emulator.min.js',
    '/emu/data/emulator.min.css',
    '/emu/data/compression/extract7z.js',
    '/emu/data/cores/reports/gambatte.json',
    `/emu/data/cores/gambatte${legacy}-wasm.data`,
    ...GAME_PAKS.map(c => c.rom),
  ];
  for (const f of files) void fetch(f, { priority: 'low' } as RequestInit).catch(() => {});
}
