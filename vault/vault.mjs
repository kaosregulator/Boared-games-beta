#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { closeDb, db, sidecarRow, upsertEpisode } from './db.mjs';
import {
  INCOMING_DIR, VAULT_DIR, episodeLabel, vaultRel, episodesOf, fileUrls, hasCommand, hashFile, here, humanBytes, humanTime,
  itemMetadata, parseArgs, readSidecars, run, seasonFilter, showConfig, showDir,
} from './lib.mjs';

/**
 * The vault's command line.
 *
 *   node vault/vault.mjs list              every season, both copies, sizes and time estimates
 *   node vault/vault.mjs all               download and shrink every episode (resumes where it stopped)
 *   node vault/vault.mjs fetch | shrink    the two halves of `all`, separately
 *   node vault/vault.mjs serve             the player and the TV's feed, on http://localhost:8088
 *   node vault/vault.mjs verify            re-hash every file, repair from parity data if one rotted
 *   node vault/vault.mjs reindex           rebuild the Postgres catalog from the files on disk
 *   node vault/vault.mjs lineup            regenerate the game's 24/7 channel list
 *
 * Common flags: --show arthur  --season 1,3-5  --source mkv|mp4  --crf 46  --preset 8
 * --height 480  --audio-kbps 32  --parity  --drop-source  --ahead 2
 */

const args = parseArgs(process.argv.slice(2));
const command = args._[0] ?? 'help';
const cfg = showConfig(args.show ?? 'arthur');

const settings = {
  source: args.source === 'mp4' ? 'mp4' : 'mkv',
  crf: Number(args.crf ?? 46),
  preset: Number(args.preset ?? 8),
  height: Number(args.height ?? 480),
  audioKbps: Number(args.audioKbps ?? 32),
  parity: Boolean(args.parity),
  dropSource: Boolean(args.dropSource),
  ahead: Math.max(1, Number(args.ahead ?? 2)),
};

const sourceOf = ep => (settings.source === 'mp4' ? ep.mp4 ?? ep.mkv : ep.mkv ?? ep.mp4);
const incomingPath = (ep, file) => path.join(INCOMING_DIR, cfg.name, `${ep.key}${path.extname(file.name)}`);
const sidecarPath = ep => path.join(showDir(cfg.name), `${ep.key}.json`);
const isReady = ep => {
  try {
    const s = JSON.parse(fs.readFileSync(sidecarPath(ep), 'utf8'));
    return fs.existsSync(path.join(VAULT_DIR, s.file.replace(/\\/g, '/')));
  } catch {
    return false;
  }
};

async function episodes() {
  const meta = await itemMetadata(cfg.item, { refresh: Boolean(args.refresh) });
  const keep = seasonFilter(args.season);
  const only = args.only ? new Set(String(args.only).toLowerCase().split(',')) : null;
  return { meta, eps: episodesOf(meta).filter(ep => keep(ep) && (!only || only.has(ep.key))) };
}

// ── list ──────────────────────────────────────────────────────────────────────

