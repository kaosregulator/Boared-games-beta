import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChessBoard, ChessPieceColor, ChessPieceType, PlayingCard, CardRank, CardSuit, Pawn, PawnColor, PawnRushCard, PokerCard, PokerRank, PokerSuit } from '../../src/types/index.ts';
import {
  applyChessMove,
  createInitialBoard,
  getLegalMoves,
  sideStatus,
} from '../../src/games/chess/chessLogic.ts';
import {
  continuationAfter,
  createInitialCheckersBoard,
  executeCheckerMove,
  getAllLegalMovesForColor,
} from '../../src/games/checkers/checkersLogic.ts';
import { checkConnect4Win, createEmptyConnect4Board, getLowestEmptyRow } from '../../src/games/connect4/connect4Logic.ts';
import { generateRandomFleet, isValidPlacement, createEmptyGrid } from '../../src/games/battleship/battleshipLogic.ts';
import { calculateHandScore } from '../../src/games/blackjack/blackjackLogic.ts';
import { checkForBooks } from '../../src/games/gofish/goFishLogic.ts';
import { countMatchingDice, isValidBid } from '../../src/games/liarsdice/liarsDiceLogic.ts';
import { grandTotal, scoreFor, upperBonus, type ScoreCard } from '../../src/games/yahtzee/yahtzeeRules.ts';
import { RANK_VALUES, evaluate5CardHand } from '../../src/utils/pokerLogic.ts';
import { accuse, newClueGame } from '../../src/games/clue/clueEngine.ts';
import { choosePath, newLifeGame, spin } from '../../src/games/life/lifeEngine.ts';
import { buyPending, canBuild, endTurn, newGame, rentFor, rollDice } from '../../src/games/monopoly/monopolyEngine.ts';
import { GO_SALARY, START_CASH } from '../../src/games/monopoly/monopolyData.ts';
import { calculateValidMovesForCard, initializePawnRush } from '../../src/games/pawnrush/pawnRushLogic.ts';
import { GAME_CATALOG } from '../../src/utils/gameData.ts';

function emptyBoard(): ChessBoard {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

function place(board: ChessBoard, r: number, c: number, type: ChessPieceType, color: ChessPieceColor, extra: { hasMoved?: boolean; ep?: boolean } = {}) {
  board[r][c] = { type, color, ...extra };
}

function destinations(board: ChessBoard, r: number, c: number) {
  return getLegalMoves(board, r, c).map(m => `${m.r},${m.c}`).sort();
}

test('chess opening has the twenty legal white moves', () => {
  const board = createInitialBoard();
  let n = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c]?.color === 'w') n += getLegalMoves(board, r, c).length;
  assert.equal(n, 20);
});

test('a pinned bishop cannot step off the king’s file', () => {
  const board = emptyBoard();
  place(board, 7, 4, 'k', 'w');
  place(board, 6, 4, 'b', 'w');
  place(board, 0, 4, 'r', 'b');
  place(board, 0, 0, 'k', 'b');
  assert.equal(getLegalMoves(board, 6, 4).length, 0);
});

test('en passant is legal only on the move after a two-step pawn, and it takes that pawn', () => {
  const board = emptyBoard();
  place(board, 7, 7, 'k', 'w');
  place(board, 0, 0, 'k', 'b');
  place(board, 3, 4, 'p', 'w');
  place(board, 3, 3, 'p', 'b', { ep: true });
  assert.ok(destinations(board, 3, 4).includes('2,3'));

  const taken = applyChessMove(board, { r: 3, c: 4 }, { r: 2, c: 3 });
  assert.equal(taken.enPassant, true);
  assert.equal(taken.board[2][3]?.type, 'p');
  assert.equal(taken.board[2][3]?.color, 'w');
  assert.equal(taken.board[3][3], null);
  assert.equal(taken.captured?.color, 'b');

  const quiet = applyChessMove(board, { r: 7, c: 7 }, { r: 7, c: 6 });
  assert.equal(quiet.board[3][3]?.ep, undefined);
  assert.equal(destinations(quiet.board, 3, 4).includes('2,3'), false);
});

