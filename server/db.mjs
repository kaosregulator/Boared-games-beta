import path from 'node:path';
import { dataDir } from './dataDir.mjs';

/**
 * The room's player database.
 *
 * Production uses the Railway Postgres (DATABASE_URL). Without it (local dev,
 * tests) the same SQL runs on Node's built-in SQLite, in a file in DATA_DIR or
 * in memory. Both sit behind one small async interface:
 *
 *   db.query(sql, params) -> { rows, rowCount }
 *   db.one(sql, params)   -> first row or null
 *   db.tx(async t => ...) -> runs inside a transaction (t has query/one)
 *
 * SQL is written once with $1, $2 placeholders and syntax both engines share
 * (ON CONFLICT DO NOTHING, subqueries with aliases). Migrations only add, run
 * once each in order, and are recorded in schema_migrations.
 */
export const MIGRATIONS = [
  {
    id: 1,
    name: 'players, sessions, scores, events, awards',
    sql: dialect => {
      const id = dialect === 'pg' ? 'BIGSERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
      const big = dialect === 'pg' ? 'BIGINT' : 'INTEGER';
      const real = dialect === 'pg' ? 'DOUBLE PRECISION' : 'REAL';
      return `
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('guest', 'discord')),
        discord_id TEXT UNIQUE,
        display_name TEXT NOT NULL,
        avatar TEXT,
        language TEXT,
        generation_key TEXT,
        created_at ${big} NOT NULL,
        last_seen_at ${big} NOT NULL,
        visits INTEGER NOT NULL DEFAULT 1,
        merged_into TEXT REFERENCES players(id)
      );
      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(id),
        created_at ${big} NOT NULL,
        last_seen_at ${big} NOT NULL,
        expires_at ${big} NOT NULL
      );
      CREATE INDEX sessions_player ON sessions(player_id);
      CREATE TABLE game_events (
        id ${id},
        player_id TEXT NOT NULL REFERENCES players(id),
        game TEXT NOT NULL,
        event TEXT NOT NULL,
        mode TEXT,
        idem TEXT,
        created_at ${big} NOT NULL,
        UNIQUE (player_id, idem)
      );
      CREATE INDEX game_events_player_game ON game_events(player_id, game, event);
      CREATE INDEX game_events_board ON game_events(game, event);
      CREATE TABLE scores (
        id ${id},
        player_id TEXT NOT NULL REFERENCES players(id),
        game TEXT NOT NULL,
        metric TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT '',
        value ${real} NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        meta TEXT,
        idem TEXT,
        created_at ${big} NOT NULL,
        UNIQUE (player_id, idem)
      );
      CREATE INDEX scores_board ON scores(game, metric, mode, value);
      CREATE INDEX scores_player ON scores(player_id, game, metric, mode);
      CREATE TABLE awards (
        player_id TEXT NOT NULL REFERENCES players(id),
        role_key TEXT NOT NULL,
        source TEXT NOT NULL,
        awarded_at ${big} NOT NULL,
        PRIMARY KEY (player_id, role_key)
      );
      CREATE INDEX awards_role ON awards(role_key);
    `;
    },
  },
];

/** $1, $2 ... -> ?1, ?2 ... (SQLite's numbered parameters). */
const toSqlite = sql => sql.replace(/\$(\d+)/g, '?$1');

function sqliteAdapter(db) {
  const run = (sql, params = []) => {
    const stmt = db.prepare(toSqlite(sql));
    if (/^\s*(select|with)\b/i.test(sql) || /\breturning\b/i.test(sql)) {
      const rows = stmt.all(...params);
      return { rows, rowCount: rows.length };
    }
    const res = stmt.run(...params);
    return { rows: [], rowCount: Number(res.changes) };
  };
  const api = {
    dialect: 'sqlite',
    raw: db,
    async query(sql, params) {
      return run(sql, params);
    },
    async one(sql, params) {
      return run(sql, params).rows[0] ?? null;
    },
    async exec(sql) {
      db.exec(sql);
    },
    // BEGIN IMMEDIATE takes the write lock up front, so check-then-insert can't race.
    async tx(fn) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const out = await fn(api);
        db.exec('COMMIT');
        return out;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    async close() {
      db.close();
    },
  };
  return api;
}

function pgAdapter(pool) {
  const wrap = client => ({
    dialect: 'pg',
    async query(sql, params = []) {
      const res = await client.query(sql, params);
      return { rows: res.rows, rowCount: res.rowCount ?? 0 };
    },
    async one(sql, params = []) {
      return (await client.query(sql, params)).rows[0] ?? null;
    },
    async exec(sql) {
      await client.query(sql);
    },
  });
  return {
    ...wrap(pool),
    raw: pool,
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await fn(wrap(client));
        await client.query('COMMIT');
        return out;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

export async function openSqlite(file = ':memory:') {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const api = sqliteAdapter(db);
  await migrate(api);
  return api;
}

export async function openPostgres(url) {
  let pg;
  try {
    pg = (await import('pg')).default;
  } catch {
    throw new Error('DATABASE_URL is set but the "pg" package is not installed');
  }
  // COUNT(*) and BIGINT columns come back as strings by default; they are all well inside Number range here.
  pg.types.setTypeParser(20, v => Number(v));
  const ssl = /sslmode=require|railway\.app|rlwy\.net/.test(url) && !/sslmode=disable/.test(url) ? { rejectUnauthorized: false } : undefined;
  const pool = new pg.Pool({ connectionString: url, max: Number(process.env.PG_POOL_MAX) || 5, ssl });
  const api = pgAdapter(pool);
  await migrate(api);
  return api;
}

export async function migrate(db) {
  await db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at BIGINT NOT NULL)');
  const done = new Set((await db.query('SELECT id FROM schema_migrations')).rows.map(r => Number(r.id)));
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await db.tx(async t => {
      // Another instance may have run it between our read and this lock.
      if (await t.one('SELECT id FROM schema_migrations WHERE id = $1', [m.id])) return;
      await t.exec(m.sql(db.dialect));
      await t.query('INSERT INTO schema_migrations (id, name, applied_at) VALUES ($1, $2, $3)', [m.id, m.name, Date.now()]);
    });
  }
}

let shared = null;

/** The app's database, opened on first use. Postgres when DATABASE_URL is set, else SQLite in DATA_DIR. */
export function sharedDb() {
  if (!shared) {
    shared = (process.env.DATABASE_URL ? openPostgres(process.env.DATABASE_URL) : openSqlite(path.join(dataDir(), 'room.db'))).catch(err => {
      shared = null;
      throw err;
    });
  }
  return shared;
}
