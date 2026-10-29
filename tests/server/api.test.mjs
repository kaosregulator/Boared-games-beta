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

test('Discord sign-in over HTTP: state checked, guest upgraded, membership verified by the bot, early member, generation, admin gate', async () => {
  const db = await openSqlite(':memory:');
  const discordId = '555666777888';
  const rest = {
    member: async (_g, id) => {
      if (id === discordId) return { roles: [] };
      throw Object.assign(new Error('Unknown Member'), { status: 404 });
    },
    roles: async () => [],
    addMemberRole: async () => {},
    removeMemberRole: async () => {},
  };
  const fetchImpl = async url =>
    String(url).endsWith('/oauth2/token')
      ? { ok: true, status: 200, json: async () => ({ access_token: 'at' }) }
      : { ok: true, status: 200, json: async () => ({ id: discordId, username: 'radkid', global_name: 'Rad Kid', avatar: null }) };
  const env = { DISCORD_CLIENT_ID: '1', DISCORD_CLIENT_SECRET: 's', PUBLIC_URL: 'http://127.0.0.1', ADMIN_DISCORD_IDS: '42' };
  const app = express();
  app.use(express.json());
  app.use('/api', createRoomApi({ db, env, rest, fetchImpl, worker: false }));
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const jar = new Map();
  const go = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      redirect: 'manual',
      headers: { 'content-type': 'application/json', cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      const v = pair.slice(i + 1);
      if (v) jar.set(pair.slice(0, i), v);
      else jar.delete(pair.slice(0, i));
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    return { status: res.status, location: res.headers.get('location'), body: json };
  };
  try {
    assert.deepEqual((await go('GET', '/auth/status')).body, { discord: true });
    const guest = (await go('POST', '/session')).body.player;
    await go('POST', '/scores', { game: 'pc-tetris', metric: 'lines', value: 44, idem: 'guest-lines-1' });

    const start = await go('GET', '/auth/discord?returnTo=/room');
    assert.equal(start.status, 302);
    const state = new URL(start.location).searchParams.get('state');
    assert.equal((await go('GET', `/auth/discord/callback?state=wrong&code=c`)).location, '/?signin=expired');

    const again = await go('GET', '/auth/discord?returnTo=/room');
    const good = new URL(again.location).searchParams.get('state');
    assert.notEqual(good, state);
    const cb = await go('GET', `/auth/discord/callback?state=${good}&code=c`);
    assert.equal(cb.location, '/room?signin=ok');

    const me = (await go('GET', '/me')).body;
    assert.equal(me.player.id, guest.id, 'the guest became the account');
    assert.equal(me.player.kind, 'discord');
    assert.equal(me.player.displayName, 'Rad Kid');
    assert.ok(me.awards.some(a => a.key === 'game.pc-tetris.long-bar'), 'guest history kept');
    assert.ok(me.awards.some(a => a.key === 'community.you-had-to-be-there'), 'early member for a verified member');

    const discord = (await go('GET', '/me/discord')).body;
    assert.equal(discord.membership, 'member');
    assert.ok(discord.sync.some(s => s.key === 'game.pc-tetris.long-bar' && s.status === 'pending'));

    assert.equal((await go('PUT', '/me/generation', { key: 'gen.x' })).body.player.generation, 'gen.x');
    assert.equal((await go('PUT', '/me/generation', { key: 'game.chess.win' })).status, 400);
    assert.equal((await go('GET', '/admin/rewards')).status, 403);
  } finally {
    await new Promise(r => server.close(r));
  }
});