test('castling uses your own rook and refuses a square in check', () => {
  const board = emptyBoard();
  place(board, 7, 4, 'k', 'w');
  place(board, 7, 7, 'r', 'w');
  place(board, 7, 0, 'r', 'w');
  place(board, 0, 0, 'k', 'b');
  const both = destinations(board, 7, 4);
  assert.ok(both.includes('7,6'));
  assert.ok(both.includes('7,2'));

  // An enemy rook on the home rank checks the king down the empty rank, so it
  // cannot be borrowed for queenside castling either.
  const stolen = emptyBoard();
  place(stolen, 7, 4, 'k', 'w');
  place(stolen, 7, 7, 'r', 'w');
  place(stolen, 7, 0, 'r', 'b');
  place(stolen, 0, 7, 'k', 'b');
  assert.equal(sideStatus(stolen, 'w').inCheck, true);
  assert.equal(destinations(stolen, 7, 4).includes('7,2'), false);
  assert.equal(destinations(stolen, 7, 4).includes('7,6'), false);

  const through = emptyBoard();
  place(through, 7, 4, 'k', 'w');
  place(through, 7, 7, 'r', 'w');
  place(through, 7, 0, 'r', 'w');
  place(through, 0, 5, 'r', 'b');
  place(through, 0, 0, 'k', 'b');
  assert.equal(destinations(through, 7, 4).includes('7,6'), false);

  const castled = applyChessMove(board, { r: 7, c: 4 }, { r: 7, c: 6 });
  assert.equal(castled.castle, 'k');
  assert.equal(castled.board[7][6]?.type, 'k');
  assert.equal(castled.board[7][5]?.type, 'r');
  assert.equal(castled.board[7][7], null);
});

test('a pawn promotes to the chosen piece, and mate and stalemate are told apart', () => {
  const board = emptyBoard();
  place(board, 1, 0, 'p', 'w');
  place(board, 7, 7, 'k', 'w');
  place(board, 0, 7, 'k', 'b');
  const knight = applyChessMove(board, { r: 1, c: 0 }, { r: 0, c: 0 }, 'n');
  assert.equal(knight.promoted, 'n');
  assert.equal(knight.board[0][0]?.type, 'n');

  const mate = emptyBoard();
  place(mate, 0, 0, 'k', 'b');
  place(mate, 1, 0, 'q', 'w');
  place(mate, 2, 1, 'k', 'w');
  assert.equal(sideStatus(mate, 'b').mate, true);

  const stale = emptyBoard();
  place(stale, 0, 0, 'k', 'w');
  place(stale, 1, 2, 'q', 'b');
  place(stale, 3, 3, 'k', 'b');
  const stuck = sideStatus(stale, 'w');
  assert.equal(stuck.inCheck, false);
  assert.equal(stuck.stalemate, true);
});

test('checkers forces a jump, chains it, and crowning ends the turn', () => {
  const start = createInitialCheckersBoard();
  const opening = getAllLegalMovesForColor(start, 'red');
  assert.equal(opening.length, 7);
  assert.equal(opening.some(m => m.captured), false);

  const board = createInitialCheckersBoard().map(row => row.map(() => null));
  board[5][0] = { id: 'step', color: 'red', isKing: false };
  board[5][2] = { id: 'jump', color: 'red', isKing: false };
  board[4][3] = { id: 'tan', color: 'black', isKing: false };
  const forced = getAllLegalMovesForColor(board, 'red');
  assert.equal(forced.length, 1);
  assert.equal(forced[0].captured?.r, 4);

  const chainBoard = board.map(row => [...row]);
  chainBoard[2][5] = { id: 'next', color: 'black', isKing: false };
  const first = getAllLegalMovesForColor(chainBoard, 'red').find(m => m.to.r === 3 && m.to.c === 4)!;
  const after = executeCheckerMove(chainBoard, first);
  const more = continuationAfter(after, first);
  assert.ok(more.some(m => m.to.r === 1 && m.to.c === 6));

  const crowning = createInitialCheckersBoard().map(row => row.map(() => null));
  crowning[2][1] = { id: 'man', color: 'red', isKing: false };
  crowning[1][2] = { id: 'last', color: 'black', isKing: false };
  crowning[1][4] = { id: 'again', color: 'black', isKing: false };
  const jump = getAllLegalMovesForColor(crowning, 'red').find(m => m.to.r === 0)!;
  assert.equal(jump.becomesKing, true);
  const crowned = executeCheckerMove(crowning, jump);
  assert.ok(getAllLegalMovesForColor(crowned, 'red').some(m => m.captured));
  assert.equal(continuationAfter(crowned, jump).length, 0);
});

