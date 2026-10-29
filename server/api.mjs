import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { sharedDb } from './db.mjs';
import { indexBoards, leaderboard, personalBest, recordEvent, recordScore, validateEvent, validateScore } from './leaderboard.mjs';
import { clearSessionCookie, createGuest, createSession, getPlayer, playerFromRequest, publicPlayer, sessionCookie, setLanguage } from './players.mjs';
import { checkState, clearOAuthCookie, exchangeCode, linkDiscord, oauthConfig, SignInError, startSignIn } from './auth/discord.mjs';
import { createDiscordRest } from './discord/rest.mjs';
import { createMembers } from './discord/members.mjs';
import { evaluateAwards } from './rewards/engine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const loadJson = rel => JSON.parse(fs.readFileSync(path.join(here, '..', rel), 'utf8'));

/**
 * The room's player API, mounted at /api:
 *
 *   POST  /api/session            start (or resume) a guest session
 *   GET   /api/me                 profile, earned roles, personal bests
 *   PATCH /api/me                 { language }
 *   POST  /api/play/event         { game, event, mode?, idem? }
 *   POST  /api/scores             { game, metric, value, mode?, idem, meta? }
 *   GET   /api/leaderboards       which games and metrics have boards
 *   GET   /api/leaderboard        ?game&metric&mode&limit&offset
 *
 * A player only ever reads or writes their own records: the player comes from
 * the session cookie, never from the request body.
 */
