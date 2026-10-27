import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LAYOUT, ROOM_COLLIDERS, TOY_CHEST } from '../../src/room/roomLayout.ts';
import { EAST_X, NORTH_Z, SOUTH_Z } from '../../src/room/videoRoom.ts';

test('the toy chest sits under the neon wall, clear of the cubby', () => {
  assert.ok(TOY_CHEST.x + TOY_CHEST.hx < EAST_X - 0.05, 'clear of the east wall');
  assert.ok(TOY_CHEST.z - TOY_CHEST.hz > NORTH_Z + 0.2);
  assert.ok(TOY_CHEST.z + TOY_CHEST.hz < SOUTH_Z - 0.2);
  assert.ok(Math.abs(TOY_CHEST.z + 1.45) < 0.02);
  assert.ok(ROOM_COLLIDERS.some(box => box.x === TOY_CHEST.x && box.z === TOY_CHEST.z && box.top === TOY_CHEST.top));

  const shelf = LAYOUT.toyshelf;
  const overlap =
    Math.abs(shelf.x - TOY_CHEST.x) < shelf.sz / 2 + TOY_CHEST.hx &&
    Math.abs(shelf.z - TOY_CHEST.z) < shelf.sx / 2 + TOY_CHEST.hz;
  assert.equal(overlap, false);
});
