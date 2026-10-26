# Deploy logs and cache rules (Railway)

server.mjs prints one JSON line per event to stdout/stderr. Railway's Deploy Logs
parse these, so you can filter on any field, e.g. `@level:error`,
`@source:client`, `@fields.stale:true`, `@source:http @fields.status:404`.

## What gets logged
| Line | When | Useful fields |
|---|---|---|
| `listening` | startup | `build` (commit, branch, built time, deployment id), `node`, `dist` (file count and the bundle `index.html` / `pc.html` point at), `requestLog`, `gemini` |
| `GET /path 200` (source `http`) | pages, API calls, any 4xx/5xx, anything over 3 s | `status`, `ms`, `bytes`, `encoding`, `cache`, `ip`, `ua`, `referer` |
| `traffic` | every 5 minutes, if there was any | request count, MB sent, count per status class, top 404 paths |
| `client room: …` / `client pc: …` (source `client`) | browser errors (every `log.error`, uncaught errors, rejected promises) and one `page loaded` per page | `page`, `url`, `buildId`, `stale`, `stack`, `ua` |
| `unhandled …`, `uncaught exception`, `unhandled rejection` | server faults | `stack` |
| `shutting down` | Railway stops the container | `signal`, `uptimeSec` |

A `client … page loaded` line with `stale: true` means that browser is running
a different build than the server, i.e. an old cached page.

`/api/health` also returns the `build`, and every response carries an
`x-build-id` header, so DevTools > Network shows which deploy answered.

## Railway settings that help
- **Variables > `LOG_REQUESTS`**: `pages` (default), `all` (every file, noisy) or `off` (errors only).
- **Deploy Logs filter**: `@level:error` or `@level:warn` cuts to problems; `@source:client` shows only browsers.
- **Observability** (left sidebar): save a log filter there to keep it.
- Railway sets `RAILWAY_GIT_COMMIT_SHA`, `RAILWAY_GIT_BRANCH`, `RAILWAY_GIT_COMMIT_MESSAGE` and `RAILWAY_DEPLOYMENT_ID` itself; nothing to add. The Dockerfile declares the commit and branch as build args so `dist/build.json` is stamped too.

## Cache rules (server.mjs `cacheFor`)
- `/assets/*` (Vite's hashed bundles): a year, immutable.
- Every `.html`, `.json` and `.webmanifest`: `no-cache` (always rechecked).
- Everything else in `public/` (models, video, audio, cores): a day, then a week of stale-while-revalidate. **If you replace one of those files under the same name, give it a new name** or browsers keep the old one for up to a week.
- Missing files with an extension get a real 404, not the room page.
- The desk PC's iframe is `/pc.html?boot&v=<build id>`, a new URL each deploy.
