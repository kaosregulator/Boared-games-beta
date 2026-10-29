import { displayName, normalizeRoleName } from './roleSync.mjs';

/**
 * Everything the room does with a signed-in player's Discord membership:
 *
 *  - membership: is this Discord user in the guild? Asked with the bot
 *    (GET /guilds/{id}/members/{user}), so it is checked on the server and
 *    never taken from the browser. Cached a few minutes.
 *  - roles: earned roles and the picked generation are queued in role_sync and
 *    sent to Discord by the bot. Failures are kept and retried with backoff;
 *    nothing is marked synced unless Discord accepted it.
 *  - early member: the first N verified members get the early-member role.
 *    The count is claimed with one conditional UPDATE, so concurrent sign-ins
 *    can't go past the cap.
 *
 * Role ids are looked up by name in the guild (the same match the role sync
 * script uses), so it doesn't matter where that script was run.
 */
const MEMBER_TTL = 5 * 60_000;
const ROLES_TTL = 10 * 60_000;
const MAX_ATTEMPTS = 8;

export function createMembers({ db, rest, guildId, catalog, now = () => Date.now() }) {
  const memberCache = new Map();
  let roleCache = null;
  const byKey = new Map(catalog.roles.map(r => [r.key, r]));
  const getDb = () => (typeof db === 'function' ? db() : Promise.resolve(db));

  /** 'member' | 'not-member' | 'unavailable' (bot missing, no token, Discord down). */
  async function membership(discordId) {
    if (!rest || !guildId) return { status: 'unavailable', reason: 'bot not configured' };
    const hit = memberCache.get(discordId);
    if (hit && now() - hit.at < MEMBER_TTL) return hit.value;
    let value;
    try {
      const m = await rest.member(guildId, discordId);
      value = { status: 'member', roles: m.roles ?? [] };
    } catch (err) {
      if (err.status === 404) value = { status: 'not-member' };
      else return { status: 'unavailable', reason: err.isPermission ? 'bot lacks access to the server' : 'Discord unavailable' };
    }
    memberCache.set(discordId, { at: now(), value });
    return value;
  }

  /**
   * Catalogue key -> Discord role id. A role is found by name once, and its id
   * is remembered in the database; after that the id is what counts, so staff
   * can rename (or re-emoji, or recolour) a role in Discord and it keeps
   * working. Only a role that was deleted is looked up by name again.
   */
  async function roleIds() {
    if (roleCache && now() - roleCache.at < ROLES_TTL) return roleCache.map;
    const roles = await rest.roles(guildId);
    const live = new Set(roles.map(r => r.id));
    const byName = new Map(roles.filter(r => !r.managed).map(r => [normalizeRoleName(r.name), r.id]));
    const d = await getDb();
    const saved = new Map((await d.query('SELECT role_key, role_id FROM discord_role_ids')).rows.map(r => [r.role_key, r.role_id]));
    const map = new Map();
    const taken = new Set();
    // Remembered ids first, so a renamed role can't be claimed by another key's name.
    for (const role of catalog.roles) {
      const id = saved.get(role.key);
      if (id && live.has(id)) {
        map.set(role.key, id);
        taken.add(id);
      }
    }
    for (const role of catalog.roles) {
      if (map.has(role.key)) continue;
      const names = [role.reuseExisting, displayName(role), role.name].filter(Boolean).map(normalizeRoleName);
      const id = names.map(n => byName.get(n)).find(x => x && !taken.has(x));
      if (!id) continue;
      map.set(role.key, id);
      taken.add(id);
      await d.query(
        'INSERT INTO discord_role_ids (role_key, role_id, updated_at) VALUES ($1, $2, $3) ON CONFLICT (role_key) DO UPDATE SET role_id = $2, updated_at = $3',
        [role.key, id, now()],
      );
    }
    roleCache = { at: now(), map };
    return map;
  }

  /** Remember every role's id now, so renames made before anyone earns a role are safe too. */
  async function rememberRoles() {
    if (!rest || !guildId) return 0;
    roleCache = null;
    return (await roleIds()).size;
  }

  async function queue(playerId, roleKey, action) {
    const d = await getDb();
    const t = now();
    await d.query(
      `INSERT INTO role_sync (player_id, role_key, action, status, attempts, last_error, next_at, updated_at)
       VALUES ($1, $2, $3, 'pending', 0, NULL, $4, $4)
       ON CONFLICT (player_id, role_key) DO UPDATE SET action = $3, status = 'pending', attempts = 0, last_error = NULL, next_at = $4, updated_at = $4`,
      [playerId, roleKey, action, t],
    );
  }

  /** Queue every role the player should have in Discord: earned awards and their generation. */
  async function queueAll(playerId) {
    const d = await getDb();
    const rows = (await d.query('SELECT role_key FROM awards WHERE player_id = $1', [playerId])).rows;
    for (const r of rows) if (byKey.has(r.role_key)) await queue(playerId, r.role_key, 'add');
    const p = await d.one('SELECT generation_key FROM players WHERE id = $1', [playerId]);
    if (p?.generation_key) await queue(playerId, p.generation_key, 'add');
  }

  /** Sends due queue entries to Discord. Returns how many were sent. */
  async function processQueue(limit = 20) {
    if (!rest || !guildId) return 0;
    const d = await getDb();
    const due = (
      await d.query(
        `SELECT q.player_id, q.role_key, q.action, q.attempts, p.discord_id FROM role_sync q JOIN players p ON p.id = q.player_id
         WHERE q.status = 'pending' AND q.next_at <= $1 ORDER BY q.next_at LIMIT $2`,
        [now(), limit],
      )
    ).rows;
    if (!due.length) return 0;
    let ids;
    try {
      ids = await roleIds();
    } catch (err) {
      for (const job of due) await fail(job, `could not read the server's roles: ${err.message}`, true);
      return 0;
    }
    let sent = 0;
    for (const job of due) {
      if (!job.discord_id) {
        await done(job, 'failed', 'player is not signed in with Discord');
        continue;
      }
      const roleId = ids.get(job.role_key);
      if (!roleId) {
        // The role isn't in the server yet (run the roles script); try again later rather than give up.
        await fail(job, 'role not found in the server', true);
        continue;
      }
      const member = await membership(job.discord_id);
      if (member.status === 'not-member') {
        await fail(job, 'not a member of the server', true);
        continue;
      }
      if (member.status === 'unavailable') {
        await fail(job, member.reason, true);
        continue;
      }
      try {
        if (job.action === 'add') await rest.addMemberRole(guildId, job.discord_id, roleId, 'Bored Games Room reward');
        else await rest.removeMemberRole(guildId, job.discord_id, roleId, 'Bored Games Room generation change');
        memberCache.delete(job.discord_id);
        await done(job, 'synced', null);
        sent += 1;
      } catch (err) {
        await fail(job, err.isPermission ? 'bot is not allowed to give this role (move its role above it)' : err.message, !err.isPermission || job.attempts < 2);
      }
    }
    return sent;
  }

  async function done(job, status, error) {
    const d = await getDb();
    await d.query('UPDATE role_sync SET status = $1, last_error = $2, updated_at = $3 WHERE player_id = $4 AND role_key = $5', [status, error, now(), job.player_id, job.role_key]);
  }

  /** Back off 1, 2, 4 … 120 min; after MAX_ATTEMPTS it's marked failed for an admin to retry. */
  async function fail(job, error, retry) {
    const d = await getDb();
    const attempts = job.attempts + 1;
    const give = !retry || attempts >= MAX_ATTEMPTS;
    const wait = Math.min(120, 2 ** (attempts - 1)) * 60_000;
    await d.query('UPDATE role_sync SET status = $1, attempts = $2, last_error = $3, next_at = $4, updated_at = $5 WHERE player_id = $6 AND role_key = $7', [
      give ? 'failed' : 'pending',
      attempts,
      String(error).slice(0, 300),
      now() + wait,
      now(),
      job.player_id,
      job.role_key,
    ]);
  }

  /** Pick (or clear) the player's generation. Swaps the generation role in Discord. */
  async function setGeneration(playerId, key) {
    if (key !== null && byKey.get(key)?.unlock?.type !== 'self-select') throw Object.assign(new Error('not a generation role'), { status: 400 });
    const d = await getDb();
    const before = (await d.one('SELECT generation_key FROM players WHERE id = $1', [playerId]))?.generation_key ?? null;
    await d.query('UPDATE players SET generation_key = $1 WHERE id = $2', [key, playerId]);
    if (before && before !== key) await queue(playerId, before, 'remove');
    if (key) await queue(playerId, key, 'add');
  }

  /**
   * The early-member reward for a verified member, if any are left. The claim
   * is a single conditional UPDATE inside the same transaction as the award,
   * so the count can't pass the cap however many people sign in at once.
   */
  async function claimEarly(playerId) {
    const role = catalog.roles.find(r => r.unlock.type === 'early-member');
    if (!role) return false;
    const cap = Number(process.env.EARLY_MEMBER_CAP) || role.unlock.cap;
    const d = await getDb();
    const got = await d.tx(async t => {
      if (await t.one('SELECT 1 AS x FROM awards WHERE player_id = $1 AND role_key = $2', [playerId, role.key])) return false;
      const claimed = await t.query("UPDATE counters SET value = value + 1 WHERE name = 'early-member' AND value < $1 RETURNING value", [cap]);
      if (!claimed.rows.length) return false;
      await t.query("INSERT INTO awards (player_id, role_key, source, awarded_at) VALUES ($1, $2, 'early-member', $3)", [playerId, role.key, now()]);
      return true;
    });
    if (got) await queue(playerId, role.key, 'add');
    return got;
  }

  async function earlyStatus() {
    const role = catalog.roles.find(r => r.unlock.type === 'early-member');
    const cap = Number(process.env.EARLY_MEMBER_CAP) || role?.unlock.cap || 0;
    const d = await getDb();
    const issued = Number((await d.one("SELECT value FROM counters WHERE name = 'early-member'"))?.value ?? 0);
    return { role: role?.key ?? null, cap, issued, remaining: Math.max(0, cap - issued) };
  }

  return { membership, queue, queueAll, processQueue, setGeneration, claimEarly, earlyStatus, roleIds, rememberRoles };
}
