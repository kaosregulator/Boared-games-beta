import fs from 'fs';
import path from 'path';
import { here } from './lib.mjs';

/**
 * The Postgres catalog. Postgres holds what each episode is, where its file
 * sits, its checksum and when it was last checked; the video itself stays a
 * plain file on disk. If DATABASE_URL isn't set (or the database is down),
 * everything still works from the sidecar .json files, and `vault reindex`
 * rebuilds the tables from them.
 */

let pool = null;
let tried = false;

export async function db() {
  if (tried) return pool;
  tried = true;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const { default: pg } = await import('pg');
    const candidate = new pg.Pool({ connectionString: url, max: 4 });
    await candidate.query(fs.readFileSync(path.join(here, 'schema.sql'), 'utf8'));
    pool = candidate;
  } catch (err) {
    console.warn(`Postgres not reachable (${err.message}); using the sidecar files only.`);
    pool = null;
  }
  return pool;
}

export async function closeDb() {
  if (pool) await pool.end();
  pool = null;
  tried = false;
}

const COLUMNS = [
  'show', 'key', 'season', 'ep_from', 'ep_to', 'title', 'label', 'seconds',
  'source_name', 'source_bytes', 'source_md5',
  'file', 'bytes', 'sha256', 'video', 'audio', 'width', 'height', 'subtitles', 'thumb', 'parity',
  'status', 'error', 'verified_at',
];

/** Insert or update one episode row; fields left out keep their stored values. */
export async function upsertEpisode(row) {
  const pg = await db();
  if (!pg) return;
  const cols = COLUMNS.filter(c => row[c] !== undefined);
  const vals = cols.map(c => row[c]);
  const sets = cols.filter(c => c !== 'show' && c !== 'key').map(c => `${c} = excluded.${c}`);
  await pg.query(
    `insert into episode (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})
     on conflict (show, key) do update set ${[...sets, 'updated_at = now()'].join(', ')}`,
    vals,
  );
}

export async function episodesFromDb(show) {
  const pg = await db();
  if (!pg) return null;
  const { rows } = await pg.query(
    `select * from episode where show = $1 and status = 'ready'
     order by case when season = 0 then 1000 else season end, ep_from`,
    [show],
  );
  return rows;
}

/** A sidecar (what shrink writes beside each file) as a table row. */
export function sidecarRow(s) {
  return {
    show: s.show,
    key: s.key,
    season: s.season,
    ep_from: s.from,
    ep_to: s.to,
    title: s.title,
    label: s.label,
    seconds: s.seconds,
    source_name: s.source?.name,
    source_bytes: s.source?.bytes,
    source_md5: s.source?.md5,
    file: s.file,
    bytes: s.bytes,
    sha256: s.sha256,
    video: s.video,
    audio: s.audio,
    width: s.width,
    height: s.height,
    subtitles: s.subtitles ?? null,
    thumb: s.thumb ?? null,
    parity: s.parity ?? null,
    status: 'ready',
    error: null,
  };
}
