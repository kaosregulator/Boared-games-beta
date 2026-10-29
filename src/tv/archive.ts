/**
 * Internet Archive lookups. The metadata API is CORS-enabled, so the browser
 * asks it directly which file to stream; the media itself plays from
 * archive.org/download (display-only, so no CORS is needed for it).
 */

export interface ArchiveFile {
  url: string;
  /** Seconds, when archive.org reports it. */
  length: number | null;
  name: string;
}

interface MetaFile {
  name: string;
  format?: string;
  length?: string;
  source?: string;
}

const cache = new Map<string, Promise<ArchiveFile | null>>();

function seconds(raw?: string): number | null {
  if (!raw) return null;
  if (raw.includes(':')) {
    const parts = raw.split(':').map(Number);
    if (parts.some(n => !Number.isFinite(n))) return null;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pick(files: MetaFile[], kind: 'video' | 'audio', hint?: string): MetaFile | null {
  if (hint?.startsWith('~')) {
    // "~part of a name": the first playable file whose name contains it
    const part = hint.slice(1).toLowerCase();
    const playable = kind === 'audio' ? /\.(mp3|ogg|m4a|wav)$/i : /\.(mp4|ogv|webm)$/i;
    return files.find(f => playable.test(f.name) && f.name.toLowerCase().includes(part)) ?? null;
  }
  if (hint) return files.find(f => f.name === hint) ?? null;
  if (kind === 'audio') {
    return (
      files.find(f => /\.mp3$/i.test(f.name) && f.format === 'VBR MP3') ??
      files.find(f => /\.mp3$/i.test(f.name)) ??
      files.find(f => /\.(ogg|m4a)$/i.test(f.name)) ??
      null
    );
  }
  return (
    files.find(f => /\.mp4$/i.test(f.name) && f.format === 'h.264') ??
    files.find(f => /\.mp4$/i.test(f.name) && f.source === 'derivative') ??
    files.find(f => /\.mp4$/i.test(f.name)) ??
    files.find(f => /\.(ogv|webm)$/i.test(f.name)) ??
    null
  );
}

export function resolveArchive(id: string, kind: 'video' | 'audio', hint?: string): Promise<ArchiveFile | null> {
  const key = `${kind}:${id}:${hint ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  // archive.org's metadata API sometimes hangs; give up after 10 s so the set can retry.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  const job = fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`, { signal: ctrl.signal })
    .then(res => (res.ok ? res.json() : null))
    .then((meta: { files?: MetaFile[] } | null) => {
      const file = meta?.files ? pick(meta.files, kind, hint) : null;
      if (!file) return null;
      return {
        // files can sit in folders inside the item: keep the slashes
        url: `https://archive.org/download/${encodeURIComponent(id)}/${file.name.split('/').map(encodeURIComponent).join('/')}`,
        length: seconds(file.length),
        name: file.name,
      };
    })
    .catch(() => null)
    .finally(() => clearTimeout(timer));
  cache.set(key, job);
  // A failed lookup should be retried next time, not cached forever.
  job.then(result => {
    if (!result) cache.delete(key);
  });
  return job;
}
