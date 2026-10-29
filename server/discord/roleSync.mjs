/**
 * Creates or reuses a Discord role for every entry in the role catalogue.
 *
 * planRoleSync() is pure: it compares the catalogue with the guild's roles and
 * the saved key -> role id mapping and returns what would change. Nothing is
 * created until applyRoleSync() runs it. The rules:
 *
 *  - A role already mapped to a catalogue key is kept (renamed / recoloured to
 *    match the catalogue if it drifted).
 *  - Otherwise an existing guild role with the same name (ignoring emoji, case
 *    and spacing) is reused, so running the sync never makes duplicates of
 *    roles staff already made by hand.
 *  - Only then is a new role created: no permissions, not hoisted, not
 *    mentionable. Earned roles are cosmetic; they must never grant access.
 *  - Bot-managed and @everyone roles are never touched.
 *  - Deleting only ever removes roles this sync created itself.
 *
 * Discord only lets a bot assign roles below its own highest role, so the plan
 * flags every catalogue role that would sit at or above the bot.
 */

export function displayName(role) {
  return role.emoji ? `${role.emoji} ${role.name}` : role.name;
}

/** Match key for "is this the same role": letters and digits only, lower case. */
export function normalizeRoleName(name) {
  return String(name)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function hexToInt(hex) {
  const n = Number.parseInt(String(hex).replace('#', ''), 16);
  return Number.isFinite(n) ? n : 0;
}

export function roleColor(role, catalog) {
  return hexToInt(role.color ?? catalog.rarityColors?.[role.rarity] ?? '#000000');
}

/**
 * @param catalog   parsed src/rewards/catalog.json
 * @param guildRoles roles from GET /guilds/{id}/roles
 * @param mapping   { [key]: { id, created } } saved from earlier runs
 * @param botTopPosition position of the bot's highest role, or null if unknown
 */
export function planRoleSync({ catalog, guildRoles, mapping = {}, botTopPosition = null, only = null }) {
  const byId = new Map(guildRoles.map(r => [r.id, r]));
  const claimable = guildRoles.filter(r => !r.managed && r.name !== '@everyone');
  const claimed = new Set();
  const actions = [];
  const warnings = [];

  // Mapped roles first, so a later name match can't steal a role that is already someone's.
  for (const role of catalog.roles) {
    const saved = mapping[role.key];
    if (saved?.id && byId.has(saved.id)) claimed.add(saved.id);
  }

  for (const role of catalog.roles) {
    if (only && !only.has(role.key)) continue;
    const name = displayName(role);
    const color = roleColor(role, catalog);
    const saved = mapping[role.key];
    let existing = saved?.id ? byId.get(saved.id) : undefined;
    let via = existing ? 'mapped' : null;
    if (!existing) {
      const targets = [role.reuseExisting, name, role.name].filter(Boolean).map(normalizeRoleName);
      existing = claimable.find(r => !claimed.has(r.id) && targets.includes(normalizeRoleName(r.name)));
      if (existing) via = 'name';
    }
    if (existing) {
      claimed.add(existing.id);
      // A role that already exists is left exactly as it is in Discord. Staff can
      // rename or recolour any role there; the game follows its id, not its name.
      const patch = {};
      actions.push({ type: Object.keys(patch).length ? 'update' : 'keep', key: role.key, roleId: existing.id, name: existing.name, via, patch, created: saved?.created === true });
      if (botTopPosition !== null && existing.position >= botTopPosition) {
        warnings.push(`"${existing.name}" sits at or above the bot's highest role, so the bot can't hand it out. Drag the bot's role above it in Server Settings → Roles.`);
      }
    } else {
      actions.push({
        type: 'create',
        key: role.key,
        name,
        payload: { name, color, hoist: false, mentionable: false, permissions: '0' },
      });
    }
  }

  if (botTopPosition !== null && botTopPosition <= 1 && actions.some(a => a.type === 'create')) {
    warnings.push("The bot's role is at the bottom of the list. New roles land at the same spot, so the bot couldn't hand them out. Move the bot's role up (above Member and Verified) before awarding.");
  }

  return { actions, warnings, summary: summarize(actions) };
}

function summarize(actions) {
  const out = { create: 0, update: 0, keep: 0 };
  for (const a of actions) out[a.type] += 1;
  return out;
}

/** Runs a plan against Discord. Returns the new mapping, plus per-role failures (the run continues past them). */
export async function applyRoleSync({ rest, guildId, plan, mapping = {}, reason = 'Bored Games Room role catalogue' }) {
  const next = { ...mapping };
  const failures = [];
  for (const action of plan.actions) {
    try {
      if (action.type === 'create') {
        const created = await rest.createRole(guildId, action.payload, reason);
        next[action.key] = { id: created.id, created: true };
      } else {
        if (action.type === 'update') await rest.updateRole(guildId, action.roleId, action.patch, reason);
        next[action.key] = { id: action.roleId, created: action.created === true };
      }
    } catch (err) {
      failures.push({ key: action.key, error: err.message, permission: Boolean(err.isPermission) });
    }
  }
  return { mapping: next, failures };
}

/** Deletes catalogue roles this sync created. Hand-made roles that were only reused are refused. */
export async function deleteSyncedRoles({ rest, guildId, mapping, keys, reason = 'Bored Games Room role catalogue cleanup' }) {
  const next = { ...mapping };
  const results = [];
  for (const key of keys) {
    const entry = mapping[key];
    if (!entry?.id) {
      results.push({ key, status: 'not-mapped' });
      continue;
    }
    if (entry.created !== true) {
      results.push({ key, status: 'refused', why: 'role existed before the sync; delete it by hand if you mean it' });
      continue;
    }
    try {
      await rest.deleteRole(guildId, entry.id, reason);
      delete next[key];
      results.push({ key, status: 'deleted' });
    } catch (err) {
      if (err.status === 404) {
        delete next[key];
        results.push({ key, status: 'already-gone' });
      } else results.push({ key, status: 'failed', why: err.message });
    }
  }
  return { mapping: next, results };
}

/** Highest position among the bot's roles in the guild. */
export async function botTopRolePosition(rest, guildId, guildRoles) {
  const me = await rest.me();
  const member = await rest.member(guildId, me.id);
  const positions = new Map(guildRoles.map(r => [r.id, r.position]));
  return Math.max(0, ...member.roles.map(id => positions.get(id) ?? 0));
}
