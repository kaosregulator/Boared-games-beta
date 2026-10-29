import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createDiscordRest, DiscordError } from '../../server/discord/rest.mjs';
import { applyRoleSync, deleteSyncedRoles, displayName, normalizeRoleName, planRoleSync } from '../../server/discord/roleSync.mjs';

const catalog = JSON.parse(fs.readFileSync('src/rewards/catalog.json', 'utf8'));

const guild = [
  { id: 'G', name: '@everyone', position: 0, managed: false, color: 0 },
  { id: 'tester', name: '🧪 Game Tester', position: 2, managed: false, color: 0 },
  { id: 'bot', name: 'Claudeg', position: 9, managed: true, color: 0 },
  { id: 'hand-made-genx', name: 'gen x', position: 3, managed: false, color: 123 },
];

test('catalogue: unique keys, valid families, names Discord accepts, every unlock is concrete', () => {
  const keys = new Set();
  const families = new Set(Object.keys(catalog.families));
  for (const role of catalog.roles) {
    assert.ok(!keys.has(role.key), `duplicate key ${role.key}`);
    keys.add(role.key);
    assert.ok(families.has(role.family), `${role.key} family`);
    assert.ok(catalog.rarityColors[role.rarity], `${role.key} rarity`);
    assert.ok(displayName(role).length <= 100, `${role.key} name too long for Discord`);
    assert.ok(role.meaning && role.meaning.length > 10, `${role.key} needs a meaning`);
    assert.ok(role.unlock?.type, `${role.key} unlock`);
  }
  for (const role of catalog.roles) {
    for (const k of [...(role.unlock.requires ?? []), ...(role.unlock.requiresAnyOf ?? [])]) assert.ok(keys.has(k), `${role.key} requires unknown ${k}`);
    if (role.unlock.type === 'chat-level') assert.equal(role.family, 'chat');
    if (role.unlock.type === 'self-select') assert.equal(role.family, 'generation');
  }
  const gens = catalog.roles.filter(r => r.family === 'generation').map(r => r.name);
  assert.deepEqual(gens, ['Baby Boomer', 'Gen X', 'Millennial', 'Gen Z', 'Gen Alpha', 'Gen Beta']);
  const early = catalog.roles.filter(r => r.unlock.type === 'early-member');
  assert.equal(early.length, 1);
  assert.equal(early[0].unlock.cap, 50);
});

test('names match across emoji, case and spacing', () => {
  assert.equal(normalizeRoleName('🧪 Game Tester'), normalizeRoleName('game tester'));
  assert.equal(normalizeRoleName('Gen X'), normalizeRoleName('gen  x'));
  assert.notEqual(normalizeRoleName('Gen X'), normalizeRoleName('Gen Z'));
});

test('plan reuses existing roles and never duplicates them', () => {
  const p = planRoleSync({ catalog, guildRoles: guild, mapping: {}, botTopPosition: 9 });
  const tester = p.actions.find(a => a.key === 'community.tester');
  assert.equal(tester.type, 'keep');
  assert.equal(tester.roleId, 'tester');
  const genx = p.actions.find(a => a.key === 'gen.x');
  assert.equal(genx.roleId, 'hand-made-genx');
  // A hand-made role is reused as is, not renamed or recoloured.
  assert.equal(genx.type, 'keep');
  const creates = p.actions.filter(a => a.type === 'create');
  assert.equal(creates.length, catalog.roles.length - 2);
  for (const c of creates) {
    assert.equal(c.payload.permissions, '0', 'earned roles grant no permissions');
    assert.equal(c.payload.mentionable, false);
  }
  const ids = p.actions.filter(a => a.roleId).map(a => a.roleId);
  assert.equal(new Set(ids).size, ids.length);
  // Bot-managed roles are never claimed.
  assert.ok(!ids.includes('bot'));
});

test('plan follows the saved mapping and fixes drift on roles it owns', () => {
  const roles = [...guild, { id: 'r1', name: 'Old Name', position: 1, managed: false, color: 0 }];
  const p = planRoleSync({ catalog, guildRoles: roles, mapping: { 'game.chess.win': { id: 'r1', created: true } }, botTopPosition: 9, only: new Set(['game.chess.win']) });
  assert.equal(p.actions.length, 1);
  assert.equal(p.actions[0].type, 'update');
  assert.equal(p.actions[0].patch.name, '♟️ Kitchen Table Grandmaster');
});

test('plan warns when the bot sits at the bottom and could not hand out new roles', () => {
  const p = planRoleSync({ catalog, guildRoles: guild, mapping: {}, botTopPosition: 1 });
  assert.ok(p.warnings.some(w => w.includes('bottom')));
});

function fakeRest() {
  let n = 0;
  const calls = [];
  return {
    calls,
    createRole: async (_g, payload) => { calls.push(['create', payload.name]); return { id: `new${++n}` }; },
    updateRole: async (_g, id, patch) => { calls.push(['update', id, patch]); return {}; },
    deleteRole: async (_g, id) => { calls.push(['delete', id]); return null; },
  };
}

test('apply saves new ids and only deletes roles it created', async () => {
  const rest = fakeRest();
  const only = new Set(['gen.z', 'community.tester']);
  const p = planRoleSync({ catalog, guildRoles: guild, mapping: {}, botTopPosition: 9, only });
  const { mapping, failures } = await applyRoleSync({ rest, guildId: 'G', plan: p });
  assert.equal(failures.length, 0);
  assert.deepEqual(mapping['gen.z'], { id: 'new1', created: true });
  assert.deepEqual(mapping['community.tester'], { id: 'tester', created: false });
  const del = await deleteSyncedRoles({ rest, guildId: 'G', mapping, keys: ['gen.z', 'community.tester'] });
  assert.equal(del.results.find(r => r.key === 'gen.z').status, 'deleted');
  assert.equal(del.results.find(r => r.key === 'community.tester').status, 'refused');
  assert.ok(!del.mapping['gen.z']);
  assert.ok(del.mapping['community.tester']);
  assert.deepEqual(rest.calls.filter(c => c[0] === 'delete'), [['delete', 'new1']]);
});

test('REST client waits out 429s, retries 5xx, and keeps the token out of errors', async () => {
  const slept = [];
  const replies = [
    { status: 429, body: { retry_after: 0.25, message: 'rate limited' } },
    { status: 502, body: { message: 'bad gateway' } },
    { status: 200, body: { id: 'ok' } },
  ];
  const fetchImpl = async (_url, init) => {
    assert.equal(init.headers.Authorization, 'Bot secret-token');
    const r = replies.shift();
    return { ok: r.status < 400, status: r.status, statusText: '', headers: { get: () => null }, text: async () => JSON.stringify(r.body) };
  };
  const rest = createDiscordRest({ token: 'secret-token', fetchImpl, sleep: async ms => { slept.push(ms); } });
  assert.deepEqual(await rest.me(), { id: 'ok' });
  assert.equal(slept[0], 300);
  assert.equal(slept.length, 2);

  const denied = createDiscordRest({
    token: 'secret-token',
    fetchImpl: async () => ({ ok: false, status: 403, statusText: '', headers: { get: () => null }, text: async () => JSON.stringify({ code: 50013, message: 'Missing Permissions' }) }),
    sleep: async () => {},
  });
  await assert.rejects(denied.createRole('G', { name: 'x' }), err => {
    assert.ok(err instanceof DiscordError);
    assert.ok(err.isPermission);
    assert.ok(!err.message.includes('secret-token'));
    return true;
  });
});