test('connect four drops to the floor and wins across, down, and diagonal', () => {
  const across = createEmptyConnect4Board();
  for (let c = 0; c < 4; c++) across[5][c] = 'red';
  assert.equal(checkConnect4Win(across).winner, 'red');

  const down = createEmptyConnect4Board();
  for (let r = 2; r <= 5; r++) down[r][0] = 'yellow';
  assert.equal(checkConnect4Win(down).winner, 'yellow');

  const slant = createEmptyConnect4Board();
  for (let i = 0; i < 4; i++) slant[5 - i][i] = 'red';
  assert.equal(checkConnect4Win(slant).winner, 'red');

  const column = createEmptyConnect4Board();
  assert.equal(getLowestEmptyRow(column, 0), 5);
  for (let r = 0; r < 6; r++) column[r][0] = r % 2 === 0 ? 'red' : 'yellow';
  assert.equal(getLowestEmptyRow(column, 0), -1);
});

test('battleship rejects a ship that leaves the grid or sits on another', () => {
  const grid = createEmptyGrid();
  assert.equal(isValidPlacement(grid, 8, 0, 3, 'horizontal'), false);
  assert.equal(isValidPlacement(grid, 0, 0, 3, 'horizontal'), true);
  grid[0][0] = 'ship';
  assert.equal(isValidPlacement(grid, 0, 0, 2, 'horizontal'), false);
  const fleet = generateRandomFleet();
  assert.equal(fleet.ships.length, 5);
  const cells = fleet.ships.flatMap(ship => ship.positions);
  const keys = new Set(cells.map(p => `${p.x},${p.y}`));
  assert.equal(keys.size, cells.length);
});

test('blackjack counts aces down, a natural, and a bust', () => {
  const card = (rank: string, value: number): PlayingCard => ({
    suit: '♠',
    rank: rank as PlayingCard['rank'],
    value,
    faceUp: true,
    id: rank,
  });
  const natural = calculateHandScore([card('A', 11), card('K', 10)]);
  assert.equal(natural.total, 21);
  assert.equal(natural.isBlackjack, true);
  const soft = calculateHandScore([card('A', 11), card('A', 11), card('9', 9)]);
  assert.equal(soft.total, 21);
  assert.equal(soft.isBlackjack, false);
  const bust = calculateHandScore([card('K', 10), card('5', 5), card('7', 7)]);
  assert.equal(bust.isBust, true);
});

test('go fish books four of a kind and leaves three in hand', () => {
  const pile = (rank: CardRank, n: number): PlayingCard[] =>
    Array.from({ length: n }, (_, i) => ({
      suit: (['♠', '♥', '♦', '♣'] as CardSuit[])[i],
      rank,
      value: 1,
      faceUp: true,
      id: `${rank}${i}`,
    }));
  const books = checkForBooks([...pile('K', 4), ...pile('7', 3)]);
  assert.deepEqual(books.newBooks, ['K']);
  assert.equal(books.remainingHand.length, 3);
});

test('liar’s dice raises the bid and counts aces as wild until someone bids them', () => {
  assert.equal(isValidBid({ quantity: 1, faceValue: 3 }, null), true);
  assert.equal(isValidBid({ quantity: 4, faceValue: 3 }, { quantity: 4, faceValue: 5, playerId: 'p' }), false);
  assert.equal(isValidBid({ quantity: 4, faceValue: 6 }, { quantity: 4, faceValue: 5, playerId: 'p' }), true);
  assert.equal(isValidBid({ quantity: 3, faceValue: 1 }, { quantity: 6, faceValue: 5, playerId: 'p' }), true);
  assert.equal(isValidBid({ quantity: 2, faceValue: 1 }, { quantity: 6, faceValue: 5, playerId: 'p' }), false);
  assert.equal(countMatchingDice([[1, 1, 5], [5, 2]], 5), 4);
  assert.equal(countMatchingDice([[1, 1, 5]], 1), 2);
});