async function list() {
  const { eps } = await episodes();
  const seasons = new Map();
  for (const ep of eps) {
    const s = seasons.get(ep.season) ?? { files: 0, mkv: 0, mp4: 0, seconds: 0, ready: 0 };
    s.files += 1;
    s.mkv += Number(ep.mkv?.size ?? 0);
    s.mp4 += Number(ep.mp4?.size ?? 0);
    s.seconds += Number(ep.mkv?.length ?? ep.mp4?.length ?? 0);
    if (isReady(ep)) s.ready += 1;
    seasons.set(ep.season, s);
  }
  const total = { files: 0, mkv: 0, mp4: 0, seconds: 0, ready: 0 };
  console.log(`${cfg.show} · archive.org/details/${cfg.item}\n`);
  console.log('season    files  original .mkv  archive .mp4   runtime   in vault');
  for (const [season, s] of seasons) {
    for (const k of Object.keys(total)) total[k] += s[k];
    const name = season === 0 ? 'Specials' : `Season ${season}`;
    console.log(`${name.padEnd(10)}${String(s.files).padStart(5)}  ${humanBytes(s.mkv).padStart(13)}  ${humanBytes(s.mp4).padStart(12)}  ${humanTime(s.seconds).padStart(8)}  ${String(s.ready).padStart(5)}/${s.files}`);
  }
  console.log(`${'Total'.padEnd(10)}${String(total.files).padStart(5)}  ${humanBytes(total.mkv).padStart(13)}  ${humanBytes(total.mp4).padStart(12)}  ${humanTime(total.seconds).padStart(8)}  ${String(total.ready).padStart(5)}/${total.files}`);

  // Rates measured on the item (direct storage-node links) and on a 4-core machine.
  const mbps = Number(args.speed ?? 10); // MB/s of download
  const realtime = Number(args.encodeSpeed ?? 3.4); // seconds of video encoded per second, SVT-AV1 preset 8 at 480p
  const finalKbps = 260; // measured average for crf 46 + Opus 32k
  const src = settings.source === 'mp4' ? total.mp4 : total.mkv;
  console.log(`\nDownload ${humanBytes(src)} of .${settings.source} at ${mbps} MB/s: ~${humanTime(src / 1e6 / mbps)}`);
  console.log(`Shrink ${humanTime(total.seconds)} of video at ${realtime}x realtime: ~${humanTime(total.seconds / realtime)} (runs alongside the download)`);
  console.log(`Vault size at crf ${settings.crf}: ~${humanBytes((total.seconds * finalKbps * 1000) / 8)}`);
}

// ── fetch ─────────────────────────────────────────────────────────────────────

async function fetchEpisode(meta, ep, n, of) {
  const file = sourceOf(ep);
  if (!file) throw new Error(`${ep.key}: no file on archive.org`);
  const dest = incomingPath(ep, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const size = Number(file.size);
  if (fs.existsSync(dest) && fs.statSync(dest).size === size) return { dest, file };

  const part = `${dest}.part`;
  console.log(`[${n}/${of}] ${ep.key} downloading ${humanBytes(size)} · ${ep.title}`);
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    for (const url of fileUrls(meta, file.name)) {
      try {
        // -C - resumes a half-finished .part after a dropped connection or a restart
        await run('curl', ['-fL', '--retry', '5', '--retry-delay', '3', '-C', '-', '-sS', '-o', part, url]);
        if (fs.statSync(part).size !== size) throw new Error('size mismatch');
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        // a .part that already has the whole file makes curl refuse to resume: start over on a mismatch
        if (fs.existsSync(part) && fs.statSync(part).size >= size) fs.rmSync(part);
      }
    }
    if (!lastErr) break;
  }
  if (lastErr) throw new Error(`${ep.key}: download failed (${lastErr.message})`);
  if (file.md5) {
    const md5 = await hashFile(part, 'md5');
    if (md5 !== file.md5) {
      fs.rmSync(part);
      throw new Error(`${ep.key}: checksum mismatch, deleted the bad copy`);
    }
  }
  fs.renameSync(part, dest);
  await upsertEpisode({ show: cfg.name, key: ep.key, season: ep.season, ep_from: ep.from, ep_to: ep.to, title: ep.title, label: episodeLabel(cfg.show, ep), source_name: file.name, source_bytes: size, source_md5: file.md5, status: 'fetched' });
  return { dest, file };
}

async function fetchAll() {
  const { meta, eps } = await episodes();
  const todo = eps.filter(ep => !isReady(ep));
  let failed = 0;
  for (let i = 0; i < todo.length; i += 1) {
    try {
      await fetchEpisode(meta, todo[i], i + 1, todo.length);
    } catch (err) {
      failed += 1;
      console.error(err.message);
    }
  }
  await saveExtras(meta);
  console.log(failed ? `${failed} downloads failed; run again to retry them.` : 'All downloads done.');
  if (failed) process.exitCode = 1;
}

/** The item's own catalog, torrent and artwork, kept beside the episodes. */
async function saveExtras(meta) {
  const dir = path.join(VAULT_DIR, 'items', cfg.item);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of meta.files) {
    if (!/(\.torrent|_files\.xml|_meta\.xml|^logo\.png|^clearlogo\.png|^characterart\.png)$/.test(f.name)) continue;
    const dest = path.join(dir, f.name);
    if (fs.existsSync(dest)) continue;
    try {
      await run('curl', ['-fsSL', '--retry', '3', '-o', dest, fileUrls(meta, f.name)[0]], { quiet: true });
    } catch {
      // nice to have, never worth failing a run over
    }
  }
}

