/** Which sealed miniature a game's time capsule spins. Drawn in the card, never a file. */
export function capsuleShape(id: string) {
  if (id === 'chess') return 'wizard';
  if (id === 'checkers') return 'pawn';
  if (id === 'pawnrush') return 'sorry';
  if (id === 'guesswho') return 'face';
  if (id === 'mousetrap') return 'mouse';
  if (id === 'battleship') return 'ship';
  if (id === 'yahtzee' || id === 'liarsdice') return 'die';
  if (id === 'monopoly' || id === 'life') return 'house';
  if (id === 'gofish') return 'fish';
  return 'card';
}
