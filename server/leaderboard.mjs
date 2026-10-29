/**
 * Score validation and the universal leaderboard. Every game ranks by its own
 * metrics (src/rewards/leaderboards.json): higher-is-better scores, lower-is-
 * better times, and counts of wins. Results come from the player's browser, so
 * they are stored as unverified and shown as self-reported; the checks here
 * stop malformed, impossible, duplicate and flooding submissions, not a
 * determined cheat.
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const IDEM = /^[A-Za-z0-9_-]{8,64}$/;

export function indexBoards(boards) {
  const games = new Map();
  for (const g of boards.games) games.set(g.id, { ...g, metricMap: new Map(g.metrics.map(m => [m.id, m])) });
  return games;
}

export function validateEvent(games, body) {
  const game = games.get(body?.game);
  if (!game) throw new ValidationError('unknown game');
  if (!game.events.includes(body.event)) throw new ValidationError('unknown event for this game');
  const mode = body.mode == null || body.mode === '' ? null : String(body.mode);
  if (mode && !(game.modes ?? []).includes(mode)) throw new ValidationError('unknown mode');
  if (body.idem != null && !IDEM.test(String(body.idem))) throw new ValidationError('bad idempotency key');
  return { game: game.id, event: body.event, mode, idem: body.idem ?? null };
}

export function validateScore(games, body) {
  const game = games.get(body?.game);
  if (!game) throw new ValidationError('unknown game');
  const metric = game.metricMap.get(body.metric);
  if (!metric || metric.kind !== 'best') throw new ValidationError('unknown metric');
  const modes = game.modes ?? [];
  const mode = body.mode == null ? '' : String(body.mode);
  if (modes.length ? !modes.includes(mode) : mode !== '') throw new ValidationError('unknown mode');
  const value = Number(body.value);
  if (typeof body.value !== 'number' || !Number.isFinite(value)) throw new ValidationError('value must be a number');
  if (metric.integer && !Number.isInteger(value)) throw new ValidationError('value must be a whole number');
  if (value < metric.min || value > metric.max) throw new ValidationError('value out of range');
  if (!IDEM.test(String(body.idem ?? ''))) throw new ValidationError('idempotency key required');
  const meta = body.meta && typeof body.meta === 'object' ? JSON.stringify(body.meta).slice(0, 500) : null;
  return { game: game.id, metric: metric.id, mode, value, idem: String(body.idem), meta };
}

export async function recordEvent(db, playerId, e, now = Date.now()) {
  const res = await db.query(
    'INSERT INTO game_events (player_id, game, event, mode, idem, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
    [playerId, e.game, e.event, e.mode, e.idem, now],
  );
  return res.rowCount > 0;
}

export async function recordScore(db, playerId, s, now = Date.now()) {
  const res = await db.query(
    'INSERT INTO scores (player_id, game, metric, mode, value, verified, meta, idem, created_at) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8) ON CONFLICT DO NOTHING',
    [playerId, s.game, s.metric, s.mode, s.value, s.meta, s.idem, now],
  );
  return res.rowCount > 0;
}

export async function personalBest(db, playerId, game, metric, mode, better) {
  const agg = better === 'lower' ? 'MIN' : 'MAX';
  const row = await db.one(`SELECT ${agg}(value) AS best FROM scores WHERE player_id = $1 AND game = $2 AND metric = $3 AND mode = $4`, [playerId, game, metric, mode]);
  return row?.best ?? null;
}

/**
 * One row per player: their best value (or their count), ranked. Ties go to
 * whoever got there first. Merged guest records are left out.
 */
export async function leaderboard(db, games, { game, metric, mode = '', limit = 25, offset = 0, playerId = null }) {
  const g = games.get(game);
  const m = g?.metricMap.get(metric);
  if (!g || !m) throw new ValidationError('unknown game or metric');
  const lim = Math.max(1, Math.min(50, Number(limit) || 25));
  const off = Math.max(0, Math.min(100000, Number(offset) || 0));
  let ranked;
  let params;
  if (m.kind === 'count') {
    ranked = `SELECT e.player_id, COUNT(*) AS value, MAX(e.created_at) AS at
              FROM game_events e JOIN players p ON p.id = e.player_id
              WHERE e.game = $1 AND e.event = $2 AND p.merged_into IS NULL
              GROUP BY e.player_id`;
    params = [g.id, m.countEvent];
  } else {
    const agg = m.better === 'lower' ? 'MIN' : 'MAX';
    // `at` is when the player first reached their best, so a tie goes to whoever got there first.
    ranked = `SELECT s.player_id, b.value AS value, MIN(s.created_at) AS at
              FROM scores s
              JOIN (SELECT player_id, ${agg}(value) AS value FROM scores
                    WHERE game = $1 AND metric = $2 AND mode = $3 GROUP BY player_id) b
                ON b.player_id = s.player_id AND s.value = b.value
              JOIN players p ON p.id = s.player_id
              WHERE s.game = $1 AND s.metric = $2 AND s.mode = $3 AND p.merged_into IS NULL
              GROUP BY s.player_id, b.value`;
    params = [g.id, m.id, mode];
  }
  const n = params.length;
  const dir = m.better === 'lower' ? 'ASC' : 'DESC';
  const rows = (
    await db.query(
      `SELECT r.player_id, r.value, r.at, p.display_name, p.kind, p.avatar
       FROM (${ranked}) r JOIN players p ON p.id = r.player_id
       ORDER BY r.value ${dir}, r.at ASC LIMIT $${n + 1} OFFSET $${n + 2}`,
      [...params, lim, off],
    )
  ).rows;
  const total = Number((await db.one(`SELECT COUNT(*) AS n FROM (${ranked}) t`, params)).n);
  let you = null;
  if (playerId) {
    const mine = await db.one(`SELECT value, at FROM (${ranked}) t WHERE player_id = $${n + 1}`, [...params, playerId]);
    if (mine) {
      const cmp = m.better === 'lower' ? '<' : '>';
      const ahead = await db.one(
        `SELECT COUNT(*) AS n FROM (${ranked}) t WHERE value ${cmp} $${n + 1} OR (value = $${n + 1} AND at < $${n + 2})`,
        [...params, mine.value, mine.at],
      );
      you = { rank: Number(ahead.n) + 1, value: Number(mine.value) };
    }
  }
  return {
    game: g.id,
    metric: m.id,
    mode,
    better: m.better,
    unit: m.unit ?? null,
    // No game validates on the server yet, so every board is self-reported.
    selfReported: true,
    total,
    offset: off,
    rows: rows.map((r, i) => ({
      rank: off + i + 1,
      // Internal: lets the API mark your own row. Stripped before it leaves the server.
      pid: r.player_id,
      name: r.display_name,
      guest: r.kind === 'guest',
      avatar: r.avatar ?? null,
      value: Number(r.value),
      you: r.player_id === playerId,
    })),
    you,
  };
}
