/**
 * Create, reuse, check or remove the room's Discord roles.
 *
 *   node scripts/discord-roles.mjs plan                  what would change (default; changes nothing)
 *   node scripts/discord-roles.mjs apply                 create missing roles, reuse matches, fix drifted names/colours
 *   node scripts/discord-roles.mjs apply --only gen.x,gen.z
 *   node scripts/discord-roles.mjs delete --keys game.chess.win,game.rubik.speed
 *   node scripts/discord-roles.mjs status                bot, guild, permissions and hierarchy
 *
 * Needs DISCORD_BOT_TOKEN. DISCORD_GUILD_ID defaults to the Nostalgia Game Room.
 * The key -> role id mapping is saved to $DATA_DIR/discord-roles.json, and the
 * game server reads the same file when it hands out roles.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createDiscordRest } from '../server/discord/rest.mjs';
import { applyRoleSync, botTopRolePosition, deleteSyncedRoles, displayName, planRoleSync } from '../server/discord/roleSync.mjs';
import { readJson, writeJson } from '../server/dataDir.mjs';
import { openPostgres } from '../server/db.mjs';

/**
 * The role ids the game server has remembered (it follows ids, so a role
 * renamed in Discord is still the same role). Merged into the mapping so a
 * renamed role is never mistaken for a missing one and created twice.
 * DATABASE_PUBLIC_URL works from your own machine; DATABASE_URL on Railway.
 */
async function rememberedIds() {
  const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!url) return {};
  try {
    const db = await openPostgres(url);
    const rows = (await db.query('SELECT role_key, role_id FROM discord_role_ids')).rows;
    await db.close();
    return Object.fromEntries(rows.map(r => [r.role_key, { id: r.role_id, created: false }]));
  } catch (err) {
    console.log(`(couldn't read remembered role ids from the database: ${err.message})`);
    return {};
  }
}

const MANAGE_ROLES = 1n << 28n;
const ADMINISTRATOR = 1n << 3n;
const MAPPING_FILE = 'discord-roles.json';

const [command = 'plan', ...rest] = process.argv.slice(2);
const flag = name => {
  const i = rest.indexOf(`--${name}`);
  return i > -1 ? rest[i + 1] : null;
};
const guildId = process.env.DISCORD_GUILD_ID || '1562976671622103161';
const catalog = JSON.parse(fs.readFileSync(path.resolve('src/rewards/catalog.json'), 'utf8'));
const api = createDiscordRest({ token: process.env.DISCORD_BOT_TOKEN });

async function status() {
  const me = await api.me();
  const guild = await api.guild(guildId);
  const member = await api.member(guildId, me.id);
  const roles = await api.roles(guildId);
  const everyone = roles.find(r => r.id === guildId);
  let perms = BigInt(everyone?.permissions ?? 0);
  for (const id of member.roles) perms |= BigInt(roles.find(r => r.id === id)?.permissions ?? 0);
  const top = await botTopRolePosition(api, guildId, roles);
  console.log(`Bot: ${me.username} (${me.id})`);
  console.log(`Guild: ${guild.name} (${guild.id}), ${roles.length} roles`);
  console.log(`Manage Roles: ${(perms & MANAGE_ROLES) || (perms & ADMINISTRATOR) ? 'yes' : 'NO'}`);
  console.log(`Bot's highest role position: ${top} of ${Math.max(...roles.map(r => r.position))}`);
  if (top <= 1) console.log("  ⚠ The bot's role is at the bottom. Drag it above Member/Verified so it can hand out the new roles.");
}

async function plan(apply) {
  const roles = await api.roles(guildId);
  const top = await botTopRolePosition(api, guildId, roles);
  const mapping = { ...(await rememberedIds()), ...readJson(MAPPING_FILE, {}) };
  const only = flag('only') ? new Set(flag('only').split(',')) : null;
  const p = planRoleSync({ catalog, guildRoles: roles, mapping, botTopPosition: top, only });
  for (const a of p.actions) {
    const role = catalog.roles.find(r => r.key === a.key);
    const label = displayName(role).padEnd(40);
    if (a.type === 'create') console.log(`  + create  ${label} ${a.key}`);
    else if (a.type === 'update') console.log(`  ~ update  ${label} ${a.key} (${Object.keys(a.patch).join(', ')})`);
    else console.log(`  = reuse   ${label} ${a.key} -> "${a.name}" (${a.via})`);
  }
  console.log(`\n${p.summary.create} to create, ${p.summary.update} to update, ${p.summary.keep} already in place.`);
  for (const w of p.warnings) console.log(`⚠ ${w}`);
  if (!apply) {
    console.log('\nNothing changed. Run with "apply" to make these changes.');
    return;
  }
  const { mapping: next, failures } = await applyRoleSync({ rest: api, guildId, plan: p, mapping });
  writeJson(MAPPING_FILE, next);
  console.log(`\nSaved ${Object.keys(next).length} role ids.`);
  for (const f of failures) console.log(`✗ ${f.key}: ${f.error}${f.permission ? ' (missing permission)' : ''}`);
  if (failures.length) process.exitCode = 1;
}

async function remove() {
  const keys = (flag('keys') ?? '').split(',').filter(Boolean);
  if (!keys.length) throw new Error('delete needs --keys key1,key2 (only roles this script created can be deleted)');
  const mapping = readJson(MAPPING_FILE, {});
  const { mapping: next, results } = await deleteSyncedRoles({ rest: api, guildId, mapping, keys });
  writeJson(MAPPING_FILE, next);
  for (const r of results) console.log(`${r.key}: ${r.status}${r.why ? ` (${r.why})` : ''}`);
}

try {
  if (command === 'status') await status();
  else if (command === 'plan') await plan(false);
  else if (command === 'apply') await plan(true);
  else if (command === 'delete') await remove();
  else throw new Error(`Unknown command "${command}". Use plan, apply, delete or status.`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
