import fs from 'node:fs';
import path from 'node:path';

/**
 * Where the server keeps state that must survive a restart (role mappings,
 * player records). On Railway, attach a volume and set DATA_DIR to its mount
 * path (RAILWAY_VOLUME_MOUNT_PATH is picked up automatically). Without a
 * volume, Railway's disk is wiped on every deploy.
 */
export function dataDir() {
  const dir = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.resolve('data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readJson(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir(), name), 'utf8'));
  } catch {
    return fallback;
  }
}

/** Write to a temp file and rename, so a crash mid-write never leaves half a file. */
export function writeJson(name, value) {
  const file = path.join(dataDir(), name);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, file);
}