test('yahtzee scores every box, the upper bonus, and a joker yahtzee', () => {
  assert.equal(scoreFor('aces', [1, 1, 1, 2, 3]), 3);
  assert.equal(scoreFor('sixes', [6, 6, 1, 2, 3]), 12);
  assert.equal(scoreFor('threeKind', [4, 4, 4, 2, 6]), 20);
  assert.equal(scoreFor('fourKind', [4, 4, 4, 2, 6]), 0);
  assert.equal(scoreFor('fullHouse', [3, 3, 3, 6, 6]), 25);
  assert.equal(scoreFor('smallStraight', [1, 2, 3, 4, 6]), 30);
  assert.equal(scoreFor('largeStraight', [1, 2, 3, 4, 5]), 40);
  assert.equal(scoreFor('yahtzee', [2, 2, 2, 2, 2]), 50);
  assert.equal(scoreFor('chance', [1, 2, 3, 4, 6]), 16);
  const upper: ScoreCard = { aces: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 };
  assert.equal(upperBonus(upper), 35);
  const joker: ScoreCard = { yahtzee: 50, twos: 10 };
  assert.equal(scoreFor('fullHouse', [2, 2, 2, 2, 2], joker), 25);
  assert.equal(scoreFor('largeStraight', [2, 2, 2, 2, 2], joker), 40);
  const total = grandTotal({ name: 'You', isAI: false, card: { ...upper, chance: 10, yahtzee: 0 }, yahtzeeBonuses: 1 });
  assert.equal(total, 63 + 35 + 10 + 100);
});

test('poker ranks a wheel under a royal and orders the five-card hands', () => {
  const hand = (cards: [PokerRank, PokerSuit][]) =>
    cards.map(([rank, suit]) => ({ id: rank + suit, suit, rank, value: RANK_VALUES[rank], faceUp: true }) satisfies PokerCard);
  const royal = evaluate5CardHand(hand([['A', '♥'], ['K', '♥'], ['Q', '♥'], ['J', '♥'], ['10', '♥']]));
  const wheelFlush = evaluate5CardHand(hand([['A', '♥'], ['2', '♥'], ['3', '♥'], ['4', '♥'], ['5', '♥']]));
  const wheel = evaluate5CardHand(hand([['A', '♠'], ['2', '♥'], ['3', '♦'], ['4', '♣'], ['5', '♠']]));
  const quads = evaluate5CardHand(hand([['9', '♠'], ['9', '♥'], ['9', '♦'], ['9', '♣'], ['3', '♠']]));
  const boat = evaluate5CardHand(hand([['8', '♠'], ['8', '♥'], ['8', '♦'], ['4', '♣'], ['4', '♠']]));
  const flush = evaluate5CardHand(hand([['A', '♣'], ['J', '♣'], ['8', '♣'], ['4', '♣'], ['2', '♣']]));
  const trips = evaluate5CardHand(hand([['7', '♠'], ['7', '♥'], ['7', '♦'], ['K', '♣'], ['2', '♠']]));
  const two = evaluate5CardHand(hand([['6', '♠'], ['6', '♥'], ['3', '♦'], ['3', '♣'], ['A', '♠']]));
  const pair = evaluate5CardHand(hand([['5', '♠'], ['5', '♥'], ['K', '♦'], ['Q', '♣'], ['2', '♠']]));
  const high = evaluate5CardHand(hand([['A', '♠'], ['K', '♥'], ['9', '♦'], ['4', '♣'], ['2', '♠']]));
  assert.equal(royal.ranking, 'royal_flush');
  assert.equal(wheelFlush.ranking, 'straight_flush');
  assert.ok(royal.score > wheelFlush.score);
  assert.equal(wheel.ranking, 'straight');
  const order = [royal, wheelFlush, quads, boat, flush, wheel, trips, two, pair, high];
  for (let i = 1; i < order.length; i++) assert.ok(order[i - 1].score > order[i].score);
});

test('clue wins only when the accusation matches the envelope', () => {
  const game = newClueGame('You');
  const right = accuse(game, game.solution);
  assert.equal(right.winner, 'You');
  assert.equal(right.stage, 'over');
  const wrongRoom = game.solution.room === 'Kitchen' ? 'Study' : 'Kitchen';
  const wrong = accuse(game, { ...game.solution, room: wrongRoom as typeof game.solution.room });
  assert.equal(wrong.players[0].outOfGame, true);
  assert.equal(wrong.winner, null);
});

