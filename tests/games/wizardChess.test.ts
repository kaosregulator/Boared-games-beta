import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import type { ChessBoard, ChessPieceColor, ChessPieceType } from '../../src/types/index.ts';
import { applyChessMove, createInitialBoard, findKing, isSquareUnderAttack, sideStatus } from '../../src/games/chess/chessLogic.ts';
import { chooseSmartAIMove, scoreMove } from '../../src/games/chess/wizardAI.ts';
import {
  MIN_PIECE_SEP,
  PIECE_HEIGHTS,
  SHARD_LIFE,
  SHARD_REST,
  boardToWorld,
  duelCamera,
  planChoreo,
  spawnShards,
  stepShards,
  type Stand,
} from '../../src/room/table/wizardMelee.ts';

const still = () => 0.5; // no noise, first candidate

function board(pieces: [number, number, ChessPieceType, ChessPieceColor][]): ChessBoard {
  const b: ChessBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const [r, c, type, color] of pieces) b[r][c] = { type, color, hasMoved: true };
  return b;
}

test('the wizard AI takes a queen left hanging, at every difficulty', () => {
  const b = board([
    [7, 4, 'k', 'w'],
    [0, 4, 'k', 'b'],
    [4, 3, 'q', 'w'],
    [3, 2, 'p', 'b'],
  ]);
  for (const d of ['easy', 'medium', 'hard'] as const) {
    const m = chooseSmartAIMove(b, 'b', d, still);
    assert.deepEqual(m, { from: { r: 3, c: 2 }, to: { r: 4, c: 3 } }, d);
  }
});

test('the source scoring: a capture beats a quiet move, and a recapturable piece costs', () => {
  const b = board([
    [7, 4, 'k', 'w'],
    [0, 4, 'k', 'b'],
    [4, 4, 'n', 'w'],
    [2, 3, 'r', 'b'],
    [5, 2, 'p', 'w'],
  ]);
  const quiet = scoreMove(b, 'b', { from: { r: 2, c: 3 }, to: { r: 2, c: 0 } });
  // Rd4 lands where the pawn on c3 can take it back
  const hanging = scoreMove(b, 'b', { from: { r: 2, c: 3 }, to: { r: 4, c: 3 } });
  assert.ok(hanging < quiet, `${hanging} < ${quiet}`);
});

test('hard plays mate in one', () => {
  const b = board([
    [7, 6, 'k', 'w'],
    [7, 0, 'r', 'w'],
    [6, 5, 'p', 'w'],
    [6, 6, 'p', 'w'],
    [6, 7, 'p', 'w'],
    [0, 6, 'k', 'b'],
    [1, 5, 'p', 'b'],
    [1, 6, 'p', 'b'],
    [1, 7, 'p', 'b'],
  ]);
  const m = chooseSmartAIMove(b, 'w', 'hard', still);
  assert.ok(m);
  assert.ok(sideStatus(applyChessMove(b, m.from, m.to).board, 'b').mate, JSON.stringify(m));
});

test('hard does not leave its queen where a pawn can take it', () => {
  const b = board([
    [7, 0, 'k', 'w'],
    [0, 7, 'k', 'b'],
    [4, 3, 'q', 'w'],
    [3, 4, 'p', 'b'],
    [2, 5, 'p', 'b'],
  ]);
  const m = chooseSmartAIMove(b, 'w', 'hard', still);
  assert.ok(m);
  const next = applyChessMove(b, m.from, m.to).board;
  const q = next.flatMap((row, r) => row.map((p, c) => (p?.type === 'q' ? { r, c } : null))).find(Boolean)!;
  assert.ok(!isSquareUnderAttack(next, q.r, q.c, 'b'), JSON.stringify(m));
});

test('no legal move, no AI move; and hard thinks fast enough for the table', () => {
  const stalemate = board([
    [0, 0, 'k', 'b'],
    [2, 1, 'q', 'w'],
    [7, 7, 'k', 'w'],
  ]);
  assert.equal(chooseSmartAIMove(stalemate, 'b', 'hard'), null);
  const t = performance.now();
  const m = chooseSmartAIMove(createInitialBoard(), 'w', 'hard');
  assert.ok(m);
  assert.ok(performance.now() - t < 3000);
  assert.ok(findKing(createInitialBoard(), 'w'));
});

function standsOf(b: ChessBoard): Stand[] {
  const out: Stand[] = [];
  b.forEach((row, r) => row.forEach((p, c) => p && out.push({ id: r * 8 + c, type: p.type, r, c })));
  return out;
}

