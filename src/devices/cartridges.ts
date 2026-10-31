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

let warmPromise: Promise<void> | null = null;
const cartridgeDone = new Set<string>();

export function cartridgeWarmList() {
  // EmulatorJS only takes the WebGL2 build of a core when its report sets
  // defaultWebGL2 (or a player switched it on in its own settings menu, which
  // the room hides). Neither report does, so every browser plays the -legacy
  // file. Warming the other one left the Game Boy downloading its core on the
  // spot every first time.
  return [
    '/emu/data/loader.js',
    '/emu/data/emulator.min.js',
    '/emu/data/emulator.min.css',
    '/emu/data/compression/extract7z.js',
    '/emu/data/cores/reports/gambatte.json',
    '/emu/data/cores/gambatte-legacy-wasm.data',
    // The NES under the TV: same player, its own core.
    '/emu/data/cores/reports/fceumm.json',
    '/emu/data/cores/fceumm-legacy-wasm.data',
    ...GAME_PAKS.map(c => c.rom),
    ...CARTRIDGES.map(c => c.rom),
  ];
}

/** Files from `files` that have not been fetched successfully yet. */
export function cartridgesStillCold(files: readonly string[], done: ReadonlySet<string>) {
  return files.filter(file => !done.has(file));
}

/**
 * Fetch what the cartridge player needs into the browser cache while the room
 * is idle, so sitting down with the Game Boy boots the game straight away.
 * A file that already arrived is not requested again.
 */
export function warmCartridges(signal?: AbortSignal): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) {
    warmPromise = Promise.resolve();
    return warmPromise;
  }
  if (warmPromise) return warmPromise;
  const pending = cartridgesStillCold(cartridgeWarmList(), cartridgeDone);
  if (pending.length === 0) {
    warmPromise = Promise.resolve();
    return warmPromise;
  }
  let incomplete = false;
  warmPromise = Promise.all(
    pending.map(file => {
      if (signal?.aborted) return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
      return fetch(file, { priority: 'low', signal } as RequestInit).then(
        res => {
          if (res.ok) cartridgeDone.add(file);
          else incomplete = true;
        },
        err => {
          if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) throw err;
          incomplete = true;
        },
      );
    }),
  )
    .then(() => {
      if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
      if (incomplete) throw new Error('cartridge warm incomplete');
    })
    .catch(err => {
      warmPromise = null;
      throw err;
    });
  return warmPromise;
}

export function resetCartridgeWarmForTests() {
  warmPromise = null;
  cartridgeDone.clear();
}