// ── shrink ────────────────────────────────────────────────────────────────────

let encoderCache = null;
async function encoder() {
  if (encoderCache) return encoderCache;
  const list = await run('ffmpeg', ['-hide_banner', '-encoders'], { quiet: true });
  if (/libsvtav1/.test(list)) encoderCache = 'libsvtav1';
  else if (/libaom-av1/.test(list)) encoderCache = 'libaom-av1';
  else throw new Error('This ffmpeg has no AV1 encoder. Install a build with SVT-AV1 (ffmpeg 6+ from your package manager has it).');
  if (!/libopus/.test(list)) throw new Error('This ffmpeg has no Opus encoder (libopus).');
  return encoderCache;
}

function videoArgs(enc) {
  if (enc === 'libsvtav1') {
    return ['-c:v', 'libsvtav1', '-preset', String(settings.preset), '-crf', String(settings.crf), '-g', '240', '-svtav1-params', 'tune=0'];
  }
  return ['-c:v', 'libaom-av1', '-cpu-used', '6', '-row-mt', '1', '-crf', String(settings.crf), '-b:v', '0', '-g', '240'];
}

async function shrinkEpisode(ep, src, file, n, of) {
  const enc = await encoder();
  const dir = showDir(cfg.name);
  fs.mkdirSync(dir, { recursive: true });
  const probe = JSON.parse(await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', src], { quiet: true }));
  const seconds = Number(probe.format?.duration ?? file.length ?? 0);
  const subs = probe.streams.find(s => s.codec_type === 'subtitle' && ['subrip', 'ass', 'ssa', 'mov_text', 'webvtt'].includes(s.codec_name));
  const hasAudio = probe.streams.some(s => s.codec_type === 'audio');
  const label = episodeLabel(cfg.show, ep);

  const out = path.join(dir, `${ep.key}.webm`);
  const tmp = path.join(dir, `${ep.key}.part.webm`);
  console.log(`[${n}/${of}] ${ep.key} shrinking ${humanTime(seconds)} · ${ep.title}`);
  const started = Date.now();
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-stats', '-y', '-i', src,
    '-map', '0:v:0', ...(hasAudio ? ['-map', '0:a:0'] : []),
    // HD seasons come down to 480p like the rest; SD stays as it is
    '-vf', `scale=-2:'min(${settings.height},ih)':flags=lanczos`,
    '-pix_fmt', 'yuv420p10le', ...videoArgs(enc),
    ...(hasAudio ? ['-c:a', 'libopus', '-b:a', `${settings.audioKbps}k`, '-ac', '2'] : []),
    '-map_metadata', '-1', '-map_chapters', '-1', '-metadata', `title=${label}`,
    '-f', 'webm', tmp,
  ]);
  fs.renameSync(tmp, out);

  let subtitles = null;
  if (subs) {
    const vtt = path.join(dir, `${ep.key}.vtt`);
    try {
      await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-map', `0:${subs.index}`, '-f', 'webvtt', vtt], { quiet: true });
      subtitles = vaultRel(vtt);
    } catch {
      // some subtitle tracks are images or empty; the episode is fine without
    }
  }

  let thumb = null;
  try {
    const jpg = path.join(dir, `${ep.key}.jpg`);
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(Math.round(seconds * 0.3)), '-i', src, '-frames:v', '1', '-vf', 'scale=320:-2', '-q:v', '5', jpg], { quiet: true });
    thumb = vaultRel(jpg);
  } catch {
    // thumbnails are only for the player's list
  }

  let parity = null;
  if (settings.parity && (await hasCommand('par2'))) {
    // ~5% repair data: a few rotten sectors on an old drive can be rebuilt instead of lost
    await run('par2', ['create', '-q', '-q', '-r5', '-n1', `${out}.par2`, out], { quiet: true });
    parity = vaultRel(`${out}.par2`);
  }

  const outProbe = JSON.parse(await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', out], { quiet: true }));
  const v = outProbe.streams.find(s => s.codec_type === 'video');
  const sidecar = {
    show: cfg.name,
    key: ep.key,
    season: ep.season,
    from: ep.from,
    to: ep.to,
    title: ep.title,
    label,
    seconds: Number(outProbe.format.duration ?? seconds),
    file: vaultRel(out),
    bytes: fs.statSync(out).size,
    sha256: await hashFile(out),
    video: 'av1',
    audio: hasAudio ? 'opus' : null,
    width: v?.width ?? null,
    height: v?.height ?? null,
    subtitles,
    thumb,
    parity,
    source: { item: cfg.item, name: file.name, bytes: Number(file.size), md5: file.md5 ?? null },
    settings: { encoder: enc, crf: settings.crf, preset: settings.preset, height: settings.height, audioKbps: settings.audioKbps },
    made: new Date().toISOString(),
  };
  fs.writeFileSync(sidecarPath(ep), JSON.stringify(sidecar, null, 2));
  await upsertEpisode(sidecarRow(sidecar));
  if (settings.dropSource) fs.rmSync(src);
  const took = (Date.now() - started) / 1000;
  console.log(`[${n}/${of}] ${ep.key} done: ${humanBytes(Number(file.size))} -> ${humanBytes(sidecar.bytes)} in ${humanTime(took)} (${(seconds / took).toFixed(1)}x realtime)`);
  return sidecar;
}