test('life spins 1 to 10, stops on a career, and pays a payday it passes', () => {
  const working = spin(choosePath(newLifeGame('You'), false), 10);
  assert.equal(working.players[0].at, 4);
  assert.equal(working.stage, 'choose-career');
  assert.ok(working.players[0].cash > 10000);

  const landed = spin(choosePath(newLifeGame('You'), false), 3);
  assert.equal(landed.players[0].at, 3);
  assert.equal(landed.players[0].cash, 30000);

  const college = choosePath(newLifeGame('You'), true);
  assert.equal(college.players[0].degree, true);
  assert.ok(college.players[0].loans >= 5);
  assert.ok(college.players[0].cash >= 0);
});

test('monopoly rolls two dice, pays for passing go, buys, charges rent, and jails a third double', () => {
  const names = [
    { name: 'You', isAI: false, token: 'car', glyph: '🚗' },
    { name: 'Them', isAI: true, token: 'hat', glyph: '🎩' },
  ];
  const bought = buyPending(rollDice(newGame(names), [1, 2]), true);
  assert.equal(bought.players[0].at, 3);
  assert.equal(bought.players[0].cash, START_CASH - 60);
  assert.equal(bought.deeds[3]?.owner, 0);

  const passed = rollDice({ ...newGame(names), players: newGame(names).players.map((p, i) => (i === 0 ? { ...p, at: 39 } : p)) }, [1, 1]);
  assert.equal(passed.players[0].at, 1);
  assert.equal(passed.players[0].cash, START_CASH + GO_SALARY);

  let owned = buyPending(rollDice(newGame(names), [1, 2]), true);
  owned = endTurn(owned);
  assert.equal(owned.turn, 1);
  const rent = rollDice(owned, [1, 2]);
  assert.equal(rent.players[1].at, 3);
  assert.equal(rent.players[1].cash, START_CASH - rentFor(rent, 3, 3));

  const speeding = newGame(names);
  speeding.doublesRun = 2;
  const jailed = rollDice(speeding, [3, 3]);
  assert.equal(jailed.players[0].inJail, true);
  assert.equal(jailed.players[0].at, 10);

  const built = newGame(names);
  built.deeds[1] = { owner: 0, houses: 1, hotel: false, mortgaged: false };
  built.deeds[3] = { owner: 0, houses: 0, hotel: false, mortgaged: false };
  built.players[0].cash = 500;
  assert.equal(canBuild(built, 1, 0), false);
  assert.equal(canBuild(built, 3, 0), true);
});

test('sorry starts on a 1, backs up on a 4, and a 7 is one pawn not a split', () => {
  const fresh = initializePawnRush();
  const card = (value: PawnRushCard['value'], canStart = false): PawnRushCard => ({ id: value, value, title: value, description: '', canStart });
  const start = calculateValidMovesForCard(card('1', true), 'blue', fresh.pawns);
  assert.ok(start.length > 0);
  assert.equal(start.every(m => m.targetPosition === 4), true);
  assert.equal(calculateValidMovesForCard(card('3'), 'blue', fresh.pawns).length, 0);

  const out: Record<PawnColor, Pawn[]> = {
    ...fresh.pawns,
    blue: fresh.pawns.blue.map((pawn, i) => (i === 0 ? { ...pawn, position: 10, stepIndex: 6 } : pawn)),
  };
  const back = calculateValidMovesForCard(card('4'), 'blue', out).find(m => m.pawn.id === 1);
  assert.equal(back?.targetPosition, 6);
  const seven = calculateValidMovesForCard(card('7'), 'blue', out).filter(m => m.pawn.id === 1);
  assert.equal(seven.length, 1);
  assert.equal(seven[0].targetPosition, 17);

  const bumped = calculateValidMovesForCard(card('SORRY'), 'blue', {
    ...out,
    red: fresh.pawns.red.map((pawn, i) => (i === 0 ? { ...pawn, position: 20 } : pawn)),
  });
  assert.equal(bumped.length, 1);
  assert.equal(bumped[0].targetPosition, 20);
  assert.equal(bumped[0].swapWith?.color, 'red');
});

test('the rule cards describe the moves the engines actually play', () => {
  const rules = (id: string) => GAME_CATALOG.find(game => game.id === id)!.rules.join(' ');
  assert.match(rules('monopoly'), /two dice/i);
  assert.match(rules('life'), /1 to 10/);
  assert.match(rules('pawnrush'), /forward 7/);
  assert.doesNotMatch(rules('pawnrush'), /split/i);
  assert.doesNotMatch(rules('blackjack'), /split/i);
  assert.match(rules('chess'), /en passant/i);
  assert.match(rules('checkers'), /must be taken/);
});
