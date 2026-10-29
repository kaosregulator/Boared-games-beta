import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { migrate, MIGRATIONS, openSqlite } from '../../server/db.mjs';
import { indexBoards, leaderboard, personalBest, recordEvent, recordScore, validateEvent, validateScore } from '../../server/leaderboard.mjs';
import { createGuest, hashToken, playerFromRequest, readCookie, SESSION_COOKIE } from '../../server/players.mjs';
import { evaluateAwards } from '../../server/rewards/engine.mjs';

const catalog = JSON.parse(fs.readFileSync('src/rewards/catalog.json', 'utf8'));
const boards = JSON.parse(fs.readFileSync('src/rewards/leaderboards.json', 'utf8'));
const games = indexBoards(boards);

const freshDb = () => openSqlite(':memory:');
const req = token => ({ headers: { cookie: `other=1; ${SESSION_COOKIE}=${encodeURIComponent(token)}` } });
let n = 0;
const idem = () => `test-idem-${String(++n).padStart(4, '0')}`;
const score = (db, p, game, metric, value, at, mode = '') => recordScore(db, p.id, { game, metric, mode, value, meta: null, idem: idem() }, at);
const event = (db, p, game, ev, mode = null) => recordEvent(db, p.id, { game, event: ev, mode, idem: idem() });
const count = async (db, sql, params) => Number((await db.one(sql, params)).n);

test('migrations run once and are recorded', async () => {
  const db = await freshDb();
  await migrate(db);
  assert.equal((await db.query('SELECT id FROM schema_migrations')).rows.length, MIGRATIONS.length);
});

test('a guest session is a hashed token in a cookie; a wrong token is nobody', async () => {
  const db = await freshDb();
  const { token, player } = await createGuest(db);
  assert.equal(player.kind, 'guest');
  assert.match(player.display_name, /^Guest [A-Z0-9_-]{4}$/);
  assert.equal(await count(db, 'SELECT COUNT(*) AS n FROM sessions WHERE token_hash = $1', [token]), 0, 'raw token is never stored');
  assert.equal(await count(db, 'SELECT COUNT(*) AS n FROM sessions WHERE token_hash = $1', [hashToken(token)]), 1);
  assert.equal(readCookie(req(token), SESSION_COOKIE), token);
  assert.equal((await playerFromRequest(db, req(token))).player.id, player.id);
  assert.equal(await playerFromRequest(db, req(`${token}x`)), null);
  assert.equal(await playerFromRequest(db, { headers: {} }), null);
});

test('a merged guest resolves to the account it was merged into', async () => {
  const db = await freshDb();
  const guest = await createGuest(db);
  const account = await createGuest(db);
  await db.query('UPDATE players SET merged_into = $1 WHERE id = $2', [account.player.id, guest.player.id]);
  assert.equal((await playerFromRequest(db, req(guest.token))).player.id, account.player.id);
});

test('score validation rejects unknown games, bad modes, fractions, out-of-range values and missing keys', () => {
  const ok = { game: 'pc-tetris', metric: 'score', value: 12000, idem: idem() };
  assert.equal(validateScore(games, ok).value, 12000);
  assert.throws(() => validateScore(games, { ...ok, game: 'nope' }), /unknown game/);
  assert.throws(() => validateScore(games, { ...ok, metric: 'wins' }), /unknown metric/);
  assert.throws(() => validateScore(games, { ...ok, value: 12.5 }), /whole number/);
  assert.throws(() => validateScore(games, { ...ok, value: 99_999_999 }), /out of range/);
  assert.throws(() => validateScore(games, { ...ok, value: '12000' }), /number/);
  assert.throws(() => validateScore(games, { ...ok, idem: undefined }), /idempotency/);
  assert.throws(() => validateScore(games, { ...ok, mode: 'expert' }), /mode/);
  const mine = { game: 'pc-minesweeper', metric: 'time', value: 80, idem: idem() };
  assert.throws(() => validateScore(games, mine), /mode/);
  assert.equal(validateScore(games, { ...mine, mode: 'expert' }).mode, 'expert');
  assert.throws(() => validateEvent(games, { game: 'chess', event: 'perfect-round' }), /unknown event/);
});

