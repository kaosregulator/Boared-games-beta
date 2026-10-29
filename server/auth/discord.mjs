import crypto from 'node:crypto';
import { readCookie } from '../players.mjs';

/**
 * Sign in with Discord (OAuth2 authorization code flow, done on the server).
 *
 * Only the `identify` scope is asked for: the player's id, name and avatar.
 * Guild membership is checked with the bot instead, so the player is never
 * asked for access to their server list. The access token is used once, to
 * read who signed in, and is never stored.
 *
 * Env: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and either
 * DISCORD_REDIRECT_URI or PUBLIC_URL (the redirect is PUBLIC_URL +
 * /api/auth/discord/callback). The redirect must also be added to the app's
 * OAuth2 redirects in the Discord developer portal.
 */
export const OAUTH_COOKIE = 'bgr_oauth';
const AUTHORIZE = 'https://discord.com/oauth2/authorize';
const TOKEN = 'https://discord.com/api/v10/oauth2/token';
const ME = 'https://discord.com/api/v10/users/@me';

export function oauthConfig(env = process.env) {
  const clientId = env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = env.DISCORD_CLIENT_SECRET?.trim();
  const base = env.PUBLIC_URL?.trim().replace(/\/+$/, '');
  const redirectUri = env.DISCORD_REDIRECT_URI?.trim() || (base ? `${base}/api/auth/discord/callback` : null);
  return { clientId, clientSecret, redirectUri, ready: Boolean(clientId && clientSecret && redirectUri) };
}

/** Only same-site paths, so the sign-in can't be used to bounce someone to another site. */
export function safeReturnTo(value) {
  const v = String(value ?? '/');
  return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') && v.length < 300 ? v : '/';
}

export function startSignIn(config, returnTo, { secure }) {
  const state = crypto.randomBytes(24).toString('base64url');
  const url = new URL(AUTHORIZE);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', 'identify');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'none');
  const payload = Buffer.from(JSON.stringify({ state, returnTo: safeReturnTo(returnTo) })).toString('base64url');
  const cookie = [`${OAUTH_COOKIE}=${payload}`, 'Path=/api/auth', 'HttpOnly', 'SameSite=Lax', 'Max-Age=600'];
  if (secure) cookie.push('Secure');
  return { url: url.toString(), cookie: cookie.join('; ') };
}

export function clearOAuthCookie({ secure }) {
  return [`${OAUTH_COOKIE}=`, 'Path=/api/auth', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0', ...(secure ? ['Secure'] : [])].join('; ');
}

/** The state Discord sent back must match the one this browser started with. */
export function checkState(req) {
  const raw = readCookie(req, OAUTH_COOKIE);
  const got = String(req.query?.state ?? '');
  if (!raw || !got) return null;
  let saved;
  try {
    saved = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const a = Buffer.from(String(saved.state ?? ''));
  const b = Buffer.from(got);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { returnTo: safeReturnTo(saved.returnTo) };
}

export class SignInError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Code -> the Discord user who signed in. */
export async function exchangeCode(config, code, fetchImpl = globalThis.fetch) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
  });
  let res;
  try {
    res = await fetchImpl(TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  } catch {
    throw new SignInError('discord-unreachable', 'Discord could not be reached');
  }
  if (!res.ok) throw new SignInError(res.status >= 500 ? 'discord-unreachable' : 'code-rejected', `token exchange ${res.status}`);
  const token = await res.json();
  if (!token?.access_token) throw new SignInError('code-rejected', 'no access token');
  let me;
  try {
    me = await fetchImpl(ME, { headers: { Authorization: `Bearer ${token.access_token}` } });
  } catch {
    throw new SignInError('discord-unreachable', 'Discord could not be reached');
  }
  if (!me.ok) throw new SignInError('discord-unreachable', `users/@me ${me.status}`);
  const user = await me.json();
  if (!/^\d{5,25}$/.test(String(user?.id ?? ''))) throw new SignInError('code-rejected', 'bad user');
  return {
    id: String(user.id),
    name: String(user.global_name || user.username || 'Player').slice(0, 64),
    avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : null,
  };
}

/**
 * Attach a Discord account to a player, in one transaction:
 *  - already linked to a player: that player, and the current guest's history
 *    moves into it (scores, events, awards; nothing duplicated);
 *  - otherwise the current guest is upgraded in place (same id, same history);
 *  - otherwise a new player.
 * Returns the player's id.
 */
export async function linkDiscord(db, { guestId, user, now = Date.now() }) {
  return db.tx(async t => {
    const existing = await t.one('SELECT id FROM players WHERE discord_id = $1', [user.id]);
    if (existing) {
      await t.query('UPDATE players SET display_name = $1, avatar = $2, last_seen_at = $3 WHERE id = $4', [user.name, user.avatar, now, existing.id]);
      if (guestId && guestId !== existing.id) {
        const guest = await t.one('SELECT kind FROM players WHERE id = $1', [guestId]);
        if (guest?.kind === 'guest') await mergeInto(t, guestId, existing.id);
      }
      return existing.id;
    }
    if (guestId) {
      const guest = await t.one('SELECT kind FROM players WHERE id = $1 AND merged_into IS NULL', [guestId]);
      if (guest?.kind === 'guest') {
        await t.query("UPDATE players SET kind = 'discord', discord_id = $1, display_name = $2, avatar = $3, last_seen_at = $4 WHERE id = $5", [
          user.id,
          user.name,
          user.avatar,
          now,
          guestId,
        ]);
        return guestId;
      }
    }
    const id = `p_${crypto.randomBytes(9).toString('base64url')}`;
    await t.query("INSERT INTO players (id, kind, discord_id, display_name, avatar, created_at, last_seen_at) VALUES ($1, 'discord', $2, $3, $4, $5, $5)", [
      id,
      user.id,
      user.name,
      user.avatar,
      now,
    ]);
    return id;
  });
}

async function mergeInto(t, fromId, toId) {
  await t.query('UPDATE scores SET player_id = $1 WHERE player_id = $2', [toId, fromId]);
  await t.query('UPDATE game_events SET player_id = $1 WHERE player_id = $2', [toId, fromId]);
  await t.query('INSERT INTO awards (player_id, role_key, source, awarded_at) SELECT $1, role_key, source, awarded_at FROM awards WHERE player_id = $2 ON CONFLICT DO NOTHING', [toId, fromId]);
  await t.query('DELETE FROM awards WHERE player_id = $1', [fromId]);
  await t.query("UPDATE players SET language = COALESCE((SELECT language FROM players WHERE id = $1), language) WHERE id = $2 AND language IS NULL", [fromId, toId]);
  await t.query('UPDATE players SET merged_into = $1 WHERE id = $2', [toId, fromId]);
}
