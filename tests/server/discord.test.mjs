import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { openSqlite } from '../../server/db.mjs';
import { checkState, exchangeCode, linkDiscord, oauthConfig, safeReturnTo, startSignIn } from '../../server/auth/discord.mjs';
import { createMembers } from '../../server/discord/members.mjs';
import { createGuest } from '../../server/players.mjs';
import { recordScore } from '../../server/leaderboard.mjs';

const catalog = JSON.parse(fs.readFileSync('src/rewards/catalog.json', 'utf8'));
const config = { clientId: '123', clientSecret: 'shh', redirectUri: 'https://room.example/api/auth/discord/callback', ready: true };

test('sign-in asks only for identify and checks the state it set', () => {
  assert.equal(oauthConfig({}).ready, false);
  assert.equal(oauthConfig({ DISCORD_CLIENT_ID: '1', DISCORD_CLIENT_SECRET: '2', PUBLIC_URL: 'https://x.app/' }).redirectUri, 'https://x.app/api/auth/discord/callback');
  const { url, cookie } = startSignIn(config, '/?x=1', { secure: true });
  const u = new URL(url);
  assert.equal(u.searchParams.get('scope'), 'identify');
  assert.equal(u.searchParams.get('client_id'), '123');
  assert.ok(!url.includes('shh'), 'the client secret never goes to the browser');
  assert.match(cookie, /HttpOnly; SameSite=Lax; Max-Age=600; Secure/);
  const value = cookie.split(';')[0].split('=')[1];
  const state = u.searchParams.get('state');
  const req = s => ({ headers: { cookie: `bgr_oauth=${value}` }, query: { state: s } });
  assert.deepEqual(checkState(req(state)), { returnTo: '/?x=1' });
  assert.equal(checkState(req(`${state}x`)), null);
  assert.equal(checkState({ headers: {}, query: { state } }), null);
  assert.equal(safeReturnTo('https://evil.example'), '/');
  assert.equal(safeReturnTo('//evil.example'), '/');
  assert.equal(safeReturnTo('/room'), '/room');
});

test('the code is exchanged on the server and only the user’s id, name and avatar are kept', async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push([String(url), init]);
    if (String(url).endsWith('/oauth2/token')) return { ok: true, status: 200, json: async () => ({ access_token: 'at', token_type: 'Bearer' }) };
    return { ok: true, status: 200, json: async () => ({ id: '111222333444', username: 'kid', global_name: 'Rad Kid', avatar: 'abc' }) };
  };
  const user = await exchangeCode(config, 'the-code', fetchImpl);
  assert.deepEqual(user, { id: '111222333444', name: 'Rad Kid', avatar: 'https://cdn.discordapp.com/avatars/111222333444/abc.png?size=128' });
  assert.equal(calls[0][1].body.get('client_secret'), 'shh');
  assert.equal(calls[1][1].headers.Authorization, 'Bearer at');
  await assert.rejects(exchangeCode(config, 'x', async () => ({ ok: false, status: 400 })), e => e.code === 'code-rejected');
  await assert.rejects(exchangeCode(config, 'x', async () => { throw new Error('down'); }), e => e.code === 'discord-unreachable');
});