test('leaderboards rank by each metric’s own direction, one row per player, ties to whoever was first', async () => {
  const db = await freshDb();
  const a = (await createGuest(db)).player;
  const b = (await createGuest(db)).player;
  const c = (await createGuest(db)).player;
  await score(db, a, 'pc-tetris', 'score', 5000, 1);
  await score(db, a, 'pc-tetris', 'score', 9000, 2);
  await score(db, b, 'pc-tetris', 'score', 9000, 1);
  await score(db, c, 'pc-tetris', 'score', 100, 1);
  const hi = await leaderboard(db, games, { game: 'pc-tetris', metric: 'score', playerId: a.id });
  assert.deepEqual(hi.rows.map(r => [r.pid, r.value]), [[b.id, 9000], [a.id, 9000], [c.id, 100]]);
  assert.deepEqual(hi.you, { rank: 2, value: 9000 });
  assert.equal(hi.total, 3);

  await score(db, a, 'hotwheels', 'race-time', 95.5, 1);
  await score(db, b, 'hotwheels', 'race-time', 61.25, 1);
  const lo = await leaderboard(db, games, { game: 'hotwheels', metric: 'race-time' });
  assert.equal(lo.better, 'lower');
  assert.deepEqual(lo.rows.map(r => r.value), [61.25, 95.5]);
  assert.equal(await personalBest(db, a.id, 'hotwheels', 'race-time', '', 'lower'), 95.5);

  const page = await leaderboard(db, games, { game: 'pc-tetris', metric: 'score', limit: 1, offset: 1 });
  assert.equal(page.rows.length, 1);
  assert.equal(page.rows[0].rank, 2);
});

test('the same submission twice is stored once', async () => {
  const db = await freshDb();
  const p = (await createGuest(db)).player;
  const s = { game: 'pc-tetris', metric: 'score', mode: '', value: 10, meta: null, idem: 'same-key-123' };
  assert.equal(await recordScore(db, p.id, s), true);
  assert.equal(await recordScore(db, p.id, s), false);
  const w = { game: 'chess', event: 'won', mode: null, idem: 'win-key-123' };
  assert.equal(await recordEvent(db, p.id, w), true);
  assert.equal(await recordEvent(db, p.id, w), false);
});

test('win counts make their own leaderboard', async () => {
  const db = await freshDb();
  const a = (await createGuest(db)).player;
  const b = (await createGuest(db)).player;
  for (let i = 0; i < 3; i += 1) await event(db, a, 'checkers', 'won');
  await event(db, b, 'checkers', 'won');
  const board = await leaderboard(db, games, { game: 'checkers', metric: 'wins' });
  assert.deepEqual(board.rows.map(r => [r.pid, r.value]), [[a.id, 3], [b.id, 1]]);
});

test('awards follow real results, are given once, and chain into collection roles', async () => {
  const db = await freshDb();
  const p = (await createGuest(db)).player;
  assert.deepEqual(await evaluateAwards(db, p.id, catalog), []);
  await score(db, p, 'pc-tetris', 'lines', 39);
  assert.deepEqual(await evaluateAwards(db, p.id, catalog), []);
  await score(db, p, 'pc-tetris', 'lines', 41);
  assert.deepEqual(await evaluateAwards(db, p.id, catalog), ['game.pc-tetris.long-bar']);
  assert.deepEqual(await evaluateAwards(db, p.id, catalog), [], 'never awarded twice');

  await event(db, p, 'pc-minesweeper', 'won-expert', 'expert');
  await event(db, p, 'pc-solitaire', 'won');
  const fresh = await evaluateAwards(db, p.id, catalog);
  assert.ok(fresh.includes('game.pc-minesweeper.expert'));
  assert.ok(fresh.includes('game.pc-solitaire.bounce'));
  assert.ok(fresh.includes('nostalgia.win98-survivor'), 'chained role unlocks in the same pass');

  // Blackjack needs five wins, not one.
  for (let i = 0; i < 4; i += 1) await event(db, p, 'blackjack', 'won');
  assert.ok(!(await evaluateAwards(db, p.id, catalog)).includes('game.blackjack.shark'));
  await event(db, p, 'blackjack', 'won');
  assert.ok((await evaluateAwards(db, p.id, catalog)).includes('game.blackjack.shark'));

  // An unset threshold never awards, and roles nobody can earn by playing are never auto-awarded.
  await score(db, p, 'hotwheels', 'race-time', 11);
  const all = new Set((await db.query('SELECT role_key FROM awards WHERE player_id = $1', [p.id])).rows.map(r => r.role_key));
  assert.ok(!all.has('game.hotwheels.speed-demon'));
  for (const key of all) {
    const type = catalog.roles.find(r => r.key === key).unlock.type;
    assert.ok(!['chat-level', 'self-select', 'manual', 'early-member'].includes(type), `${key} was auto-awarded`);
  }
});

test('launch roles count distinct programs', async () => {
  const db = await freshDb();
  const p = (await createGuest(db)).player;
  for (const g of ['pc-tetris', 'pc-tetris', 'pc-paint']) await event(db, p, g, 'launch');
  assert.ok(!(await evaluateAwards(db, p.id, catalog)).includes('nostalgia.floppy-kid'));
  await event(db, p, 'pc-solitaire', 'launch');
  assert.ok((await evaluateAwards(db, p.id, catalog)).includes('nostalgia.floppy-kid'));
});
