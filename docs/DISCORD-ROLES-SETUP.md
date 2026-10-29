# Discord roles: setup and sync

The catalogue of every role is `src/rewards/catalog.json` (readable version: `docs/ROLES.md`).
`scripts/discord-roles.mjs` creates those roles in the server with the room's bot, or reuses ones that already exist.

## One-time setup

1. **Bot token.** Add `DISCORD_BOT_TOKEN` to the Railway service variables (Bot → Reset Token in the Discord developer portal). It never goes in the code or the browser.
2. **Role position.** In Discord: Server Settings → Roles, drag the bot's role (`Claudeg`) **above** Member and Verified (just under Moderator). Discord only lets a bot hand out roles below its own highest role, and new roles are created at the bottom.
3. **Storage.** Attach a Railway volume and set `DATA_DIR` to its mount path. The role id mapping (`discord-roles.json`) and, later, player records live there. Without a volume they are wiped on each deploy.

## Running it

From your machine with the Railway CLI (`railway run` passes the service's variables without printing them):

```
railway run npm run discord:roles -- status     # bot, guild, Manage Roles, hierarchy
railway run npm run discord:roles -- plan       # list what would be created / reused (changes nothing)
railway run npm run discord:roles -- apply      # create and reuse for real
railway run npm run discord:roles -- delete --keys game.chess.win,gen.beta
```

Or with the token in a local `.env` (git-ignored): `npm run discord:roles -- plan`.

## Rules the sync follows

- **No duplicates.** An existing role with the same name (ignoring emoji, case and spacing) is reused. For example, the existing `🧪 Game Tester` becomes the catalogue's Game Tester role.
- **Reused roles keep their look.** Hand-made roles keep their own name and colour. Only roles the script created are renamed or recoloured to follow the catalogue.
- **Delete is narrow.** It only removes roles the script created. Reused hand-made roles are refused.
- **Cosmetic only.** Earned roles get permissions `0`, are not hoisted and are not mentionable.
- **Retries are built in.** Rate limits wait out Discord's `retry_after`, and 5xx errors retry with backoff. Permission errors are reported, not retried.

## Chat levels (Tatsu)

Tatsu owns chat XP. After `apply` creates the chat-level roles, set them as level rewards in the Tatsu dashboard (Rewards → Level roles) at the levels in `docs/ROLES.md`. Confirm the levels against your current Tatsu setup first.
