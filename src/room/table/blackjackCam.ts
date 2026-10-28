import type { Shot } from './tableCam';

/**
 * Where Follow action looks for each beat of a blackjack hand. Every action at
 * the table has a shot: the bet going down, each card dealt, a hit, a stand,
 * a double, a bust, the hole card turning, each dealer draw, the settle where
 * both hands are compared, the house paying out or taking the bet, and the
 * winnings sliding home to your stack.
 *
 * Positions are table-local (x right, z towards your seat).
 */

export const DEALER_ROW = -0.15;
export const PLAYER_ROW = 0.19;
/** The printed betting circle's centre on the felt. */
export const BET_AT: [number, number] = [0, 0.084];
/** Your chip stacks. */
export const BANK_AT: [number, number] = [0.31, 0.17];
/** The card shoe, where the house's chips go too. */
export const SHOE_AT: [number, number] = [0.33, -0.2];

export type BlackjackBeat =
  | 'bet'
  | 'clear'
  | 'dealPlayer'
  | 'dealDealer'
  | 'hit'
  | 'double'
  | 'stand'
  | 'bust'
  | 'flip'
  | 'dealerDraw'
  | 'dealerBust'
  | 'settle'
  | 'payout'
  | 'houseTakes'
  | 'collect';

export const BLACKJACK_BEATS: BlackjackBeat[] = [
  'bet',
  'clear',
  'dealPlayer',
  'dealDealer',
  'hit',
  'double',
  'stand',
  'bust',
  'flip',
  'dealerDraw',
  'dealerBust',
  'settle',
  'payout',
  'houseTakes',
  'collect',
];

export interface BeatShot {
  shot: Shot;
  /** How long the shot holds before the camera eases back to the table view. */
  ms: number;
}

/**
 * The shot for one beat. `x` is the card's slot across its row, so a hit or a
 * dealer draw frames the card that just landed rather than the row's middle.
 */
export function blackjackShot(beat: BlackjackBeat, x = 0): BeatShot {
  switch (beat) {
    case 'bet':
      return { shot: { target: [BET_AT[0], 0.01, BET_AT[1]], yaw: 0.15, pitch: 0.72, dist: 0.34 }, ms: 800 };
    case 'clear':
      return { shot: { target: [BANK_AT[0] - 0.05, 0.01, BANK_AT[1]], yaw: 0.3, pitch: 0.75, dist: 0.36 }, ms: 800 };
    case 'dealPlayer':
      return { shot: { target: [x * 0.5, 0, PLAYER_ROW], yaw: 0, pitch: 0.7, dist: 0.34 }, ms: 700 };
    case 'dealDealer':
      return { shot: { target: [x * 0.5, 0, DEALER_ROW], yaw: 0, pitch: 0.78, dist: 0.32 }, ms: 700 };
    case 'hit':
      return { shot: { target: [x, 0, PLAYER_ROW], yaw: 0.12, pitch: 0.66, dist: 0.27 }, ms: 900 };
    case 'double':
      // the second stake going down beside the first
      return { shot: { target: [BET_AT[0], 0.012, BET_AT[1]], yaw: -0.2, pitch: 0.6, dist: 0.3 }, ms: 750 };
    case 'stand':
      // a last look at what you're standing on, before the dealer's turn
      return { shot: { target: [0, 0, PLAYER_ROW - 0.02], yaw: -0.1, pitch: 0.82, dist: 0.36 }, ms: 750 };
    case 'bust':
      // low and close over the hand that went over
      return { shot: { target: [x, 0, PLAYER_ROW], yaw: 0.22, pitch: 0.45, dist: 0.25 }, ms: 1200 };
    case 'flip':
      return { shot: { target: [x, 0, DEALER_ROW], yaw: 0, pitch: 0.72, dist: 0.26 }, ms: 1000 };
    case 'dealerDraw':
      return { shot: { target: [x, 0, DEALER_ROW], yaw: -0.12, pitch: 0.74, dist: 0.3 }, ms: 800 };
    case 'dealerBust':
      return { shot: { target: [x * 0.5, 0, DEALER_ROW], yaw: -0.22, pitch: 0.46, dist: 0.28 }, ms: 1200 };
    case 'settle':
      // both hands in one frame, the moment they're compared
      return { shot: { target: [0, 0, (DEALER_ROW + PLAYER_ROW) / 2], yaw: 0, pitch: 1.05, dist: 0.62 }, ms: 1300 };
    case 'payout':
      return { shot: { target: [BET_AT[0], 0.012, BET_AT[1]], yaw: 0.25, pitch: 0.58, dist: 0.26 }, ms: 1200 };
    case 'houseTakes':
      return { shot: { target: [BET_AT[0] + 0.1, 0.01, BET_AT[1] - 0.12], yaw: 0.35, pitch: 0.7, dist: 0.42 }, ms: 1200 };
    case 'collect':
      return { shot: { target: [BANK_AT[0], 0.012, BANK_AT[1]], yaw: 0.4, pitch: 0.62, dist: 0.3 }, ms: 1100 };
  }
}

/** The order a settled hand plays out in: compare, then the chips move. */
export function settleBeats(pay: number, stake: number): BlackjackBeat[] {
  if (pay > stake) return ['settle', 'payout', 'collect'];
  if (pay === stake && pay > 0) return ['settle', 'collect'];
  return ['settle', 'houseTakes'];
}
