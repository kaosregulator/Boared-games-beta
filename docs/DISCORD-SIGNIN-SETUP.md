# Discord sign-in: setup

Guests can play everything without signing in. Signing in with Discord keeps a player's scores and roles on any device and sends their roles to the Nostalgia Game Room server.

## 1. Discord developer portal

Open your bot's application, then **OAuth2**:

- Copy the **Client ID** and **Client Secret**.
- Under **Redirects**, add `https://<your-railway-domain>/api/auth/discord/callback`.

Only the `identify` scope is used. Server membership is checked with the bot, so players are never asked for their server list.

## 2. Railway variables

| Variable | Value |
| --- | --- |
| `DISCORD_CLIENT_ID` | from step 1 |
| `DISCORD_CLIENT_SECRET` | from step 1 (server only, never sent to the browser) |
| `PUBLIC_URL` | `https://<your-railway-domain>` (or set `DISCORD_REDIRECT_URI` to the full callback URL) |
| `DISCORD_BOT_TOKEN` | already set |
| `DISCORD_GUILD_ID` | optional, defaults to `1562976671622103161` |
| `ADMIN_DISCORD_IDS` | your Discord user id (comma-separated for more), for `/api/admin/rewards` |
| `EARLY_MEMBER_CAP` | optional, defaults to 50 |

`DATABASE_URL` (your Railway Postgres) is picked up automatically.

## 3. Bot role position

The bot can only hand out roles below its own. In Server Settings → Roles, keep the bot's role **above** all the reward roles.

## How it behaves

- **Sign-in upgrades the guest player in place.** If that Discord account already has a player (another device), the guest's scores and roles merge into it without duplicates.
- **Roles reach Discord through a queue.** Earned roles, the picked generation and the early-member reward are queued and sent by the bot every 30 s. A failure is retried with backoff (1, 2, 4 … 120 min) and shown on the profile. After 8 tries it's marked failed. An admin can requeue those with `POST /api/admin/sync/retry`.
- **Players not in the server keep their roles in the room.** Discord gets them once they join.
- **The early-member reward needs a verified member.** It's handed out with a single conditional update, so it can't go past the cap.
- **Signing out** ends that browser's session; a fresh guest session starts.
