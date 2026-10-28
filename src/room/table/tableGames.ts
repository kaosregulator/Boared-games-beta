/**
 * The 3D table games and the 2D boards are split out of the main bundle. Once
 * the room is in and quiet, fetch them all in the background so opening any
 * game is still instant.
 */
let warmPromise: Promise<void> | null = null;
let warmCursor = 0;

const TABLE_LOADS: (() => Promise<unknown>)[] = [
  // First, because their models are fetched as the module loads: the Furby's
  // display box has to be here before the Furby that sits inside it is shown.
  () => import('../furby/FurbyTable'),
  () => import('../poochi/PoochiTable'),
    () => import('./ConnectFourTable'),
    () => import('./BattleshipTable'),
    () => import('./MonopolyTable'),
    () => import('./ChessTable'),
    () => import('./CheckersTable'),
    () => import('./BlackjackTable'),
    () => import('./HoldemTable'),
    () => import('./GoFishTable'),
    () => import('./SorryTable'),
    () => import('./GuessWhoTable'),
    () => import('./MouseTrapTable'),
    () => import('./ClueTable'),
    () => import('../../components/ActiveGameSwitch'),
    () => import('../../components/RulesModal'),
    () => import('../../games/battleship/BattleshipGame'),
    () => import('../../games/blackjack/BlackjackGame'),
    () => import('../../games/casino/CasinoLoungeGame'),
    () => import('../../games/checkers/CheckersGame'),
    () => import('../../games/chess/ChessGame'),
    () => import('../../games/clue/ClueGame'),
    () => import('../../games/connect4/Connect4Game'),
    () => import('../../games/gofish/GoFishGame'),
    () => import('../../games/life/LifeGame'),
    () => import('../../games/monopoly/MonopolyGame'),
    () => import('../../games/poker/PokerGame'),
    () => import('../../games/trivia/TriviaPartyGame'),
  () => import('../../games/yahtzee/YahtzeeGame'),
];

/**
 * Runs `loads` from `cursor.index`, one at a time. A load that already finished
 * is not started again. An in-flight import cannot be cancelled; the next one
 * waits until that import settles, then stops if `signal` has aborted.
 */
export async function continueWarm(
  loads: Array<() => Promise<unknown>>,
  cursor: { index: number },
  signal?: AbortSignal,
): Promise<void> {
  for (let i = cursor.index; i < loads.length; i++) {
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    await loads[i]().then(
      () => undefined,
      () => undefined,
    );
    cursor.index = i + 1;
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
  }
}

export function warmTableGames(signal?: AbortSignal): Promise<void> {
  if (warmPromise) return warmPromise;
  const cursor = { index: warmCursor };
  // one at a time, so it never competes with what the player is doing
  warmPromise = continueWarm(TABLE_LOADS, cursor, signal)
    .then(() => {
      warmCursor = cursor.index;
    })
    .catch(err => {
      warmCursor = cursor.index;
      warmPromise = null;
      throw err;
    });
  return warmPromise;
}

export function resetTableWarmForTests() {
  warmPromise = null;
  warmCursor = 0;
}
