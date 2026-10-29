import crypto from 'node:crypto';

/**
 * Who is playing. Everyone starts as a guest: the first time the room calls
 * POST /api/session it gets a random session token in an HttpOnly cookie.
 * Only a SHA-256 of the token is stored, so a copy of the database can't be
 * used to sign in as anyone. Signing in with Discord (next PR) upgrades the
 * same player, so guest history carries over without duplicates.
 */
export const SESSION_COOKIE = 'bgr_sid';
const SESSION_DAYS = 180;
const NEW_VISIT_AFTER_MS = 30 * 60_000;

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function readCookie(req, name) {
  const header = String(req.headers.cookie ?? '');
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

export function sessionCookie(token, { secure, maxAgeDays = SESSION_DAYS } = {}) {
  const parts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeDays * 86400}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie({ secure } = {}) {
  return sessionCookie('', { secure, maxAgeDays: 0 });
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;
}

export function publicPlayer(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    displayName: row.display_name,
    avatar: row.avatar ?? null,
    language: row.language ?? null,
    generation: row.generation_key ?? null,
    firstSeen: Number(row.created_at),
    lastSeen: Number(row.last_seen_at),
    visits: Number(row.visits),
  };
}

/** The live player for this request's cookie, following a guest that was merged into an account. */
export async function getPlayer(db, id) {
  return db.one('SELECT * FROM players WHERE id = $1', [id]);
}

export async function playerFromRequest(db, req, now = Date.now()) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token || token.length < 20 || token.length > 100) return null;
  const session = await db.one('SELECT * FROM sessions WHERE token_hash = $1', [hashToken(token)]);
  if (!session || Number(session.expires_at) < now) return null;
  let player = await getPlayer(db, session.player_id);
  for (let hops = 0; player?.merged_into && hops < 4; hops += 1) player = await getPlayer(db, player.merged_into);
  if (!player) return null;
  await touch(db, session, player, now);
  return { player, tokenHash: session.token_hash };
}

async function touch(db, session, player, now) {
  // Writes at most once a minute per session, so a busy tab isn't a stream of writes.
  if (now - Number(session.last_seen_at) < 60_000) return;
  const newVisit = now - Number(player.last_seen_at) > NEW_VISIT_AFTER_MS;
  await db.query('UPDATE sessions SET last_seen_at = $1, expires_at = $2 WHERE token_hash = $3', [now, now + SESSION_DAYS * 86400_000, session.token_hash]);
  await db.query('UPDATE players SET last_seen_at = $1, visits = visits + $2 WHERE id = $3', [now, newVisit ? 1 : 0, player.id]);
  player.last_seen_at = now;
  if (newVisit) player.visits += 1;
}

/** A new session for an existing player (used after Discord sign-in). Returns the raw token for the cookie. */
export async function createSession(db, playerId, now = Date.now()) {
  const token = crypto.randomBytes(32).toString('base64url');
  await db.query('INSERT INTO sessions (token_hash, player_id, created_at, last_seen_at, expires_at) VALUES ($1, $2, $3, $4, $5)', [
    hashToken(token),
    playerId,
    now,
    now,
    now + SESSION_DAYS * 86400_000,
  ]);
  return token;
}

export async function createGuest(db, now = Date.now()) {
  const id = newId('p');
  const name = `Guest ${id.slice(-4).toUpperCase()}`;
  const token = await db.tx(async t => {
    await t.query('INSERT INTO players (id, kind, display_name, created_at, last_seen_at) VALUES ($1, $2, $3, $4, $5)', [id, 'guest', name, now, now]);
    return createSession(t, id, now);
  });
  return { token, player: await getPlayer(db, id) };
}

const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

export async function setLanguage(db, playerId, language) {
  if (language !== null && !LANGUAGE.test(String(language))) throw Object.assign(new Error('bad language'), { status: 400 });
  await db.query('UPDATE players SET language = $1 WHERE id = $2', [language, playerId]);
}