test('signing in upgrades the guest in place, and a second device merges into the same account', async () => {
  const db = await openSqlite();
  const user = { id: '999', name: 'Rad Kid', avatar: null };
  const guest = (await createGuest(db)).player;
  await recordScore(db, guest.id, { game: 'pc-tetris', metric: 'score', mode: '', value: 500, meta: null, idem: 'aaaaaaaa1' });
  const id = await linkDiscord(db, { guestId: guest.id, user });
  assert.equal(id, guest.id, 'same player, history kept');
  const row = await db.one('SELECT kind, discord_id, display_name FROM players WHERE id = $1', [id]);
  assert.deepEqual({ ...row }, { kind: 'discord', discord_id: '999', display_name: 'Rad Kid' });

  // Another browser played as a guest, then signs in to the same Discord account.
  const other = (await createGuest(db)).player;
  await recordScore(db, other.id, { game: 'pc-tetris', metric: 'score', mode: '', value: 900, meta: null, idem: 'bbbbbbbb1' });
  await db.query("INSERT INTO awards (player_id, role_key, source, awarded_at) VALUES ($1, 'game.chess.win', 'game', 1)", [other.id]);
  await db.query("INSERT INTO awards (player_id, role_key, source, awarded_at) VALUES ($1, 'game.chess.win', 'game', 1)", [guest.id]);
  assert.equal(await linkDiscord(db, { guestId: other.id, user }), guest.id);
  assert.equal(Number((await db.one('SELECT COUNT(*) AS n FROM scores WHERE player_id = $1', [guest.id])).n), 2);
  assert.equal(Number((await db.one("SELECT COUNT(*) AS n FROM awards WHERE player_id = $1 AND role_key = 'game.chess.win'", [guest.id])).n), 1, 'no duplicate award');
  assert.equal((await db.one('SELECT merged_into FROM players WHERE id = $1', [other.id])).merged_into, guest.id);
  // Signing in with nobody's guest makes no new player.
  assert.equal(await linkDiscord(db, { guestId: null, user }), guest.id);
});

function fakeRest({ members = {}, roles = null, failAdd = 0 } = {}) {
  const calls = [];
  const guildRoles =
    roles ?? catalog.roles.map((r, i) => ({ id: `role${i}`, name: r.reuseExisting ?? `${r.emoji} ${r.name}`, managed: false }));
  return {
    calls,
    roles: async () => guildRoles,
    member: async (_g, id) => {
      if (members[id] === 'down') throw Object.assign(new Error('Discord 503'), { status: 503 });
      if (!members[id]) throw Object.assign(new Error('Unknown Member'), { status: 404 });
      return { roles: [] };
    },
    addMemberRole: async (_g, user, role) => {
      if (failAdd > 0) {
        failAdd -= 1;
        throw Object.assign(new Error('Discord 502'), { status: 502 });
      }
      calls.push(['add', user, role]);
    },
    removeMemberRole: async (_g, user, role) => calls.push(['remove', user, role]),
  };
}

async function signedIn(db, discordId) {
  const p = (await createGuest(db)).player;
  await linkDiscord(db, { guestId: p.id, user: { id: discordId, name: 'P', avatar: null } });
  return p.id;
}

test('membership is checked with the bot; a missing bot or an outage is "unavailable", never a guess', async () => {
  const db = await openSqlite();
  const rest = fakeRest({ members: { '1': true, '3': 'down' } });
  const m = createMembers({ db, rest, guildId: 'G', catalog });
  assert.equal((await m.membership('1')).status, 'member');
  assert.equal((await m.membership('2')).status, 'not-member');
  assert.equal((await m.membership('3')).status, 'unavailable');
  const none = createMembers({ db, rest: null, guildId: 'G', catalog });
  assert.equal((await none.membership('1')).status, 'unavailable');
});

test('earned roles reach Discord through the queue, retry after a failure, and are only marked synced when Discord accepts', async () => {
  let clock = 1_000_000;
  const db = await openSqlite();
  const rest = fakeRest({ members: { '42': true }, failAdd: 1 });
  const m = createMembers({ db, rest, guildId: 'G', catalog, now: () => clock });
  const pid = await signedIn(db, '42');
  await m.queue(pid, 'game.chess.win', 'add');
  assert.equal(await m.processQueue(), 0);
  let row = await db.one('SELECT status, attempts, last_error FROM role_sync WHERE player_id = $1', [pid]);
  assert.equal(row.status, 'pending');
  assert.equal(Number(row.attempts), 1);
  assert.match(row.last_error, /502/);
  assert.equal(await m.processQueue(), 0, 'not retried before its backoff');
  clock += 61_000;
  assert.equal(await m.processQueue(), 1);
  row = await db.one('SELECT status FROM role_sync WHERE player_id = $1', [pid]);
  assert.equal(row.status, 'synced');
  const idx = catalog.roles.findIndex(r => r.key === 'game.chess.win');
  assert.deepEqual(rest.calls, [['add', '42', `role${idx}`]]);
});

