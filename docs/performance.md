# Performance notes

Handoff notes for the smoothness pass (October 2026, after PR #53). What was slow, why, what changed, how it was measured, and what is left.

## What was causing the stutter

| Symptom | Cause |
| --- | --- |
| Choppy start, hitches when turning to look at something new | three compiles a shader and uploads textures the first time a material is drawn, and it holds that frame until done. The room has about 40 shader programs and 90 textures. Behind the title reel the room drew "on demand" whenever a model arrived, so each of those draws compiled on the spot (over 6 s of blocking compile in the test browser). |
| Freeze landing in the army men world, sometimes never fully loading | The town brought 4 point lights. The light count is part of every lit shader, so all of the room's lit materials were rebuilt at once. The duck range then read back a canvas (`getImageData`), which waits for everything the GPU has queued: a 16 s stall in the test browser. |
| Town didn't rise out of the rug in play | Only the title reel (`film`) animated the town's scale. In play it was simply there, and the shrink glide was 1.6 s. |
| Furby shows before its box | The box and the Furby were in separate `Suspense` boundaries. The Furby model was already cached (the bed Furby uses it), the box was only fetched once the Furby table's code loaded, so the Furby appeared first. |
| PC slow to load and laggy | The PC page loaded and ran all of three.js and react-three (React's runtime had landed in the r3f chunk). The room kept drawing 60 frames a second behind Windows on the same thread. The glass rewrote its CSS transform every frame. The boot ran about 12 s before the login box. |

## What changed

- **Warm-up** (`src/engine/warmup.ts`, `src/engine/SceneWarmup.tsx`). `warmObject()` compiles materials with `KHR_parallel_shader_compile` where the browser has it (Chrome, Edge, Safari on real GPUs), otherwise one shader per task, and uploads textures three per task. `SceneWarmup` runs it on any material it has not seen, every 0.7 s. Behind the title reel the canvas no longer draws at all (`frameloop="never"`); the warm-up readies the room instead.
- **`useWarmReveal(ref, armed)`** keeps a newly mounted group hidden until it is warmed (5 s cap, so nothing waits forever). Used by the army town and the Furby box.
- **Light budget** (`LightBudget`, `balanceLights`). The point-light count is held at 21 (`ROOM_LIGHT_BUDGET` in `WalkRoom.tsx`). Lights with `userData.expendable` (the shelf bulbs = 1, lava lamp glows = 2; lower steps out first) leave layer 0 while a game's lamps are in; dark spare lights fill the count when the room has fewer (lights out). Walking costs the GPU the same 21 lights as before. **If you add a point light to the room, raise the budget by one**; a game's own lamps need nothing.
- The two ceiling lights were one light's worth apart, so they are one light now (`CeilingDome` mixes the colours).
- **Army men**: the town rises out of the rug in play too (pop-up curve, 2.6 s, starting 0.35 s into a 3.2 s shrink glide). Nothing in the town moves while it is warming (`army.landing === 'wait'`, HUD shows "Shrinking you down…"). If the soldier model never arrives it lands anyway after 8 s. The duck canvases use `willReadFrequently`.
- **Furby**: box and Furby share one `Suspense` and one reveal. `FurbyTable` and `PoochiTable` are first in the background table warm-up, which fetches the box and the Boom early.
- **PC**: `manualChunks` now names React by path, so `pc.html` loads only `react`, `log` and `pc` (about 415 KB of JS instead of about 1.7 MB). Sat at the PC the room draws on demand at 8 fps (`DemandTicker`, shared with the Game Boy seat). `GlassScreen` only writes a style when it changes. The boot runs at 2x (`BOOT_SPEED` in `src/pc/os/Boot.tsx`), and any key or click still skips.
- Footsteps reuse two noise buffers instead of making one per step.

## How it was measured

Production build (`npx vite build`, `node server.mjs`), headless Chromium on SwiftShader (software GL, no parallel shader compile), 480×270, `?diag=1` for the hooks. The old build is main at `1467d79` with only the same test hooks added. Software GL exaggerates GPU time, so compare old against new, not against a real machine. Walking fps is GPU-bound in software and is not comparable here.

Test hooks with `?diag=1` on a build: `window.__cardAction('army' | 'pc' | 'furby' …)`, `window.__three` (`{ gl, scene }`).

| Moment | Old build | New build |
| --- | --- | --- |
| Title screen, first 15 s: worst stall | 1.8 s | 0.4 s |
| Title screen: frames drawn (the reel) | 17 fps | 37 fps |
| Pressing play: worst frame | 2.5 s | 0.12 s |
| Walking after settling, frames in 8 s (GPU-bound in software) | 8 | 12 |
| Sending in the army men: worst stall | 15.6 s | 2.5 s, while "Shrinking you down…" holds, before the glide |
| Sending in the army men: total main-thread stalls | 29.9 s | 15.8 s |
| Sitting at the PC: JS the PC page loads | about 1.7 MB | about 415 KB |
| Sitting at the PC: room frames drawn per 6 s on a real GPU | about 360 | about 48 |
| Sitting at the PC: until the desktop shows | 32.5 s | 24.1 s (software; boot animation now 2x) |

Scripts are in the session's scratchpad (`perf.cjs`, `pc.cjs`, `walk.cjs`), not in the repo; they are short Playwright scripts that use the hooks above.

## Left to do / ideas

- On a GPU without `KHR_parallel_shader_compile` (rare on desktop, more common on old Android) the first compile still blocks; it now happens behind the title or before the army town shows, rather than mid-animation.
- Reloading mid-session skips the title reel, so there is no warm-up window; the first seconds compile as before.
- The room is about 580k triangles and 157 draw calls. Merging static props would be the next big GPU win.
- Hot Wheels adds a spot light (a different count from point lights), so starting a race still rebuilds the lit shaders once.

# Loading and caching pass (October 30 2026)

Handoff notes for the loading pass that came after the hologram PRs (#68–#71). Before this pass, the title song never seemed to start, a cleared cache dropped you into a half-built room, and so did a refresh. The family computer hologram also stopped halfway up the desk.

## What was wrong

| Symptom | Cause |
| --- | --- |
| Title song never starts | The room asks for all ~40 models (~112 MB) the moment the page loads. The 5 MB song and the title poster waited behind them: the song played 18–20 s in at 50 Mbps, after most of the room had arrived. On a cleared cache and a slower link, that was after you had pressed Play. Browsers also hold sound until the first click, and if that click was Play, the song started and faded out 0.65 s later. |
| Cleared cache: an unloaded room | Play went straight into the room whatever had arrived. Nothing showed progress. |
| Refresh didn't help | A reload within 45 minutes skips the title (`room-session-v1` in sessionStorage) and puts you back in the room, still loading, still uncovered. Every partly downloaded file started over. |
| Cache trouble after deploys | Models were cached for a day, plus a week of stale-while-revalidate, under the same name. A model rebuilt in place (the detail restore) could show the old copy. |
| Desk hologram only half there | `pcdesk.glb` is 268k triangles in one mesh since its detail was restored. The capsule only clones models under 160k, so it fell back to cutting the box out of the scan, and that cut stops at 120k triangles in file order: the bottom-left half. |

## What changed

- **Download line** (`src/engine/netQueue.ts`, imported first in `main.tsx`). It wraps `fetch` for same-origin `.glb/.gltf/.bin/.ktx2`. Everything else goes straight through.
  - Models wait until the title song has a head start (`headStart()` from `MenuReel`: its first 1.5 MB, or 6 s at most). A reload or deep link with no title opens the line at once.
  - Six download at a time, room furniture (`/models/`) first, so files finish whole and in order.
  - A network error or a 502/503/504 is retried 3 times (1 s, 2 s, 4 s).
  - Each model is asked for as `?v=<content hash>`. A file already in the browser cache under that hash skips the line (`cache: 'only-if-cached'`).
  - Progress (bytes and files) is exposed through `netProgress()` / `onNetProgress()`.
- **Asset manifest**: `scripts/precompress.mjs` writes `dist/asset-manifest.json` (sha256 prefix + size per model file). `server.mjs` `cacheFor(rel, v)` gives a matching hash `max-age=1 year, immutable`. A wrong (old) hash gets `no-cache`, so an old page after a deploy never pins today's file under yesterday's name. Unversioned requests keep the old rules.
- **Loading UI** (`src/room/RoomLoading.tsx`):
  - The Play button shows "Loading the room · N%", then "Room ready".
  - Pressing Play before the room is in holds the black with a progress bar (MB of MB), and the title song keeps playing. You go in when everything is loaded.
  - A reload or deep link covers the room with the same bar (`RoomLoadingCover`).
  - If nothing arrives for 20 s, a "Go in anyway" button shows, so no one is ever stuck.
  - The title reel stops buffering once you press Play, so the room gets the whole connection.
- **Title song**: it is fetched whole into the browser cache first. The `<audio>` element uses `preload="none"` for the menu track and reads from the cache when it plays, so there is no second download. "♪ Tap for sound" shows while the browser is holding the sound.
- **Hologram**: `CLONE_MAX_TRIANGLES` and `MAX_TRIANGLES` are now 320k. The desk and toy shelf clone whole (shared geometry, no copy, no triangle walk), and a cut can no longer stop partway through a piece.

## How it was measured

Production build, `node server.mjs`, headless Chromium with a disk profile (`launchPersistentContext`, so the disk cache works as it does for a player). The link is throttled to 50 Mbps with 20 ms latency. A click on the title at about 3 s counts as the first gesture. "Old" is main at `96efe0c` with the same precompressed files. The HTTP/2 rows run through a local HTTP/2 front (like Railway's edge). Chrome won't disk-cache a self-signed origin, so repeat visits are measured over HTTP/1.1 only. Scripts (`load2.cjs`, `h2proxy.mjs`, `holo.cjs`, `shots.cjs`) are in the session scratchpad, not the repo.

| Moment (50 Mbps) | Old | New |
| --- | --- | --- |
| Title song actually playing (HTTP/1.1) | 18.3–18.6 s | 5.7–6.2 s |
| Title song actually playing (HTTP/2) | 5.8 s | 5.0–5.4 s |
| Title poster on screen (HTTP/1.1) | 8.8–18.0 s | 1.6–1.8 s |
| Title poster on screen (HTTP/2) | 5.0 s | 0.8–1.7 s |
| Every model in, cold (HTTP/2) | 22.3 s | 25.3 s, see below |
| Repeat visit: bytes downloaded | 0 MB | 0 MB |
| Repeat visit: every model in | 4.2 s | 4.4–5.0 s |
| Repeat visit: "Room ready" | n/a | 6.6 s |
| Refresh 12 s into a cold load: all models in after the refresh | 16.0 s | 16.2 s |
| Entering before the room is loaded | half-built room | bar, then a whole room |

The last model lands about 3 s later on a cold HTTP/2 load. With the models no longer hogging the link, the title reel buffers more (27 MB instead of 15 MB by then; the song's second download in the HTTP/2 run happens only on the self-signed test origin). That is bandwidth the reel uses while you watch it. Once you press Play the reel stops downloading.

## Left to do / ideas

- The 40 MB title reel (1080p, 4.4 Mbps, 74 s) is the biggest thing competing with the room on a first visit. A second, lighter encode for phones would help without touching the desktop one.
- Textures loaded through `ImageLoader` (posters) and the radio/TV media don't go through the line. They are small or streamed.
- `YahtzeeGame` is a 2.2 MB lazy chunk (something big is inlined); worth a look.
- If a model is added under a new extension, add it to `HEAVY` in `netQueue.ts` and `VERSIONED` in `precompress.mjs`.