async function shrinkAll() {
  const { eps } = await episodes();
  const todo = eps.filter(ep => !isReady(ep));
  let done = 0;
  let failed = 0;
  for (let i = 0; i < todo.length; i += 1) {
    const ep = todo[i];
    const file = sourceOf(ep);
    const src = file && incomingPath(ep, file);
    if (!src || !fs.existsSync(src)) continue;
    try {
      await shrinkEpisode(ep, src, file, i + 1, todo.length);
      done += 1;
    } catch (err) {
      failed += 1;
      console.error(`${ep.key}: ${err.message}`);
      await upsertEpisode({ show: cfg.name, key: ep.key, season: ep.season, ep_from: ep.from, ep_to: ep.to, title: ep.title, status: 'failed', error: err.message });
    }
  }
  console.log(`Shrunk ${done} episodes.${failed ? ` ${failed} failed.` : ''}`);
  if (failed) process.exitCode = 1;
}

/**
 * Download and shrink at once: the downloader runs up to --ahead episodes in
 * front of the encoder, so the network and the CPU are both busy and the
 * incoming folder never holds more than a few big originals.
 */
async function all() {
  const { meta, eps } = await episodes();
  await encoder();
  if (settings.parity && !(await hasCommand('par2'))) console.warn('--parity needs par2 (par2cmdline) installed; skipping repair data.');
  const todo = eps.filter(ep => !isReady(ep));
  console.log(`${todo.length} of ${eps.length} episodes to go. Vault: ${VAULT_DIR}`);
  const shrunk = todo.map(() => {
    let resolve;
    const p = new Promise(r => (resolve = r));
    return { p, resolve };
  });
  const fetched = [];
  let chain = Promise.resolve();
  todo.forEach((ep, i) => {
    chain = chain
      .then(() => (i >= settings.ahead ? shrunk[i - settings.ahead].p : null))
      .then(() => fetchEpisode(meta, ep, i + 1, todo.length))
      .catch(err => {
        console.error(err.message);
        return null;
      });
    fetched[i] = chain;
  });
  let failed = 0;
  for (let i = 0; i < todo.length; i += 1) {
    const got = await fetched[i];
    if (got) {
      try {
        await shrinkEpisode(todo[i], got.dest, got.file, i + 1, todo.length);
      } catch (err) {
        failed += 1;
        console.error(`${todo[i].key}: ${err.message}`);
      }
    } else failed += 1;
    shrunk[i].resolve();
  }
  await saveExtras(meta);
  const ready = readSidecars(cfg.name);
  const bytes = ready.reduce((a, s) => a + s.bytes, 0);
  console.log(`\nVault holds ${ready.length} episodes in ${humanBytes(bytes)}.${failed ? ` ${failed} failed; run again to retry them.` : ''}`);
  if (failed) process.exitCode = 1;
}