test('a role for someone not in the server waits instead of being marked done', async () => {
  const db = await openSqlite();
  const rest = fakeRest({ members: {} });
  const m = createMembers({ db, rest, guildId: 'G', catalog });
  const pid = await signedIn(db, '77');
  await m.queue(pid, 'game.chess.win', 'add');
  await m.processQueue();
  const row = await db.one('SELECT status, last_error FROM role_sync WHERE player_id = $1', [pid]);
  assert.equal(row.status, 'pending');
  assert.match(row.last_error, /not a member/);
  assert.equal(rest.calls.length, 0);
});

test('generation is picked by the player; changing it swaps the Discord role; nothing else is accepted', async () => {
  const db = await openSqlite();
  const rest = fakeRest({ members: { '5': true } });
  const m = createMembers({ db, rest, guildId: 'G', catalog });
  const pid = await signedIn(db, '5');
  await m.setGeneration(pid, 'gen.millennial');
  await m.processQueue();
  await m.setGeneration(pid, 'gen.z');
  await m.processQueue();
  const id = k => `role${catalog.roles.findIndex(r => r.key === k)}`;
  assert.deepEqual(rest.calls, [['add', '5', id('gen.millennial')], ['remove', '5', id('gen.millennial')], ['add', '5', id('gen.z')]]);
  assert.equal((await db.one('SELECT generation_key FROM players WHERE id = $1', [pid])).generation_key, 'gen.z');
  await assert.rejects(m.setGeneration(pid, 'game.chess.win'), /not a generation/);
  await assert.rejects(m.setGeneration(pid, 'community.you-had-to-be-there'), /not a generation/);
});

test('the early-member reward stops at its cap even when everyone claims at once, and never twice for one player', async () => {
  process.env.EARLY_MEMBER_CAP = '3';
  try {
    const db = await openSqlite();
    const m = createMembers({ db, rest: fakeRest(), guildId: 'G', catalog });
    const players = [];
    for (let i = 0; i < 6; i += 1) players.push(await signedIn(db, `100${i}`));
    const results = await Promise.all(players.map(p => m.claimEarly(p)));
    assert.equal(results.filter(Boolean).length, 3);
    assert.equal(await m.claimEarly(players[results.indexOf(true)]), false, 'no second claim');
    const status = await m.earlyStatus();
    assert.deepEqual({ cap: status.cap, issued: status.issued, remaining: status.remaining }, { cap: 3, issued: 3, remaining: 0 });
    assert.equal(Number((await db.one("SELECT COUNT(*) AS n FROM awards WHERE role_key = 'community.you-had-to-be-there'")).n), 3);
  } finally {
    delete process.env.EARLY_MEMBER_CAP;
  }
});

test('renaming a role in Discord keeps it working: its id is remembered once found', async () => {
  const db = await openSqlite();
  const guildRoles = [{ id: 'R-CHESS', name: '♟️ Kitchen Table Grandmaster', managed: false }];
  const rest = fakeRest({ members: { '8': true }, roles: guildRoles });
  let clock = 1;
  const m = createMembers({ db, rest, guildId: 'G', catalog, now: () => clock });
  assert.equal(await m.rememberRoles(), 1);
  // Staff rename it, and another role later takes the old name.
  guildRoles[0].name = '🏆 Chess Boss';
  guildRoles.push({ id: 'R-IMPOSTOR', name: 'Kitchen Table Grandmaster', managed: false });
  clock += 11 * 60_000;
  const pid = await signedIn(db, '8');
  await m.queue(pid, 'game.chess.win', 'add');
  await m.processQueue();
  assert.deepEqual(rest.calls, [['add', '8', 'R-CHESS']]);
  // A role that was deleted is found by name again.
  guildRoles.splice(0, 1);
  clock += 11 * 60_000;
  assert.equal((await m.roleIds()).get('game.chess.win'), 'R-IMPOSTOR');
});