test('a melee: walk up, contact, burst, follow through onto the square', () => {
  // 1. e4 d5 2. exd5
  const b = createInitialBoard();
  b[6][4] = null;
  b[4][4] = { type: 'p', color: 'w' };
  b[1][3] = null;
  b[3][3] = { type: 'p', color: 'b' };
  const all = standsOf(b);
  const mover = all.find(s => s.r === 4 && s.c === 4)!;
  const victim = all.find(s => s.r === 3 && s.c === 3)!;
  const ch = planChoreo({ mover, to: { r: 3, c: 3 }, victim, rook: null, bystanders: all });
  assert.ok(ch.capture);
  assert.ok(ch.tApproach < ch.tContact && ch.tContact < ch.tImpact && ch.tImpact < ch.tStrikeDone && ch.tStrikeDone < ch.duration);

  const end = boardToWorld(3, 3);
  const before = ch.sample(ch.tImpact - 0.01);
  assert.ok(before.victim, 'the defender stands until the blow');
  const gap = Math.hypot(before.mover.x - before.victim.x, before.mover.z - before.victim.z);
  assert.ok(gap > 0.05 && gap < 0.45, `the attacker swings from a standoff (${gap})`);
  assert.equal(ch.sample(ch.tImpact + 0.01).victim, null, 'then it is gone');
  const last = ch.sample(ch.duration);
  assert.equal(last.phase, 'done');
  assert.ok(Math.hypot(last.mover.x - end.x, last.mover.z - end.z) < 1e-6);

  // The defender turns to meet the attacker; the attacker faces its target.
  assert.ok(Math.abs(Math.abs(ch.victimHeading - ch.heading) - Math.PI) < 1e-6);
});

test('a quiet move: knights clear the pawn wall, and nobody walks through a statue', () => {
  const b = createInitialBoard();
  const all = standsOf(b);
  const knight = all.find(s => s.r === 7 && s.c === 1)!;
  const ch = planChoreo({ mover: knight, to: { r: 5, c: 2 }, victim: null, rook: null, bystanders: all });
  assert.equal(ch.capture, false);
  let peak = 0;
  for (let t = 0; t <= ch.duration; t += 0.02) {
    const f = ch.sample(t);
    peak = Math.max(peak, f.mover.y);
    for (const s of all) {
      if (s.id === knight.id) continue;
      const at = f.nudged.get(s.id) ?? boardToWorld(s.r, s.c);
      const d = Math.hypot(f.mover.x - at.x, f.mover.z - at.z);
      assert.ok(d >= MIN_PIECE_SEP - 0.02 || f.mover.y >= PIECE_HEIGHTS[s.type], `t=${t.toFixed(2)} near ${s.r},${s.c}`);
    }
  }
  assert.ok(peak > 0.05, 'it leaves the board');
  const end = ch.sample(ch.duration).mover;
  assert.deepEqual([end.x, end.z], [boardToWorld(5, 2).x, boardToWorld(5, 2).z]);
});

test('the duel camera takes the side with fewer statues in the way', () => {
  const mover: Stand = { id: 1, type: 'q', r: 4, c: 0 };
  const victim: Stand = { id: 2, type: 'p', r: 4, c: 4 };
  const ch = planChoreo({ mover, to: { r: 4, c: 4 }, victim, rook: null, bystanders: [mover, victim] });
  // a wall of statues on the +z side of the fight, the camera on that side too
  const wall = [0, 1, 2, 3, 4, 5].map(c => boardToWorld(5, c));
  const cam = duelCamera(ch, { x: 0, y: 2, z: 3 }, wall);
  assert.ok(cam.close.z < boardToWorld(4, 2).z, 'it swings round to the open side');
  const open = duelCamera(ch, { x: 0, y: 2, z: 3 }, []);
  assert.ok(open.close.z > boardToWorld(4, 2).z, 'with nothing in the way it stays on the player’s side');
});

test('stone shatter: 32 chips fly, land on the board, and fade', () => {
  let i = 0;
  const rnd = () => ((i++ * 0.618) % 1);
  const shards = spawnShards({ x: 0, y: 0, z: 0 }, rnd);
  assert.equal(shards.length, 32);
  assert.ok(shards.every(s => s.vel.y > 0));
  let peak = 0;
  for (let t = 0; t < SHARD_LIFE - 0.6; t += 1 / 60) {
    stepShards(shards, 1 / 60, [{ x: 0.34, z: 0 }]);
    for (const s of shards) {
      peak = Math.max(peak, s.pos.y);
      assert.ok(s.pos.y >= SHARD_REST - 1e-9);
    }
  }
  assert.ok(peak > 0.3, 'they burst upward');
  assert.equal(shards.length, 32);
  for (let t = 0; t < 1; t += 1 / 60) stepShards(shards, 1 / 60, []);
  assert.equal(shards.length, 0, 'and are gone after their life');
});

test('the table plays the owner board, captures and AI', () => {
  const src = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
  const table = src('src/room/table/ChessTable.tsx');
  assert.match(table, /chooseSmartAIMove/);
  assert.match(table, /planChoreo/);
  assert.match(table, /spawnShards/);
  assert.doesNotMatch(table, /getBestChessMove/);
  assert.match(src('src/room/table/wizardSet.tsx'), /altar\.glb/);
  const altar = new URL('../../public/games/wizard/altar.glb', import.meta.url);
  const size = statSync(altar).size;
  assert.ok(size < 400_000, `altar.glb is ${size} bytes`);
  const glb = readFileSync(altar);
  const json = glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8');
  assert.match(json, /Opt8_Obsidian_Altar_Table/);
  assert.doesNotMatch(json, /Cathedral_Stone_Architecture|Brazier/, 'only the altar, not the nave');
  assert.match(src('public/games/CREDITS.md'), /altar\.glb/);
});
