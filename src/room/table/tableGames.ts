/**
 * The 3D table games and the 2D boards are split out of the main bundle. Once
 * the room is in and quiet, fetch them all in the background so opening any
 * game is still instant.
 */
let warmed = false;

export function warmTableGames() {
  if (warmed) return;
  warmed = true;
  const loads: (() => Promise<unknown>)[] = [
    () => import('./ConnectFourTable'),
    () => import('./BattleshipTable'),
    () => import('./MonopolyTable'),
    () => import('./ChessTable'),
    () => import('./CheckersTable'),
    () => import('./BlackjackTable'),
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
    () => import('../../games/liarsdice/LiarsDiceGame'),
    () => import('../../games/life/LifeGame'),
    () => import('../../games/monopoly/MonopolyGame'),
    () => import('../../games/pawnrush/PawnRushGame'),
    () => import('../../games/poker/PokerGame'),
    () => import('../../games/trivia/TriviaPartyGame'),
    () => import('../../games/yahtzee/YahtzeeGame'),
  ];
  // one at a time, so it never competes with what the player is doing
  void loads.reduce<Promise<unknown>>((chain, load) => chain.then(() => load().catch(() => {})), Promise.resolve());
}
