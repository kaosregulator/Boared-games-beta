import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Shared pieces of the vault: where things live on disk, how an archive.org
 * file name becomes an episode, the catalog (Postgres when it's there, the
 * sidecar .json files beside each episode when it isn't), and small helpers.
 */

export const here = path.dirname(fileURLToPath(import.meta.url));

/** Everything the vault keeps sits under one folder, so a whole drive can be copied or unplugged. */
export const VAULT_DIR = path.resolve(process.env.VAULT_DIR ?? path.join(here, 'data'));
export const MEDIA_DIR = path.join(VAULT_DIR, 'media');
export const INCOMING_DIR = path.join(VAULT_DIR, 'incoming');
export const ITEMS_DIR = path.join(VAULT_DIR, 'items');

/** The shows the vault knows how to collect. One archive.org item each. */
export const SHOWS = {
  arthur: {
    show: 'Arthur',
    item: 'arthur-1996-complete_202203',
  },
};

export function showConfig(name = 'arthur') {
  const cfg = SHOWS[name];
  if (!cfg) throw new Error(`Unknown show "${name}". Known: ${Object.keys(SHOWS).join(', ')}`);
  return { name, ...cfg };
}

const QUALITY = /\s+(SDTV|HDTV-\d+p|WEBDL-\d+p|WEBRip-\d+p|Bluray-\d+p)$/i;

/**
 * "Season 1/Arthur - S01E01-E02 - Arthur's Eyes + Francine's Bad Hair Day SDTV.mkv"
 * becomes key "s01e01-e02", season 1, episodes 1 to 2, and the two story titles.
 * Specials are season 0. Returns null for anything that isn't an episode.
 */
export function parseEpisode(name) {
  const base = path.posix.basename(name).replace(/\.[^.]+$/, '');
  const m = base.match(/S(\d{2})E(\d{2})(?:-?[Ee](\d{2}))?/);
  if (!m) return null;
  const season = Number(m[1]);
  let from = Number(m[2]);
  const to = m[3] ? Number(m[3]) : from;
  // One file holds two stories; a wider span is a typo in the name ("S11E01-E12" is E11-E12).
  if (to - from > 3) from = to - 1;
  const pad = n => String(n).padStart(2, '0');
  const key = `s${pad(season)}e${pad(from)}${to !== from ? `-e${pad(to)}` : ''}`;
  let title = base.slice(base.indexOf(m[0]) + m[0].length).replace(/^\s*-\s*/, '').replace(QUALITY, '').replace(/,$/, '').trim();
  if (!title) title = season === 0 ? `Special ${from}` : from === to ? `Episode ${from}` : `Episodes ${from}–${to}`;
  const quality = (base.match(QUALITY)?.[1] ?? '').toUpperCase();
  return { key, season, from, to, title, quality };
}

/** "Arthur · S01E01-E02 · Arthur's Eyes + Francine's Bad Hair Day" */
export function episodeLabel(show, ep) {
  const code = ep.season === 0 ? 'Special' : `S${String(ep.season).padStart(2, '0')}E${String(ep.from).padStart(2, '0')}${ep.to !== ep.from ? `-E${String(ep.to).padStart(2, '0')}` : ''}`;
  return `${show} · ${code} · ${ep.title}`;
}

/** Broadcast order: seasons 1 onward, specials last. */
export function airOrder(a, b) {
  const sa = a.season === 0 ? 1000 : a.season;
  const sb = b.season === 0 ? 1000 : b.season;
  return sa - sb || a.from - b.from;
}

/** The item's file list, fetched once and kept in the vault so it survives the item going away. */
export async function itemMetadata(item, { refresh = false } = {}) {
  const saved = path.join(ITEMS_DIR, `${item}.json`);
  if (!refresh && fs.existsSync(saved)) return JSON.parse(fs.readFileSync(saved, 'utf8'));
  fs.mkdirSync(ITEMS_DIR, { recursive: true });
  const text = await curlText(`https://archive.org/metadata/${encodeURIComponent(item)}`);
  const meta = JSON.parse(text);
  if (!meta.files) throw new Error(`archive.org has no files for ${item}`);
  fs.writeFileSync(saved, JSON.stringify(meta));
  return meta;
}

/**
 * One row per episode: the original .mkv (the best copy, with subtitles) and
 * archive.org's own .mp4 re-encode (smaller, plays in any browser).
 */
export function episodesOf(meta) {
  const byKey = new Map();
  for (const f of meta.files) {
    if (!/\.(mkv|mp4)$/i.test(f.name) || !/^(Season \d+|Specials)\//.test(f.name)) continue;
    const ep = parseEpisode(f.name);
    if (!ep) continue;
    const row = byKey.get(ep.key) ?? { ...ep, mkv: null, mp4: null };
    // the .mkv names carry the titles; the .mp4 shares the .mkv's name
    if (/\.mkv$/i.test(f.name)) Object.assign(row, ep, { mkv: f });
    else row.mp4 = f;
    byKey.set(ep.key, row);
  }
  return [...byKey.values()].sort(airOrder);
}

/** Direct links on the item's own storage server skip archive.org's redirect to a cache node. */
export function fileUrls(meta, name) {
  const rel = name.split('/').map(encodeURIComponent).join('/');
  const urls = [];
  for (const server of meta.workable_servers ?? [meta.server].filter(Boolean)) {
    urls.push(`https://${server}${meta.dir}/${rel}`);
  }
  urls.push(`https://archive.org/download/${encodeURIComponent(meta.metadata.identifier)}/${rel}`);
  return urls;
}

export function run(cmd, args, { quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', quiet ? 'pipe' : 'inherit'] });
    let out = '';
    let err = '';
    child.stdout.on('data', d => (out += d));
    child.stderr?.on('data', d => (err += d));
    child.on('error', reject);
    child.on('close', code => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}${err ? `: ${err.trim().slice(-400)}` : ''}`))));
  });
}

export const curlText = url => run('curl', ['-fsSL', '--retry', '4', '--retry-delay', '2', url], { quiet: true });

export function hashFile(file, algo = 'sha256') {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash(algo);
    fs.createReadStream(file)
      .on('data', d => h.update(d))
      .on('error', reject)
      .on('end', () => resolve(h.digest('hex')));
  });
}

export async function hasCommand(cmd) {
  try {
    await run(cmd, ['--version'], { quiet: true });
    return true;
  } catch {
    try {
      await run(cmd, ['-version'], { quiet: true });
      return true;
    } catch {
      return false;
    }
  }
}

/** A path inside the vault, stored with forward slashes so a drive made on Windows serves from Linux and back. */
export function vaultRel(file) {
  return path.relative(VAULT_DIR, file).split(path.sep).join('/');
}

const FILE_FIELDS = ['file', 'subtitles', 'thumb', 'parity'];

export function showDir(show) {
  return path.join(MEDIA_DIR, show);
}

/** Every finished episode's sidecar: the catalog that lives with the files themselves. */
export function readSidecars(show) {
  const dir = showDir(show);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        // sidecars written before paths were normalized may carry Windows separators
        for (const k of FILE_FIELDS) if (typeof s[k] === 'string') s[k] = s[k].replace(/\\/g, '/');
        return s;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort(airOrder);
}

export function humanBytes(n) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i += 1;
  }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}

export function humanTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** --season 3, --crf 46, --drop-source … into { season: '3', crf: '46', dropSource: true }. */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const name = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[name] = true;
    else {
      out[name] = next;
      i += 1;
    }
  }
  return out;
}

/** "--season 1,3-5" keeps those seasons; "0" is the specials. */
export function seasonFilter(spec) {
  if (spec === undefined || spec === true) return () => true;
  const keep = new Set();
  for (const part of String(spec).split(',')) {
    const [a, b] = part.split('-').map(Number);
    for (let s = a; s <= (b ?? a); s += 1) keep.add(s);
  }
  return ep => keep.has(ep.season);
}
