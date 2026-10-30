/**
 * Looks up the media behind the time capsule cards, for picking by hand:
 *
 *   - each Internet Archive video: the .mp4 file to play and how long it runs,
 *     so the card's screen can play it in a <video> and fold away when it ends;
 *   - Wikimedia Commons photos for each card's search words, with their
 *     licence and author, so every card has a few real 90s pictures.
 *
 *   node scripts/cards/resolve-media.mjs
 *
 * Reads scripts/cards/media-queries.json, writes scripts/cards/media-candidates.json.
 * Runs in the card-media workflow (the dev sandbox can't reach either site).
 */
import fs from 'node:fs';

const { videos, images } = JSON.parse(fs.readFileSync('scripts/cards/media-queries.json', 'utf8'));
const UA = 'BoaredGamesCardMedia/1.0 (https://github.com/kaosregulator/Boared-games-beta)';

async function getJson(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) return await res.json();
      if (res.status < 500 && res.status !== 429) return null;
    } catch {
      /* retry */
    }
    await new Promise(r => setTimeout(r, 1500 * (i + 1)));
  }
  return null;
}

const strip = html => String(html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const seconds = len => {
  if (len == null) return null;
  const s = String(len);
  if (s.includes(':')) return s.split(':').reduce((t, n) => t * 60 + Number(n), 0);
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
};

async function video(entry) {
  const [id, ...rest] = entry.split('/');
  const wanted = rest.join('/') || null;
  const meta = await getJson(`https://archive.org/metadata/${encodeURIComponent(id)}`);
  if (!meta?.files) return { id, wanted, error: 'no metadata' };
  const files = meta.files;
  const mp4s = files.filter(f => /\.mp4$/i.test(f.name));
  let pick = null;
  if (wanted) {
    const base = wanted.replace(/\.[^.]+$/, '');
    pick = mp4s.find(f => f.name === wanted) ?? mp4s.find(f => f.name.startsWith(base)) ?? null;
  }
  if (!pick) {
    // The original upload if it's an mp4, else the h.264 derivative, else any mp4.
    pick = mp4s.find(f => f.source === 'original') ?? mp4s.find(f => /h\.264/i.test(f.format ?? '')) ?? mp4s[0] ?? null;
  }
  const lengthOf = f => seconds(f?.length) ?? seconds(files.find(o => o.name === f?.original)?.length);
  return {
    id,
    wanted,
    title: strip(meta.metadata?.title),
    file: pick?.name ?? null,
    length: lengthOf(pick),
    size: pick ? Number(pick.size) : null,
    mp4s: mp4s.map(f => ({ name: f.name, length: seconds(f.length), size: Number(f.size), format: f.format })).slice(0, 8),
  };
}

async function photos(query) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8' +
    `&gsrsearch=${encodeURIComponent(query)}&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=640`;
  const data = await getJson(url);
  const pages = Object.values(data?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages
    .map(p => {
      const info = p.imageinfo?.[0];
      if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime)) return null;
      const m = info.extmetadata ?? {};
      return {
        file: p.title.replace(/^File:/, ''),
        thumb: info.thumburl,
        w: info.width,
        h: info.height,
        license: strip(m.LicenseShortName?.value),
        artist: strip(m.Artist?.value).slice(0, 80),
        desc: strip(m.ImageDescription?.value).slice(0, 160),
      };
    })
    .filter(Boolean);
}

const out = { videos: [], images: {} };
for (const v of videos) {
  out.videos.push(await video(v));
  console.log('video', v);
}
for (const [card, queries] of Object.entries(images)) {
  out.images[card] = {};
  for (const q of queries) {
    out.images[card][q] = await photos(q);
    await new Promise(r => setTimeout(r, 150));
  }
  console.log('images', card);
}
fs.writeFileSync('scripts/cards/media-candidates.json', JSON.stringify(out, null, 1) + '\n');
