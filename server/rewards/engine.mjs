/**
 * Turns what a player has done into earned roles. Runs after every event or
 * score the player sends. Each catalogue unlock is checked against stored
 * results, and an award is written once (the primary key makes replays,
 * reconnects and double submits harmless). Chained roles (Windows 98
 * Survivor needs two others) are re-checked until nothing new unlocks.
 *
 * Not decided here: chat levels (Tatsu), generation (the player picks), staff
 * awards (manual), and the early-member reward (its own capped allocation).
 */
const AUTOMATIC = new Set(['stat', 'win', 'event', 'launch', 'meta', 'count']);

async function awardedKeys(db, playerId) {
  return new Set((await db.query('SELECT role_key FROM awards WHERE player_id = $1', [playerId])).rows.map(r => r.role_key));
}

async function bestValue(db, playerId, game, metric, op) {
  const agg = op === '<=' ? 'MIN' : 'MAX';
  const row = await db.one(`SELECT ${agg}(value) AS v FROM scores WHERE player_id = $1 AND game = $2 AND metric = $3`, [playerId, game, metric]);
  return row?.v ?? null;
}

async function eventCount(db, playerId, game, event) {
  return Number((await db.one('SELECT COUNT(*) AS n FROM game_events WHERE player_id = $1 AND game = $2 AND event = $3', [playerId, game, event])).n);
}

export async function meetsUnlock(db, playerId, role, have, catalog) {
  const u = role.unlock;
  switch (u.type) {
    case 'stat': {
      if (u.value === null || u.value === undefined) return false;
      const v = await bestValue(db, playerId, role.game, u.metric, u.op);
      if (v === null) return false;
      return u.op === '<=' ? Number(v) <= u.value : Number(v) >= u.value;
    }
    case 'win':
      return (await eventCount(db, playerId, role.game, 'won')) >= u.count;
    case 'event':
      return (await eventCount(db, playerId, role.game, u.event)) > 0;
    case 'launch': {
      const marks = u.games.map((_, i) => `$${i + 2}`).join(',');
      const row = await db.one(`SELECT COUNT(DISTINCT game) AS n FROM game_events WHERE player_id = $1 AND event = 'launch' AND game IN (${marks})`, [playerId, ...u.games]);
      return Number(row.n) >= u.distinct;
    }
    case 'meta':
      if (u.requires) return u.requires.every(k => have.has(k));
      return u.requiresAnyOf.filter(k => have.has(k)).length >= u.atLeast;
    case 'count': {
      const families = new Set(u.families);
      const n = catalog.roles.filter(r => r.key !== role.key && families.has(r.family) && have.has(r.key)).length;
      return n >= u.atLeast;
    }
    default:
      return false;
  }
}

/** Returns the keys newly awarded by this call. */
export async function evaluateAwards(db, playerId, catalog, now = Date.now()) {
  const have = await awardedKeys(db, playerId);
  const fresh = [];
  for (let pass = 0; pass < 5; pass += 1) {
    let changed = false;
    for (const role of catalog.roles) {
      if (have.has(role.key) || !AUTOMATIC.has(role.unlock.type)) continue;
      if (!(await meetsUnlock(db, playerId, role, have, catalog))) continue;
      const res = await db.query("INSERT INTO awards (player_id, role_key, source, awarded_at) VALUES ($1, $2, 'game', $3) ON CONFLICT DO NOTHING", [playerId, role.key, now]);
      if (res.rowCount > 0) fresh.push(role.key);
      have.add(role.key);
      changed = true;
    }
    if (!changed) break;
  }
  return fresh;
}