export function createRoomApi({
  db = null,
  catalog = loadJson('src/rewards/catalog.json'),
  boards = loadJson('src/rewards/leaderboards.json'),
  onAwards = null,
  env = process.env,
  rest = env.DISCORD_BOT_TOKEN ? createDiscordRest({ token: env.DISCORD_BOT_TOKEN }) : null,
  fetchImpl = globalThis.fetch,
  worker = true,
} = {}) {
  const router = express.Router();
  const games = indexBoards(boards);
  const getDb = () => (db ? Promise.resolve(db) : sharedDb());
  /** Express 4 doesn't catch rejected promises; this hands them to the error handler. */
  const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const cache = new Map();
  const CACHE_MS = 10_000;
  const guildId = env.DISCORD_GUILD_ID || '1562976671622103161';
  const members = createMembers({ db: getDb, rest, guildId, catalog });
  const admins = new Set(String(env.ADMIN_DISCORD_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean));
  if (worker && rest) {
    // Sends queued roles to Discord. Failures stay in the queue with backoff.
    setInterval(() => members.processQueue().catch(() => {}), 30_000).unref();
  }

  // Per-player allowance on writes, on top of the per-address limit in server.mjs.
  const writes = new Map();
  setInterval(() => writes.clear(), 60_000).unref();
  function allow(playerId, perMinute) {
    const n = (writes.get(playerId) ?? 0) + 1;
    writes.set(playerId, n);
    return n <= perMinute;
  }

  function secure(req) {
    return req.secure || process.env.NODE_ENV === 'production';
  }

  async function current(req) {
    return playerFromRequest(await getDb(), req);
  }

  async function requirePlayer(req, res) {
    const who = await current(req);
    if (!who) {
      res.status(401).json({ error: 'No session. POST /api/session first.' });
      return null;
    }
    return who.player;
  }

  async function bests(d, playerId) {
    return (
      await d.query(`SELECT game, metric, mode, MAX(value) AS hi, MIN(value) AS lo FROM scores WHERE player_id = $1 GROUP BY game, metric, mode`, [playerId])
    ).rows.map(r => {
        const m = games.get(r.game)?.metricMap.get(r.metric);
      return { game: r.game, metric: r.metric, mode: r.mode, value: Number(m?.better === 'lower' ? r.lo : r.hi) };
    });
  }

  async function profile(player) {
    const d = await getDb();
    const awards = (await d.query('SELECT role_key, awarded_at, source FROM awards WHERE player_id = $1 ORDER BY awarded_at', [player.id])).rows.map(r => ({
      key: r.role_key,
      awardedAt: Number(r.awarded_at),
      source: r.source,
    }));
    const launches = Number((await d.one("SELECT COUNT(*) AS n FROM game_events WHERE player_id = $1 AND event = 'launch'", [player.id])).n);
    const wins = Number((await d.one("SELECT COUNT(*) AS n FROM game_events WHERE player_id = $1 AND event = 'won'", [player.id])).n);
    return { player: publicPlayer(player), awards, bests: await bests(d, player.id), stats: { launches, wins } };
  }

  async function afterResult(player, game) {
    for (const key of cache.keys()) if (key.startsWith(`${game}|`)) cache.delete(key);
    const fresh = await evaluateAwards(await getDb(), player.id, catalog);
    if (fresh.length && player.kind === 'discord') for (const key of fresh) await members.queue(player.id, key, 'add');
    if (fresh.length && onAwards) onAwards(player, fresh);
    return fresh;
  }

  router.post('/session', h(async (req, res) => {
    const who = await current(req);
    if (who) return res.json(await profile(who.player));
    const { token, player } = await createGuest(await getDb());
    res.setHeader('Set-Cookie', sessionCookie(token, { secure: secure(req) }));
    res.status(201).json(await profile(player));
  }));

  router.get('/me', h(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const who = await current(req);
    res.json(who ? await profile(who.player) : { player: null });
  }));

  router.patch('/me', h(async (req, res) => {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const d = await getDb();
    if ('language' in (req.body ?? {})) await setLanguage(d, player.id, req.body.language);
    res.json(await profile(await getPlayer(d, player.id)));
  }));

  router.post('/session/end', h(async (req, res) => {
    const who = await current(req);
    if (who) await (await getDb()).query('DELETE FROM sessions WHERE token_hash = $1', [who.tokenHash]);
    res.setHeader('Set-Cookie', clearSessionCookie({ secure: secure(req) }));
    res.json({ ok: true });
  }));

  // --- Sign in with Discord -------------------------------------------------

  router.get('/auth/status', (_req, res) => {
    res.json({ discord: oauthConfig(env).ready });
  });

  router.get('/auth/discord', (req, res) => {
    const config = oauthConfig(env);
    if (!config.ready) return res.redirect(302, '/?signin=unavailable');
    const { url, cookie } = startSignIn(config, req.query.returnTo, { secure: secure(req) });
    res.setHeader('Set-Cookie', cookie);
    res.redirect(302, url);
  });

  router.get('/auth/discord/callback', h(async (req, res) => {
    const sec = secure(req);
    const back = (returnTo, result) => {
      res.setHeader('Set-Cookie', clearOAuthCookie({ secure: sec }));
      const sep = returnTo.includes('?') ? '&' : '?';
      res.redirect(302, `${returnTo}${sep}signin=${result}`);
    };
    const state = checkState(req);
    if (!state) return back('/', 'expired');
    if (req.query.error) return back(state.returnTo, 'cancelled');
    const config = oauthConfig(env);
    if (!config.ready || !req.query.code) return back(state.returnTo, 'unavailable');
    let user;
    try {
      user = await exchangeCode(config, String(req.query.code), fetchImpl);
    } catch (err) {
      return back(state.returnTo, err instanceof SignInError ? err.code : 'failed');
    }
    const d = await getDb();
    const who = await current(req);
    const playerId = await linkDiscord(d, { guestId: who?.player.id ?? null, user });
    if (who) await d.query('DELETE FROM sessions WHERE token_hash = $1', [who.tokenHash]);
    const token = await createSession(d, playerId);
    res.setHeader('Set-Cookie', [clearOAuthCookie({ secure: sec }), sessionCookie(token, { secure: sec })]);
    // Roles earned as a guest go to Discord now; early member if eligible.
    await members.queueAll(playerId);
    const m = await members.membership(user.id);
    if (m.status === 'member') await members.claimEarly(playerId);
    const sep = state.returnTo.includes('?') ? '&' : '?';
    res.redirect(302, `${state.returnTo}${sep}signin=ok`);
  }));

  /** The signed-in player's Discord standing, checked by the bot on the server. */
  router.get('/me/discord', h(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const player = await requirePlayer(req, res);
    if (!player) return;
    if (!player.discord_id) return res.json({ linked: false, membership: null, signInAvailable: oauthConfig(env).ready });
    const m = await members.membership(player.discord_id);
    if (m.status === 'member') await members.claimEarly(player.id);
    const d = await getDb();
    const sync = (await d.query('SELECT role_key, action, status, last_error FROM role_sync WHERE player_id = $1', [player.id])).rows.map(r => ({
      key: r.role_key,
      action: r.action,
      status: r.status,
      error: r.last_error ?? null,
    }));
    res.json({ linked: true, membership: m.status, guildId, sync });
  }));

  router.put('/me/generation', h(async (req, res) => {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const key = req.body?.key ?? null;
    await members.setGeneration(player.id, key === null ? null : String(key));
    res.json(await profile(await getPlayer(await getDb(), player.id)));
  }));

  // --- Admin (Discord ids in ADMIN_DISCORD_IDS) -------------------------------

  async function requireAdmin(req, res) {
    const player = await requirePlayer(req, res);
    if (!player) return null;
    if (!player.discord_id || !admins.has(player.discord_id)) {
      res.status(403).json({ error: 'Admins only' });
      return null;
    }
    return player;
  }

  router.get('/admin/rewards', h(async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const d = await getDb();
    const awards = (await d.query('SELECT role_key, COUNT(*) AS n FROM awards GROUP BY role_key ORDER BY role_key')).rows.map(r => ({ key: r.role_key, count: Number(r.n) }));
    const failed = (
      await d.query(
        `SELECT q.role_key, q.action, q.attempts, q.last_error, p.display_name FROM role_sync q JOIN players p ON p.id = q.player_id
         WHERE q.status = 'failed' ORDER BY q.updated_at DESC LIMIT 100`,
      )
    ).rows.map(r => ({ key: r.role_key, action: r.action, attempts: Number(r.attempts), error: r.last_error, player: r.display_name }));
    const pending = Number((await d.one("SELECT COUNT(*) AS n FROM role_sync WHERE status = 'pending'")).n);
    res.json({ earlyMember: await members.earlyStatus(), awards, pending, failed });
  }));

  router.post('/admin/sync/retry', h(async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const d = await getDb();
    const r = await d.query("UPDATE role_sync SET status = 'pending', attempts = 0, next_at = $1 WHERE status = 'failed'", [Date.now()]);
    res.json({ requeued: r.rowCount });
  }));

  router.post('/play/event', h(async (req, res) => {
    const player = await requirePlayer(req, res);
    if (!player) return;
    if (!allow(player.id, 60)) return res.status(429).json({ error: 'Slow down' });
    const e = validateEvent(games, req.body);
    const stored = await recordEvent(await getDb(), player.id, e);
    const awarded = stored ? await afterResult(player, e.game) : [];
    res.json({ stored, awarded });
  }));

  router.post('/scores', h(async (req, res) => {
    const player = await requirePlayer(req, res);
    if (!player) return;
    if (!allow(player.id, 30)) return res.status(429).json({ error: 'Slow down' });
    const s = validateScore(games, req.body);
    const d = await getDb();
    const stored = await recordScore(d, player.id, s);
    const metric = games.get(s.game).metricMap.get(s.metric);
    const best = await personalBest(d, player.id, s.game, s.metric, s.mode, metric.better);
    const awarded = stored ? await afterResult(player, s.game) : [];
    res.json({ stored, personalBest: best === null ? null : Number(best), isBest: Number(best) === s.value, awarded });
  }));

  router.get('/leaderboards', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      games: boards.games
        .filter(g => g.metrics.length)
        .map(g => ({ id: g.id, label: g.label, modes: g.modes ?? [], metrics: g.metrics.map(m => ({ id: m.id, label: m.label, better: m.better, unit: m.unit ?? null })) })),
    });
  });

  router.get('/leaderboard', h(async (req, res) => {
    const who = await current(req);
    const d = await getDb();
    const q = { game: String(req.query.game ?? ''), metric: String(req.query.metric ?? ''), mode: String(req.query.mode ?? ''), limit: req.query.limit, offset: req.query.offset };
    const key = `${q.game}|${q.metric}|${q.mode}|${q.limit}|${q.offset}`;
    let board = cache.get(key);
    if (!board || Date.now() - board.at > CACHE_MS) {
      board = { at: Date.now(), data: await leaderboard(d, games, q) };
      cache.set(key, board);
      if (cache.size > 500) cache.delete(cache.keys().next().value);
    }
    // The shared part is cached; "you" is worked out per request.
    const me = who?.player.id ?? null;
    const data = { ...board.data, rows: board.data.rows.map(({ pid, ...r }) => ({ ...r, you: pid === me })), you: null };
    if (me) data.you = (await leaderboard(d, games, { ...q, limit: 1, offset: 0, playerId: me })).you;
    res.setHeader('Cache-Control', 'no-store');
    res.json(data);
  }));

  // Bad input is the caller's fault: a 400 with the reason, never a stack trace.
  router.use((err, _req, res, next) => {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  });

  return router;
}
