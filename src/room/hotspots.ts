import type { LAYOUT } from './roomLayout';

/**
 * Every Tripo prop is one mesh, but a desk mesh has a lamp, a clock, tapes
 * and a Walkman baked into it. A hotspot is an invisible box around one of
 * those things so it can have its own card.
 *
 * Boxes are in the prop's placed frame: metres, floor at y = 0, +z toward
 * the prop's front. Points were picked off the real meshes with the
 * `?pick-probe=<prop>&pick=x,y` dev view, so `z` below is the item's front
 * surface and the box extends back from it.
 */
export interface Hotspot {
  /** Card id (see propCards.ts), or the game id for a box on the shelf. */
  id: string;
  /** Centre x, y and the front-face z. */
  at: [number, number, number];
  size: [number, number, number];
  /** Game boxes open the game card instead of a memory card. */
  gameId?: string;
}

const h = (id: string, x: number, y: number, zFront: number, w: number, ht: number, d: number, gameId?: string): Hotspot => ({
  id,
  at: [x, y, zFront],
  size: [w, ht, d],
  gameId,
});

export const HOTSPOTS: Partial<Record<keyof typeof LAYOUT, Hotspot[]>> = {
  nightstand: [
    h('ns-clock', -0.28, 0.58, 0.06, 0.27, 0.12, 0.13),
    h('ns-lava', 0.026, 0.71, -0.06, 0.14, 0.36, 0.14),
    h('ns-mug', 0.03, 0.58, 0.17, 0.1, 0.11, 0.1),
    h('ns-teddy', 0.18, 0.63, 0.07, 0.16, 0.21, 0.14),
    h('ns-recorder', 0.336, 0.594, 0.22, 0.12, 0.15, 0.1),
    h('ns-yoshi', -0.23, 0.4, 0.27, 0.14, 0.12, 0.03),
    h('ns-tapes', -0.19, 0.17, 0.19, 0.26, 0.19, 0.2),
    h('ns-vhs', 0.04, 0.18, 0.19, 0.19, 0.21, 0.2),
    h('ns-gameboy', 0.224, 0.18, 0.2, 0.16, 0.2, 0.1),
  ],
  teddy: [
    h('sh-lava', -0.625, 0.45, 0.11, 0.11, 0.38, 0.11),
    h('sh-vhs', -0.406, 0.408, 0.07, 0.29, 0.31, 0.15),
    h('sh-car', -0.438, 0.294, 0.16, 0.18, 0.07, 0.08),
    h('sh-teddy', -0.115, 0.429, 0.12, 0.31, 0.38, 0.2),
    h('sh-gameboy', 0.073, 0.408, -0.05, 0.2, 0.27, 0.06),
    h('sh-turtle', 0.219, 0.356, -0.03, 0.13, 0.21, 0.08),
    h('sh-viewmaster', 0.521, 0.44, 0.17, 0.34, 0.14, 0.16),
    h('sh-books', 0.51, 0.3, 0.145, 0.44, 0.1, 0.2),
  ],
  toyshelf: [
    h('ts-teddy', -0.763, 0.807, -0.24, 0.27, 0.27, 0.2),
    h('ts-handheld', -0.557, 0.733, -0.225, 0.16, 0.15, 0.1),
    h('ts-clock', -0.299, 0.88, -0.075, 0.37, 0.16, 0.15),
    h('ts-skateboard', -0.337, 0.425, 0.28, 0.3, 0.75, 0.1),
    h('ts-vhs', 0.229, 0.909, -0.075, 0.42, 0.22, 0.2),
    h('ts-lava', 0.587, 1.07, -0.03, 0.13, 0.57, 0.13),
    h('ts-pokebox', 0.117, 0.616, 0.215, 0.37, 0.3, 0.2),
    h('ts-magazines', 0.117, 0.249, 0.215, 0.37, 0.3, 0.2),
  ],
  shelf: [
    h('gs-helmet', -0.364, 1.754, 0.19, 0.4, 0.37, 0.3),
    h('gs-smiley', 0.023, 1.777, 0.03, 0.3, 0.3, 0.2),
    h('gs-plant', 0.456, 1.799, 0.07, 0.3, 0.4, 0.25),
    h('gs-lights', -0.66, 1.0, 0.26, 0.1, 1.85, 0.12),
    h('box-shelf-monopoly', -0.114, 1.367, 0.225, 0.88, 0.19, 0.3, 'monopoly'),
    h('box-shelf-battleship', -0.114, 1.153, 0.225, 0.88, 0.19, 0.3, 'battleship'),
    h('box-shelf-sorry', -0.114, 0.957, 0.225, 0.88, 0.19, 0.3, 'pawnrush'),
    h('box-shelf-clue', -0.114, 0.743, 0.225, 0.88, 0.19, 0.3, 'clue'),
    h('box-shelf-life', -0.114, 0.538, 0.225, 0.88, 0.19, 0.3, 'life'),
    h('box-shelf-yahtzee', -0.114, 0.296, 0.225, 0.88, 0.19, 0.3, 'yahtzee'),
  ],
  dresser: [
    h('dr-stickers', -0.33, 0.58, 0.325, 0.17, 0.38, 0.03),
    h('dr-nofear', 0, 0.224, 0.32, 0.23, 0.15, 0.03),
  ],
  door: [
    h('door-poster', -0.024, 1.393, -0.025, 0.53, 0.63, 0.03),
    h('door-cap', 0.367, 1.858, 0.19, 0.26, 0.4, 0.2),
    h('door-pins', 0.333, 1.271, -0.02, 0.12, 0.5, 0.04),
  ],
  crt: [
    h('crt-vcr', 0, 0.532, 0.225, 0.54, 0.08, 0.3),
    h('crt-cable', -0.064, 0.605, 0.2, 0.39, 0.055, 0.28),
  ],
  bed: [h('bed-pillow', 0.032, 0.718, -0.17, 0.27, 0.24, 0.15)],
  clutterdesk: [
    h('cd-lava', -0.786, 0.93, -0.27, 0.12, 0.42, 0.12),
    h('cd-cup', -0.623, 0.76, -0.34, 0.11, 0.2, 0.11),
    h('cd-tapes', -0.396, 0.78, -0.31, 0.33, 0.28, 0.22),
    h('cd-car', -0.616, 0.69, -0.13, 0.15, 0.06, 0.12),
    h('cd-clock', -0.829, 0.72, 0.11, 0.31, 0.15, 0.22),
    h('cd-phone', -0.401, 0.66, -0.08, 0.11, 0.05, 0.2),
    h('cd-pogs', -0.52, 0.66, 0.15, 0.2, 0.05, 0.26),
    h('cd-sketch', -0.077, 0.665, 0.25, 0.42, 0.04, 0.46),
    h('cd-lamp', 0.09, 0.95, -0.21, 0.22, 0.3, 0.26),
    h('cd-frog', -0.06, 0.77, -0.31, 0.07, 0.12, 0.08),
    h('cd-8ball', 0.052, 0.72, -0.33, 0.08, 0.08, 0.08),
    h('cd-photo', 0.134, 0.78, -0.4, 0.13, 0.18, 0.06),
    h('cd-tmnt', 0.258, 0.78, -0.3, 0.1, 0.21, 0.1),
    h('cd-walkman', 0.38, 0.74, -0.02, 0.22, 0.2, 0.26),
    h('cd-snes', 0.588, 0.69, 0.135, 0.27, 0.06, 0.25),
    h('cd-yoyo', 0.714, 0.67, 0.205, 0.1, 0.06, 0.1),
    h('cd-sonic', 0.881, 0.69, 0.19, 0.14, 0.05, 0.31),
    h('cd-vhs', 0.66, 0.82, -0.26, 0.45, 0.34, 0.2),
    h('cd-trophy', 0.87, 0.76, -0.205, 0.07, 0.17, 0.07),
    h('cd-stickers', 0.576, 0.339, 0.2, 0.66, 0.44, 0.04),
    h('cd-chair', -0.112, 0.45, 0.75, 0.5, 0.85, 0.5),
  ],
  desk: [
    h('dk-books', -0.518, 0.758, -0.1, 0.36, 0.2, 0.2),
    h('dk-vhs', -0.19, 0.875, -0.2, 0.26, 0.3, 0.2),
    h('dk-photo', 0.029, 0.846, -0.41, 0.18, 0.19, 0.05),
    h('dk-pencils', 0.26, 0.78, -0.32, 0.24, 0.26, 0.12),
    h('dk-pager', 0.416, 0.703, -0.43, 0.13, 0.09, 0.06),
    h('dk-lamp', 0.54, 0.86, -0.2, 0.3, 0.4, 0.3),
    h('dk-sticker', 0.561, 0.233, 0.175, 0.24, 0.2, 0.03),
  ],
};
