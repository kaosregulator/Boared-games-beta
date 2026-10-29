import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { openSqlite } from '../../server/db.mjs';
import { createRoomApi } from '../../server/api.mjs';

async function startApp() {
  const db = await openSqlite(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/api', createRoomApi({ db }));
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  return { db, base, close: () => new Promise(r => server.close(r)) };
}

function client(base) {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json(), setCookie: set };
  };
}

test('guest session, results, awards and the leaderboard over HTTP', async () => {
  const { base, close } = await startApp();
  try {
    const alice = client(base);
    const bob = client(base);

    assert.equal((await alice('POST', '/scores', { game: 'pc-tetris', metric: 'score', value: 5, idem: 'aaaaaaaa1' })).status, 401);
    assert.deepEqual((await alice('GET', '/me')).body, { player: null });

    const started = await alice('POST', '/session');
    assert.equal(started.status, 201);
    assert.match(started.setCookie, /bgr_sid=.+HttpOnly; SameSite=Lax/);
    assert.equal(started.body.player.kind, 'guest');
    assert.equal((await alice('POST', '/session')).status, 200, 'resumes instead of making a second guest');
    await bob('POST', '/session');

    const s1 = await alice('POST', '/scores', { game: 'pc-tetris', metric: 'lines', value: 44, idem: 'alice-lines-1' });
    assert.equal(s1.status, 200);
    assert.equal(s1.body.stored, true);
    assert.deepEqual(s1.body.awarded, ['game.pc-tetris.long-bar']);
    const again = await alice('POST', '/scores', { game: 'pc-tetris', metric: 'lines', value: 44, idem: 'alice-lines-1' });
    assert.equal(again.body.stored, false);
    assert.deepEqual(again.body.awarded, []);

    const bad = await alice('POST', '/scores', { game: 'pc-tetris', metric: 'lines', value: -1, idem: 'alice-lines-2' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error, 'value out of range');

    // A player id in the body is ignored: the session decides who you are.
    const me = (await alice('GET', '/me')).body.player.id;
    await bob('POST', '/scores', { game: 'pc-tetris', metric: 'lines', value: 70, idem: 'bob-lines-1', playerId: me, player_id: me });
    const aliceView = (await alice('GET', '/me')).body;
    assert.equal(aliceView.bests.find(b => b.metric === 'lines').value, 44);
    assert.equal(aliceView.awards.length, 1);

    const board = await alice('GET', '/leaderboard?game=pc-tetris&metric=lines');
    assert.equal(board.status, 200);
    assert.deepEqual(board.body.rows.map(r => [r.value, r.you]), [[70, false], [44, true]]);
    assert.deepEqual(board.body.you, { rank: 2, value: 44 });
    assert.equal(board.body.selfReported, true);
    assert.ok(board.body.rows.every(r => !('pid' in r)), 'internal ids never leave the server');

    assert.equal((await alice('GET', '/leaderboard?game=nope&metric=x')).status, 400);
    const list = await alice('GET', '/leaderboards');
    assert.ok(list.body.games.some(g => g.id === 'hotwheels' && g.metrics[0].better === 'lower'));

    assert.equal((await alice('PATCH', '/me', { language: 'es' })).body.player.language, 'es');
    assert.equal((await alice('PATCH', '/me', { language: '<script>' })).status, 400);

    await alice('POST', '/session/end');
    assert.deepEqual((await alice('GET', '/me')).body, { player: null });
  } finally {
    await close();
  }
});
