import { GameId } from '../types';

export type InteractableKind = 'game' | 'prop';

export interface ShelfGameSlot {
  id: GameId;
  label: string;
  shortLabel: string;
  color: string;
  accent: string;
  shelfRow: number; // 0 = top playable row, 1 = middle, 2 = lower
  shelfCol: number;
}

/** Playable shelf lineup for Game Room Beta (Pack 01). */
export const SHELF_GAMES: ShelfGameSlot[] = [
  { id: 'trivia', label: 'Trivia Party', shortLabel: 'TRIVIA', color: '#4c1d95', accent: '#fbbf24', shelfRow: 0, shelfCol: 0 },
  { id: 'poker', label: "Texas Hold'em", shortLabel: 'POKER', color: '#78350f', accent: '#fcd34d', shelfRow: 0, shelfCol: 1 },
  { id: 'battleship', label: 'Battleship', shortLabel: 'SHIP', color: '#0c4a6e', accent: '#38bdf8', shelfRow: 0, shelfCol: 2 },
  { id: 'connect4', label: 'Connect Four', shortLabel: 'C4', color: '#1e3a8a', accent: '#f59e0b', shelfRow: 1, shelfCol: 0 },
  { id: 'chess', label: 'Chess', shortLabel: 'CHESS', color: '#292524', accent: '#d6d3d1', shelfRow: 1, shelfCol: 1 },
  { id: 'casino', label: 'Casino Lounge', shortLabel: 'CASINO', color: '#064e3b', accent: '#34d399', shelfRow: 1, shelfCol: 2 },
  { id: 'blackjack', label: 'Blackjack', shortLabel: '21', color: '#14532d', accent: '#86efac', shelfRow: 2, shelfCol: 0 },
  { id: 'pawnrush', label: 'Sorry!', shortLabel: 'SORRY', color: '#881337', accent: '#fb7185', shelfRow: 2, shelfCol: 1 },
  { id: 'liarsdice', label: "Liar's Dice", shortLabel: 'LIAR', color: '#854d0e', accent: '#fde047', shelfRow: 2, shelfCol: 2 },
];

export const ROOM = {
  width: 10,
  depth: 9,
  height: 3.2,
  playerHeight: 1.55,
  walkSpeed: 3.4,
  sprintMultiplier: 1.55,
  /** Soft collision bounds (inner playable area). */
  bounds: {
    minX: -4.2,
    maxX: 4.2,
    minZ: -3.6,
    maxZ: 3.6,
  },
  shelf: {
    position: [3.55, 0, -0.2] as [number, number, number],
    width: 1.35,
    height: 2.35,
    depth: 0.42,
  },
  spawn: {
    position: [0.2, 1.55, 2.6] as [number, number, number],
    lookAt: [2.4, 1.35, -0.2] as [number, number, number],
  },
};

export const PROP_INTERACTABLES = [
  {
    id: 'crt-tv',
    label: 'CRT TV — Quick Launch',
    hint: 'Click to open the classic shelf menu (beta fallback)',
    position: [-1.9, 1.15, -3.55] as [number, number, number],
  },
  {
    id: 'portal-door',
    label: 'Portal Door',
    hint: 'Pack 02 coming soon — step closer to peek',
    position: [0.15, 1.35, -4.15] as [number, number, number],
  },
  {
    id: 'boombox',
    label: 'Boombox',
    hint: 'Toggle room ambience',
    position: [2.1, 0.28, 2.4] as [number, number, number],
  },
  {
    id: 'gameboy',
    label: 'Game Boy',
    hint: 'Handheld vibes — no cartridge loaded (beta)',
    position: [-3.4, 0.72, -1.1] as [number, number, number],
  },
] as const;

export type PropInteractableId = (typeof PROP_INTERACTABLES)[number]['id'];
