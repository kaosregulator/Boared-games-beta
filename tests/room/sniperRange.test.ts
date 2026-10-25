import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AIM_HOME,
  FIELD,
  HIT_RADIUS,
  RIFLE_PIVOT,
  SQUAD,
  aimAt,
  aimDir,
  clampAim,
  launchDuck,
  missPoint,
  muzzle,
  quota,
  rayHit,
  roundResult,
  scatter,
  scopeEye,
  shoot,
  stepDuck,
  waveOver,
} from '../../src/room/army/sniper/range.ts';
import { floorAt, pushOut } from '../../src/room/army/town.ts';
import { WALL_SHELF } from '../../src/room/roomLayout.ts';
import * as THREE from 'three';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('the rifle starts on the middle of the range, across the room', () => {
  const d = aimDir(AIM_HOME.yaw, AIM_HOME.pitch);
  assert.ok(d.z > 0.9, 'points south, across the room');
  assert.ok(d.y < 0, 'points down from the shelf');
  const m = muzzle(AIM_HOME.yaw, AIM_HOME.pitch);
  assert.ok(m.z > SQUAD.sniper.z, 'muzzle is in front of the sniper');
  // The muzzle pokes out over the front edge of the shelf.
  assert.ok(m.z > WALL_SHELF.z + WALL_SHELF.d / 2 - 0.01);
});

test('aim is held to the range', () => {
  const c = clampAim(AIM_HOME.yaw + 3, AIM_HOME.pitch - 3);
  assert.ok(c.yaw < AIM_HOME.yaw + 0.5);
  assert.ok(c.pitch > AIM_HOME.pitch - 0.5);
  // Every corner of the flight box is inside the swing.
  const f = FIELD.fly;
  for (const x of [f.x0, f.x1]) {
    for (const y of [f.y0, f.y1]) {
      const a = aimAt(RIFLE_PIVOT, { x, y, z: f.z0 });
      const k = clampAim(a.yaw, a.pitch);
      assert.ok(Math.abs(k.yaw - a.yaw) < 1e-9, `yaw reaches ${x},${y}`);
      assert.ok(Math.abs(k.pitch - a.pitch) < 1e-9, `pitch reaches ${x},${y}`);
    }
  }
});

test('a shot through the middle of a duck hits; a hand-width off misses', () => {
  const duck = launchDuck(0, 1, 0, seeded(3));
  duck.pos = { x: -0.3, y: 0.8, z: 1.1 };
  const eye = scopeEye(AIM_HOME.yaw, AIM_HOME.pitch);
  const on = aimAt(eye, duck.pos);
  assert.notEqual(rayHit(eye, aimDir(on.yaw, on.pitch), duck.pos, HIT_RADIUS), null);
  const off = aimAt(eye, { ...duck.pos, x: duck.pos.x + 0.15 });
  assert.equal(rayHit(eye, aimDir(off.yaw, off.pitch), duck.pos, HIT_RADIUS), null);
  // A miss lands on the sky board or the floor, not out past the wall.
  const p = missPoint(eye, aimDir(off.yaw, off.pitch));
  assert.ok(p.z <= FIELD.backZ + 1e-6);
});

test('ducks stay in the range until they give up and fly off', () => {
  const rand = seeded(42);
  const f = FIELD.fly;
  for (let n = 0; n < 20; n++) {
    const d = launchDuck(n, 3, n % 2, rand);
    let away = false;
    for (let i = 0; i < 2000 && d.state !== 'gone'; i++) {
      const ev = stepDuck(d, 1 / 60, 3, rand);
      if (ev.includes('away')) away = true;
      if (d.state === 'fly' && d.age > 1) {
        assert.ok(d.pos.x >= f.x0 - 1e-6 && d.pos.x <= f.x1 + 1e-6, 'x in range');
        assert.ok(d.pos.y >= f.y0 - 1e-6 && d.pos.y <= f.y1 + 1e-6, 'y in range');
      }
    }
    assert.ok(away, 'flew off in the end');
    assert.equal(d.state, 'gone');
  }
});

test('a shot duck hangs, drops into the grass and is gone', () => {
  const d = launchDuck(0, 1, 0, seeded(5));
  for (let i = 0; i < 90; i++) stepDuck(d, 1 / 60, 1, seeded(i));
  assert.equal(shoot(d), true);
  assert.equal(shoot(d), false, 'only once');
  let landed = false;
  for (let i = 0; i < 600 && d.state !== 'gone'; i++) if (stepDuck(d, 1 / 60, 1, seeded(i)).includes('land')) landed = true;
  assert.ok(landed);
  assert.ok(waveOver([d]));
});

test('out of shells sends the rest away', () => {
  const rand = seeded(9);
  const ducks = [launchDuck(0, 1, 0, rand), launchDuck(1, 1, 1, rand)];
  shoot(ducks[0]);
  scatter(ducks);
  assert.equal(ducks[0].state, 'hit');
  assert.equal(ducks[1].state, 'away');
});

test('round rules: six of ten to go on, ten for a perfect, harder later', () => {
  assert.equal(quota(1), 6);
  assert.ok(quota(9) > quota(1));
  assert.ok(quota(40) <= 9);
  assert.equal(roundResult(5, 1), 'over');
  assert.equal(roundResult(6, 1), 'next');
  assert.equal(roundResult(10, 1), 'perfect');
});

test('the chopper can land on the shelf next to the squad, and not inside them', () => {
  const top = WALL_SHELF.y + WALL_SHELF.h;
  // The gap between the Rubik's cube and the NES.
  assert.equal(floorAt(-0.495, WALL_SHELF.z, top + 0.05), top);
  const inSquad = new THREE.Vector3(SQUAD.sniper.x, top + 0.01, SQUAD.sniper.z);
  pushOut(inSquad, 0.06, top + 0.005, top + 0.06);
  assert.ok(Math.hypot(inSquad.x - SQUAD.sniper.x, inSquad.z - SQUAD.sniper.z) > 0.05, 'pushed off the soldiers');
});
