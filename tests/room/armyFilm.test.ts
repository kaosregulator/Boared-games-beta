import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { CORNER, FILM_SPOT, ROW_GAP, ROW_MAX, ROW_Z, lineUp, rowSlot, shotFor, speechShot } from '../../src/room/army/film.ts';
import { INTRO } from '../../src/room/army/sargeVoice.ts';
import { TOWN_BLOCKS, MAT_MIN_X, MAT_MAX_X, MAT_MIN_Z, MAT_MAX_Z, ROOM } from '../../src/room/army/town.ts';
import { blockHas } from '../../src/room/hotwheels/world.ts';

test('every intro line has its own shot, in the order Sarge says them', () => {
  assert.equal(INTRO.length, 5);
  assert.deepEqual(INTRO.map((_, i) => shotFor(i)), ['close', 'orbit', 'shoulder', 'dolly', 'farewell']);
  // The men are in line from "Sound off!" through the roll call, and break before "Good luck".
  assert.deepEqual(INTRO.map((_, i) => lineUp(i)), [false, false, true, true, false]);
});

test('the line is evenly spaced, centred on Sarge, on the mat and clear of every building', () => {
  for (let n = 1; n <= ROW_MAX; n++) {
    const slots = Array.from({ length: n }, (_, i) => rowSlot(i, n));
    const mid = slots.reduce((s, p) => s + p.x, 0) / n;
    assert.ok(Math.abs(mid - FILM_SPOT.x) < 1e-9);
    for (let i = 1; i < n; i++) assert.ok(Math.abs(slots[i].x - slots[i - 1].x - ROW_GAP) < 1e-9);
    for (const s of slots) {
      assert.equal(s.z, ROW_Z);
      assert.ok(s.x > MAT_MIN_X && s.x < MAT_MAX_X && s.z > MAT_MIN_Z && s.z < MAT_MAX_Z);
      const hit = TOWN_BLOCKS.find(b => blockHas(b, s.x, s.z, 0.012));
      assert.equal(hit, undefined, `slot ${s.x.toFixed(3)} is inside ${hit?.id}`);
    }
  }
  assert.equal(TOWN_BLOCKS.find(b => blockHas(b, FILM_SPOT.x, FILM_SPOT.z, 0.012)), undefined);
});

test('the opening wide stays inside the room and looks down at the rug', () => {
  assert.ok(CORNER.at.x > ROOM.minX && CORNER.at.x < ROOM.maxX && CORNER.at.z > ROOM.minZ && CORNER.at.z < ROOM.maxZ);
  assert.ok(CORNER.at.y > CORNER.look.y);
});

test('every speech shot stays above the rug and out of the buildings for the whole line', () => {
  const sarge = { x: FILM_SPOT.x, y: 0, z: FILM_SPOT.z, heading: Math.PI };
  const want = new THREE.Vector3();
  const look = new THREE.Vector3();
  for (const shot of ['close', 'orbit', 'shoulder', 'dolly', 'farewell'] as const) {
    for (let t = 0; t <= 10; t += 0.5) {
      speechShot(shot, t, 10, sarge, ROW_MAX, want, look);
      assert.ok(want.y > 0.02, `${shot} at ${t}s is in the rug`);
      assert.ok(Number.isFinite(want.x + want.z + look.x + look.y + look.z));
      const inside = TOWN_BLOCKS.find(b => b.top !== false && want.y < b.maxY && blockHas(b, want.x, want.z));
      assert.equal(inside, undefined, `${shot} at ${t}s is inside ${inside?.id}`);
    }
  }
});
