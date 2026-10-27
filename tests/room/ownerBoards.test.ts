import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function src(path: string) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

test('the table and the chest call the owner builders', () => {
  assert.match(src('src/room/table/MouseTrapTable.tsx'), /buildMouseTrap3DScene/);
  assert.match(src('src/room/table/SorryTable.tsx'), /buildSorryBoardScene/);
  assert.match(src('src/room/table/GuessWhoTable.tsx'), /buildGuessWhoBoardScene/);
  assert.match(src('src/room/ToyChest.tsx'), /buildStep2ToyChest3D/);
  assert.match(src('src/games/bored/mouseTrap3DBuilder.ts'), /from 'cannon-es'/);
  assert.doesNotMatch(src('src/games/bored/step2ToyChest3D.ts'), /ANIMALS/);
  assert.doesNotMatch(src('src/room/WalkRoom.tsx'), /StepUpFigure/);
});
