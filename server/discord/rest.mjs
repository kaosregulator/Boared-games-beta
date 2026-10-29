/**
 * Minimal Discord REST v10 client for the bot. No library: the room only
 * needs roles, members and OAuth, and fetch is built into Node.
 *
 * - Waits out 429s using Discord's retry_after, and retries 5xx with backoff.
 * - Errors carry Discord's status and JSON error code, never the token.
 * - Every write can carry an audit-log reason so staff can see why a role changed.
 */
export const DISCORD_API = 'https://discord.com/api/v10';

export class DiscordError extends Error {
  constructor(status, code, message, path) {
    super(`Discord ${status}${code ? ` (${code})` : ''} on ${path}: ${message}`);
    this.name = 'DiscordError';
    this.status = status;
    this.code = code;
    this.path = path;
  }
  /** Missing Permissions / Missing Access: retrying won't help. */
  get isPermission() {
    return this.status === 403 || this.code === 50013 || this.code === 50001;
  }
  get isRetryable() {
    return this.status === 429 || this.status >= 500;
  }
}

const defaultSleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function createDiscordRest({ token, fetchImpl = globalThis.fetch, sleep = defaultSleep, maxRetries = 4, base = DISCORD_API } = {}) {
  if (!token) throw new Error('DISCORD_BOT_TOKEN is not set');
  const auth = token.startsWith('Bot ') || token.startsWith('Bearer ') ? token : `Bot ${token}`;

  async function request(method, path, { body, reason, query } = {}) {
    const url = new URL(base + path);
    if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    const headers = { Authorization: auth, 'User-Agent': 'BoredGamesRoom (https://github.com/kaosregulator/boared-games-beta, 1)' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (reason) headers['X-Audit-Log-Reason'] = encodeURIComponent(reason).slice(0, 512);
    for (let attempt = 0; ; attempt += 1) {
      let res;
      try {
        res = await fetchImpl(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      } catch (err) {
        if (attempt >= maxRetries) throw new DiscordError(0, null, `network error: ${err.message}`, path);
        await sleep(500 * 2 ** attempt);
        continue;
      }
      if (res.status === 204) return null;
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      if (res.ok) return json;
      if (res.status === 429 && attempt < maxRetries) {
        const after = Number(json?.retry_after ?? res.headers.get?.('retry-after') ?? 1);
        await sleep(Math.ceil((Number.isFinite(after) ? after : 1) * 1000) + 50);
        continue;
      }
      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      throw new DiscordError(res.status, json?.code ?? null, json?.message ?? res.statusText ?? 'request failed', path);
    }
  }

  return {
    request,
    me: () => request('GET', '/users/@me'),
    guild: guildId => request('GET', `/guilds/${guildId}`),
    roles: guildId => request('GET', `/guilds/${guildId}/roles`),
    member: (guildId, userId) => request('GET', `/guilds/${guildId}/members/${userId}`),
    createRole: (guildId, payload, reason) => request('POST', `/guilds/${guildId}/roles`, { body: payload, reason }),
    updateRole: (guildId, roleId, payload, reason) => request('PATCH', `/guilds/${guildId}/roles/${roleId}`, { body: payload, reason }),
    deleteRole: (guildId, roleId, reason) => request('DELETE', `/guilds/${guildId}/roles/${roleId}`, { reason }),
    addMemberRole: (guildId, userId, roleId, reason) => request('PUT', `/guilds/${guildId}/members/${userId}/roles/${roleId}`, { reason }),
    removeMemberRole: (guildId, userId, roleId, reason) => request('DELETE', `/guilds/${guildId}/members/${userId}/roles/${roleId}`, { reason }),
  };
}
