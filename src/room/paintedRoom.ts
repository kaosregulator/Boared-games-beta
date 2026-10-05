import { GameId } from '../types';

export const ROOM_ART = '/room-concept.jpg';
export const ROOM_ART_RATIO = 1536 / 1024;

export type RoomStation = 'wide' | 'shelf' | 'tv' | 'door' | 'bed';

export interface ViewStation {
  id: RoomStation;
  /** Frame height as a percent of the viewport height. */
  height: number;
  /** Shift the framed artwork, in percent of its own size. */
  tx: number;
  ty: number;
  label: string;
}

export const STATIONS: Record<RoomStation, ViewStation> = {
  wide: { id: 'wide', height: 100, tx: 0, ty: 0, label: 'The bedroom' },
  shelf: { id: 'shelf', height: 230, tx: -29, ty: 14, label: 'Game shelf' },
  tv: { id: 'tv', height: 200, tx: 5, ty: 12, label: 'CRT' },
  door: { id: 'door', height: 190, tx: -14, ty: 16, label: 'Portal door' },
  bed: { id: 'bed', height: 180, tx: 22, ty: 2, label: 'Bed' },
};

export interface PaintedHotspot {
  id: string;
  label: string;
  hint: string;
  station: RoomStation;
  /** Percent of the concept frame (includes the storyboard strip). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Playable catalog id. Empty means the box is in the room but not a shipped game yet. */
  gameId?: GameId;
  launchNote?: string;
}

export const PAINTED_HOTSPOTS: PaintedHotspot[] = [
  {
    id: 'monopoly',
    label: 'Monopoly',
    hint: 'Take this box and play Monopoly on the table.',
    station: 'shelf',
    x: 76.8,
    y: 16.6,
    w: 19.4,
    h: 6.6,
    gameId: 'monopoly',
  },
  {
    id: 'battleship',
    label: 'Battleship',
    hint: 'Take this box and play.',
    station: 'shelf',
    x: 76.8,
    y: 23.4,
    w: 19.4,
    h: 6.4,
    gameId: 'battleship',
  },
  {
    id: 'sorry',
    label: 'Sorry!',
    hint: 'Take this box and play Sorry.',
    station: 'shelf',
    x: 76.8,
    y: 30.0,
    w: 19.4,
    h: 6.4,
    gameId: 'pawnrush',
  },
  {
    id: 'clue',
    label: 'Clue',
    hint: 'Take this box and play Clue.',
    station: 'shelf',
    x: 76.8,
    y: 36.6,
    w: 19.4,
    h: 6.4,
    gameId: 'clue',
  },
  {
    id: 'life',
    label: 'The Game of Life',
    hint: 'Take this box and play Life.',
    station: 'shelf',
    x: 76.6,
    y: 43.2,
    w: 19.6,
    h: 7.4,
    gameId: 'life',
  },
  {
    id: 'yahtzee',
    label: 'Yahtzee',
    hint: 'Take this box and play Yahtzee.',
    station: 'shelf',
    x: 76.8,
    y: 50.8,
    w: 19.4,
    h: 6.2,
    gameId: 'yahtzee',
  },
  {
    id: 'crt',
    label: 'CRT — PLAY',
    hint: 'Walk to the TV. Press play to jump into Battleship.',
    station: 'tv',
    x: 41.5,
    y: 18.5,
    w: 15.5,
    h: 16.5,
    gameId: 'battleship',
    launchNote: 'PLAY',
  },
  {
    id: 'door',
    label: 'I Want to Believe',
    hint: 'The portal door. Pack 02 still lives on the other side.',
    station: 'door',
    x: 63.5,
    y: 2.5,
    w: 12.5,
    h: 28,
  },
  {
    id: 'boombox',
    label: 'Boombox',
    hint: 'Floor stereo. Toggle the room hush.',
    station: 'wide',
    x: 56.5,
    y: 49,
    w: 10,
    h: 10,
  },
];

export const STORY_STEPS = [
  'Walk to shelf',
  'Choose a game',
  'Take out the box',
  'Open the box',
  'Game sets up',
  'Play the game!',
  'Pack up & return',
  'Back to room',
];
