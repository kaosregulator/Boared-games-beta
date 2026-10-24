import type { ArchiveFile } from './archive';

/**
 * The home vault (vault/ in this repo): your own copies of a show, shrunk to
 * AV1 + Opus and served from your computer or a box on your network. A block
 * with a `vaultShow` plays from it when it's running and has the episode, and
 * falls back to archive.org otherwise, so the channel works either way.
 *
 * Where it lives: localStorage "vault-url", else VITE_VAULT_URL at build time,
 * else http://localhost:8088.
 */

interface VaultEpisode {
  key: string;
  seconds: number;
  url: string | null;
  title: string;
}

const DEFAULT_URL = 'http://localhost:8088';

export function vaultBase(): string {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem('vault-url');
  } catch {
    // storage blocked: use the default
  }
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_VAULT_URL;
  return (saved || env || DEFAULT_URL).replace(/\/+$/, '');
}

/** AV1 in WebM: every current Chrome, Edge and Firefox; Safari only on hardware that decodes it. */
function canPlayAv1() {
  if (typeof document === 'undefined') return false;
  const v = document.createElement('video');
  return v.canPlayType('video/webm; codecs="av01.0.04M.10, opus"') !== '';
}

const feeds = new Map<string, { at: number; job: Promise<Map<string, VaultEpisode> | null> }>();
/** A missing vault is asked again after this long, so starting it mid-session is noticed. */
const RETRY_MS = 60_000;

function feed(show: string): Promise<Map<string, VaultEpisode> | null> {
  const hit = feeds.get(show);
  if (hit && Date.now() - hit.at < RETRY_MS) return hit.job;
  const base = vaultBase();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  const job = (canPlayAv1() ? fetch(`${base}/vault/channels/${encodeURIComponent(show)}`, { signal: ctrl.signal }) : Promise.reject(new Error('no AV1')))
    .then(res => (res.ok ? res.json() : null))
    .then((data: { episodes?: VaultEpisode[] } | null) => {
      if (!data?.episodes) return null;
      return new Map(data.episodes.filter(e => e.url).map(e => [e.key, { ...e, url: `${base}${e.url}` }]));
    })
    .catch(() => null)
    .finally(() => clearTimeout(timer));
  feeds.set(show, { at: Date.now(), job });
  return job;
}

/** The vault's copy of one episode, or null when the vault is off or doesn't have it yet. */
export function resolveVault(show: string, key: string): Promise<ArchiveFile | null> {
  return feed(show).then(episodes => {
    const ep = episodes?.get(key);
    return ep?.url ? { url: ep.url, length: ep.seconds, name: `${show}/${key}.webm` } : null;
  });
}