// ── verify / reindex ──────────────────────────────────────────────────────────

async function verify() {
  const items = readSidecars(cfg.name);
  const parTool = await hasCommand('par2');
  let bad = 0;
  for (const s of items) {
    const file = path.join(VAULT_DIR, s.file);
    const ok = fs.existsSync(file) && (await hashFile(file)) === s.sha256;
    if (ok) {
      await upsertEpisode({ ...sidecarRow(s), verified_at: new Date() });
      continue;
    }
    if (s.parity && parTool && fs.existsSync(path.join(VAULT_DIR, s.parity))) {
      try {
        await run('par2', ['repair', '-q', path.join(VAULT_DIR, s.parity)], { quiet: true });
        if ((await hashFile(file)) === s.sha256) {
          console.log(`${s.key}: damaged, repaired from parity data`);
          continue;
        }
      } catch {
        // fall through to the report
      }
    }
    bad += 1;
    console.error(`${s.key}: ${fs.existsSync(file) ? 'checksum mismatch' : 'missing'} (${s.file}); delete its .json and run \`all\` to fetch it again`);
  }
  console.log(`${items.length - bad} of ${items.length} episodes check out.`);
  if (bad) process.exitCode = 1;
}

async function reindex() {
  if (!(await db())) throw new Error('Set DATABASE_URL to a reachable Postgres to reindex.');
  const items = readSidecars(cfg.name);
  for (const s of items) await upsertEpisode(sidecarRow(s));
  console.log(`Catalog rebuilt: ${items.length} episodes.`);
}

// ── lineup ────────────────────────────────────────────────────────────────────

/** Writes src/tv/lineups/<show>.ts: every episode in air order, streaming archive.org's .mp4 until the vault has it. */
async function lineup() {
  const { eps } = await episodes();
  const rows = eps.filter(ep => ep.mp4).map(ep => {
    const seconds = Math.round(Number(ep.mp4.length ?? ep.mkv?.length ?? 0));
    return `    { file: ${JSON.stringify(ep.mp4.name)}, vault: '${ep.key}', seconds: ${seconds}, title: ${JSON.stringify(episodeLabel(cfg.show, ep))} },`;
  });
  const out = path.resolve(args.out ?? path.join(here, '..', 'src', 'tv', 'lineups', `${cfg.name}.ts`));
  const constName = cfg.name.toUpperCase();
  fs.writeFileSync(
    out,
    `import type { ArchiveBlock } from './archiveBlocks';

/**
 * ${cfg.show}, every season in air order with the specials last, around the clock.
 * Each part plays from the home vault (vault/, "vault" key) when it's running and
 * has the episode, else streams archive.org's own .mp4 copy.
 * Generated by \`node vault/vault.mjs lineup\` from
 * https://archive.org/details/${cfg.item}
 */
export const ${constName}: ArchiveBlock = {
  id: '${cfg.item}',
  vaultShow: '${cfg.name}',
  parts: [
${rows.join('\n')}
  ],
};
`,
  );
  console.log(`Wrote ${rows.length} episodes to ${path.relative(process.cwd(), out)}`);
}

// ── main ──────────────────────────────────────────────────────────────────────

const commands = {
  list,
  fetch: fetchAll,
  shrink: shrinkAll,
  all,
  verify,
  reindex,
  lineup,
  serve: async () => {
    await import('./serve.mjs');
    return 'keep-alive';
  },
};

const fn = commands[command];
if (!fn) {
  const usage = fs.readFileSync(new URL(import.meta.url), 'utf8').match(/\/\*\*\n \* The vault's command line\.([\s\S]*?)\*\//)[1];
  console.log(`The vault's command line.${usage.replace(/^ \* ?/gm, '')}`);
} else {
  fn()
    .then(result => {
      if (result !== 'keep-alive') return closeDb();
    })
    .catch(async err => {
      console.error(err.message);
      process.exitCode = 1;
      await closeDb();
    });
}
