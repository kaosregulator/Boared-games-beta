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

# Launch pass (October 31 2026)

Handoff notes for the pass before the public Discord launch. The goal was smoother walking, turning, TV + mini game and shrunk-down play, the Game Boy and NES, and a server ready for a rush of visitors, **with the same picture and features on phone, laptop and PC**. No texture, model, light, pixel-ratio or feature was cut.

## What was wrong

| Symptom | Cause |
| --- | --- |
| Freeze when the TV turns on, a race starts, a game opens | `SceneWarmup` only looks for new materials every 0.7 s. Anything that mounts and draws in the same frame (the TV picture, the Hot Wheels track, the board game lamp) had its shaders built inside that frame. Starting Hot Wheels built 16 in one frame. |
| Starting a race rebuilt the room | The Hot Wheels headlight is a spot light. The spot count is part of every lit shader, and `LightBudget` only held point lights steady, so the whole room's lit shaders were rebuilt. |
| Extra GPU work while walking | The bed Furby (130k triangles) was never frustum culled, so it was drawn in every frame, even with the bed behind you. |
| Turning judders on touch and trackpads | Each touch / trackpad event turned the camera straight away. Those events arrive at the device's own rate, out of step with the screen, so some frames turned twice as far as the next. Arrow keys started and stopped at full speed. |
| Slow phones looked worse | Adaptive graphics was on by default: a device that dipped under 40 fps had its pixel ratio stepped down (a softer picture than everyone else, and a canvas resize hitch). |
| Game Boy slow the first time | The idle preload fetched `gambatte-wasm.data`, but EmulatorJS plays `gambatte-legacy-wasm.data` (neither core report sets `defaultWebGL2`), so the real core downloaded on the spot. The NES core and NES carts weren't preloaded at all. |
| NES stutters | Playing the NES, the view is still on the TV, yet the room redrew all of its 1.4M triangles every frame on the emulator's thread. |
| TV channels slow after a deploy | The archive.org lookup cache lived only in memory. Every deploy emptied it, and every channel queued for archive.org again (2 at a time). An answer past its 6 h also made the next viewer wait for a fresh one. |
| Occasional failed files under load | Node closes idle keep-alive sockets after 5 s. Railway's proxy reuses its connections longer, and a request sent down a socket just as Node closes it comes back as a 502. |
| Deploys cut downloads | SIGTERM called `process.exit(0)` straight away. |

## What changed

- **`FirstDrawGate`** (`src/engine/SceneWarmup.tsx`, mounted in `WalkRoom`). Before each frame it looks for drawn things whose material it hasn't seen yet. It starts their shaders (`gl.compile`) and textures, and keeps them out of the picture (an empty `layers.mask`; nothing else in the room uses layers) until they are ready. With `KHR_parallel_shader_compile` (Chrome, Edge, Safari, most phones) the driver builds them on its own threads and the frame never waits. Without it, one shader is linked per frame. Nothing waits more than 1.5 s. Whatever is in the scene on the first drawn frame goes straight through, and a thing that keeps getting new materials is let through after 4 holds. `userData.noGate` opts something out.
- **Spot lights in the light budget.** `LightBudget spots={1}` keeps one dark stand-in spot light that steps out when a game brings its own (`ROOM_SPOT_BUDGET` in `WalkRoom.tsx`). **If something can bring a second spot light at the same time, raise it.** The board game lamp no longer has `castShadow`: the room renderer has no shadow maps, so it did nothing except change the shader key.
- **Furby culling.** `furbyRig.ts` gives the skinned mesh a bounding sphere 1.5x its rest size + 0.25, which covers any nod, lean, squash or hop, instead of `frustumCulled = false`.
- **Look glide** (`WalkController.tsx`). Touch and trackpad/wheel turns are applied over about 45 ms (`LOOK_GLIDE`). The turn is the same size, spread over a few frames. The mouse stays direct. Arrow-key turns ease in and out over about 80 ms (`KEY_TURN_EASE`).
- **Adaptive graphics off by default** (`graphics.ts`). Every device stays on High. A player can still turn it on in the Engine panel.
- **Cartridges**: `cartridgeWarmList()` preloads the `-legacy` cores EmulatorJS really uses, for both consoles, plus the NES carts.
- **NES**: while the emulator plays and the view is still, the room draws on demand at 20 fps (`atNesStill`, a `DemandTicker`). A drag or touch still gets the full rate. The room div has `data-frameloop` for scripts.
- **Server** (`server.mjs`, `server/archiveMeta.mjs`, `server/db.mjs`):
  - The archive.org cache is saved to the data dir (`archive-cache.json`) every 2 minutes and on shutdown, then restored at boot. **Attach a Railway volume and set `DATA_DIR`** (or rely on `RAILWAY_VOLUME_MOUNT_PATH`) so it survives deploys, not only restarts.
  - An answer past its 6 h is still sent at once, for up to a day (`serveStaleMs`), while one refresh runs behind it.
  - `/api/archive` 200s also carry `stale-while-revalidate=86400`.
  - `keepAliveTimeout` 65 s, `headersTimeout` 66 s.
  - SIGTERM saves the cache, stops taking connections, lets requests in flight finish (10 s at most), then exits.
  - The Postgres pool defaults to 10 (`PG_POOL_MAX`).

## How it was measured

Production build, `node server.mjs`, Playwright's Chromium on SwiftShader (software GL, 4 cores, no `KHR_parallel_shader_compile`). The scripts are in `scripts/perf/` (they need `playwright`, which the cloud sandbox has; `TV_CLIP` points at any short H.264 mp4 that stands in for archive.org, made with `ffmpeg -i public/menu/reel.mp4 -t 60 -vf scale=640:-2 tvclip.mp4`). "Before" is main at `0b635c0`.

Software GL draws this room at well under 1 fps, so frame rates here say nothing about a real GPU. What carries over to any device is the work: shaders built inside a frame, triangles drawn, and the longest main-thread task when something starts. SwiftShader is the worst case for the shader rows: it has no parallel compile, so each build blocks. On a GPU that has it, the gate's waits drop to zero.

| Moment (`events.cjs`, `cpu.cjs`, `views.cjs`) | Before | After |
| --- | --- | --- |
| Turning the TV on: longest main-thread task | 9.2 s | 0.13 s |
| Starting Hot Wheels: shaders built in one frame | 16 | 0–3 (one per frame at most) |
| Starting Hot Wheels: new shaders needed | 20 | 5 |
| Starting Hot Wheels: longest frame | 7.3 s | 0.12–0.25 s (one run hit 7.5 s; see below) |
| Triangles drawn, looking at the ceiling | 129k | 0.6k |
| Triangles drawn, looking back toward the door | 546k | 417k |
| Triangles drawn, looking right | 735k | 606k |
| Triangles drawn, spawn view | 1.49M | 1.36M |
| Walking and turning: shaders built mid-walk | 0 | 0 |
| Graphics level after a slow minute (test browser) | stepped down to Low (dpr 1) | stays High |
| Game Boy: core file preloaded | the wrong one (`gambatte-wasm.data`) | the one it plays (`gambatte-legacy-wasm.data`) |
| NES: core and carts preloaded | no | yes |
| NES playing: room redraws | every frame | 20 a second while the view is still |

Starting a race still needs 5 new shaders for the race's own pieces. Without parallel compile each one blocks once (one per frame now, not all in one), which is the 7.5 s outlier in software GL.

The army men town still builds 12 shaders for its pieces. It already sat behind "Shrinking you down…" (`useWarmReveal`), so on a GPU with parallel compile there is no freeze. In software GL the longest task went from 14.8 s to 7.1 s.

Server, `load.mjs` (localhost, 100 visitors, 50 loading at once; each loads the page, its bundles, the manifest and all 45 room models as `?v=hash` brotli, six at a time like the room):

| | Result |
| --- | --- |
| Errors | 0 of 5,300 files |
| Page | p50 54 ms, p99 122 ms |
| Bundles | p50 484 ms, p99 871 ms |
| Models | p50 0.9 s, p99 3.7 s |
| Throughput | about 190 MB/s from one Node process |

That was the same before and after: the server wasn't the bottleneck. On Railway the limit is bandwidth. Each first visit is about 117 MB of models. The keep-alive change only shows behind a proxy that reuses connections, which localhost doesn't have.

TV lookups right after a deploy (`archload.mjs`: 300 viewers at once across 40 channel items, archive.org answering in 0.6–1.2 s):

| | Before (empty cache) | After (cache restored, refreshing behind) |
| --- | --- | --- |
| Wait for a channel, p50 | 9.1 s | 1 ms |
| Wait for a channel, p95 | 17.1 s | 3 ms |

## Left to do / ideas

- **Put Cloudflare (free plan) in front of the Railway URL.** It gives the most for the launch. The headers are already CDN-ready: hashed models and `/assets` are `immutable` for a year, the rest is a day plus a week of stale-while-revalidate, and pages are `no-cache`. A CDN would serve the 117 MB per visitor from the edge instead of from one Railway container.
- The room is 1.36M triangles and 175 draws at spawn. The big Tripo models (80–270k each) were restored to full detail on purpose. Merging static props into fewer draws would be the next GPU win that changes nothing on screen.
- The Game Boy still takes a few seconds to boot after the files arrive: EmulatorJS unpacks its 7z core and compiles the WebAssembly each time.
- Measuring on a real GPU (a phone over USB with remote debugging) would give real frame times. Watch `?diag=1` → Engine panel.

# Responsiveness pass (October 31 2026, after PR #87)

Handoff notes for the pass after the launch pass. Reported: the room felt less smooth and less responsive than before the caching/loading work and PR #87, on Chromebook, iPad and other browsers, with caches cleared and on every graphics preset. **Nothing visual changed**: same models, textures, lights, light count, shadows, effects, draw distance and pixel ratio.

## What was wrong

| Symptom | Cause |
| --- | --- |
| Looking around felt delayed and floaty (touch, trackpad, arrow keys) | PR #87 put touch and trackpad/wheel looks through an exponential glide (`LOOK_GLIDE = 0.045` s) and eased the arrow-key turn (`KEY_TURN_EASE = 0.08` s). At 60 fps a swipe was 31% applied on the frame it arrived, 67% after 50 ms, 89% after 100 ms, 95% after 135 ms. The arrow keys reached 63% of their turn speed after 80 ms and 95% after 240 ms, then kept turning for about 9° after you let go. The mouse was never glided, which is why it showed most on iPad and Chromebook trackpads. |
| Steady per-frame cost | Two full scene walks before every frame: `FirstDrawGate` looked at every object for a material it hadn't seen, and `LightBudget` walked the scene again to count lights. On the loaded room (553 objects) that was 0.29 ms a frame with the CPU throttled 4x, on every frame, to catch the rare frame where something mounted. |
| A hitch when a model or game arrived mid-session | `FirstDrawGate` called `gl.compile()` once per new mesh. three's `compile()` walks the whole scene to gather lights on every call (0.33 ms each, 4x throttled), so a model with a hundred meshes walked the scene a hundred times in one frame. |
| Repeated full-room compiles while loading | `SceneWarmup` recompiled every material in the scene whenever anything new appeared: about forty times while the room loaded, each one rebuilding the program key of every material. |
| "Room ready" wasn't ready | Ready meant "the downloads are done". Parsing, shader compiles, texture uploads and vertex uploads were still to come: on a repeat visit (downloads in ~4 s) pressing Play at "Room ready" spent the next 2.5 s mostly blocked, about 0.8 s linking shaders and 0.4 s uploading textures (CPU profile, software GL), with 57–76 texture uploads and 10 frames over 50 ms after Play. |
| A long first frame after Play | The warm-up compiled shaders and sent textures, but vertex buffers only go to the GPU on a mesh's first draw. The first frame after Play sent about 36 MB of them at once. |
| Texture warm-up could bunch up | Three textures per task, whatever their size: three large uploads with mipmaps back to back on a phone. The gate allowed four in one frame. |

## What changed

- **Scene change tracking** (`src/engine/sceneGraph.ts`). three's `Object3D.add` / `remove` are wrapped once. An add or remove anywhere under a tracked scene bumps the scene's version and, while the gate is collecting, remembers the new subtree's root. Work outside a tracked scene (a GLTF being parsed, a clone being built) costs a short walk up its parents and nothing else.
- **`FirstDrawGate`** only looks at what was added since the last frame. On a frame where nothing was added and nothing is held it does nothing. New drawn things are compiled in **one** batched `compileBatch()` call (a stand-in root whose `traverse` visits exactly them, so three gathers the lights once). Holding, one link per frame without parallel compile, the 1.5 s cap, `noGate` and the strike rule are as before. Things whose material the renderer has already built (by the warm-up, or another copy of the same model) are not held. Texture uploads in a frame are time-sliced (4 ms, at least one).
- **`LightBudget`** calls `syncLights()`: it rebuilds its list of the room's lights only when the scene graph changed, and otherwise checks only whether one of those lights was shown or hidden (a walk up its few parents). It rebalances only when something changed, and ends up with exactly the lights `balanceLights()` gives (tested). `balanceLights()` is unchanged in what it does.
- **`SceneWarmup`** compiles only the drawn things whose material is new or changed (by material version, so `needsUpdate` changes are caught too), in one batch, then uploads textures in 6 ms slices (at least one per task). Behind the title (the canvas draws nothing then: `hidden`), once a batch's shaders and textures are done, it draws just those things once on a spare layer with the same lights (`drawHidden`), so their vertex buffers go up behind the title instead of in the first frame. The same lights pass the camera's layer test, so the same programs are used and nothing new is built. Nothing is uploaded that isn't already in the scene.
- **Loading stages** (`src/engine/roomPrep.ts`). "Room ready" now means downloaded (`netQueue`), parsed (GLTF loads in flight, counted in `gltfCache.ts`), placed, compiled and uploaded (a warm-up scan after the last parse found nothing new). Between the last byte and ready the bar says "Preparing the room". If preparing takes more than 15 s (`PREP_MAX_MS`) the room opens anyway, and the gate covers the rest; "Go in anyway" still shows after 20 s of no progress.
- **Looking** (`WalkController.tsx`). Touch and trackpad/wheel looks turn the camera on the event again, as they did before PR #87, and the arrow keys turn at full speed while held and stop when released. Sensitivity, zoom scaling, presets and walking (`walkSpeed`, `crouchSpeed`, `accel` in `videoRoom.ts`) are unchanged.

### Not changed, and why

- **Title reel and model line.** Measured cold at 50 Mbps (`net.cjs`): the link is saturated until the room is in, so "Room ready" is the total bytes over bandwidth. Chromium keeps about 20 s of the reel buffered ahead while it plays (about 2.3x its 4.4 Mbps rate during the load: 34 MB of the 164 MB moved before the room was in). `preload="metadata"` made no difference once the reel plays (tested: same bytes, same buffer). The reel request stays open for its whole download, throttled by the browser, which is why Railway logs it at 25–38 s; it doesn't block the model downloads. The hashed cache and immutable headers work (a repeat visit downloads 0 MB of models). A lighter encode would help on a slow link, but that would change the reel's quality, so it's left for a decision.
- **Graphics.** Adaptive graphics stays off. The point-light budget (21) and the spot stand-in stay, so no shader is rebuilt when a game brings a lamp.

## How it was measured

Production build, `node server.mjs`. "Before" is main at `76a0a68` (PR #87), served from a copy of its `dist` on another port. Playwright's Chromium on SwiftShader (software GL, no parallel shader compile), 160×90. Software GL exaggerates GPU time and draws this room at a few frames a second, so frame rates here say nothing about a real device. What carries over is the main-thread work.

| | Before | After |
| --- | --- | --- |
| Gate + light budget, per frame, nothing changing (`framecost.ts`, room-shaped scene) | 43 µs | 0.7 µs |
| Same two walks on the real loaded room, CPU 4x throttled (`walkcost`) | 0.29 ms every frame | none while nothing changes |
| `gl.compile` calls for a model of N new meshes arriving mid-session | N (0.33 ms each, 4x) | 1 |
| Repeat visit, Play at "Room ready": main-thread time in shader links / texture uploads, first 2.5 s (CPU profile, `first.cjs`) | 791 ms `getProgramInfoLog`, 416 ms `texSubImage2D`, 491 ms `getExtension` | ~0 (main thread idle 2.3 of 2.5 s) |
| Play at "Room ready": texture uploads inside frames, next 10 s (`ready.cjs`, cold / repeat) | 57 / 76 | 0 / 0 |
| Play at "Room ready": vertex data uploaded inside frames | 35.7 MB, in frame 0 | 0 MB |
| Play at "Room ready": frames over 50 ms (cold / repeat) | 2 / 10 | 1 / 1 |
| "Room ready" shows (no throttle, cold / repeat) | 12.2 / 4.7 s | 15.6–20.3 / 10.0–15.5 s, see below |
| "Room ready" shows, cold at 50 Mbps (`net.cjs`) | 27.0 s | 28.2 s (the prep overlaps the downloads) |
| TV on, Hot Wheels start: longest task (`events.cjs`, two sequential runs each) | 146–205 ms, 508–534 ms | 157–184 ms, 597–604 ms |

"Room ready" comes later because it now includes the parse, compile and upload work that used to land in your first seconds in the room. In software GL that work is very slow (each shader link blocks for a long time, and drawing a model once costs real time), so this is the worst case. On a GPU with `KHR_parallel_shader_compile` the shaders build on driver threads and the uploads take milliseconds, so the extra wait is small. It's work you would have waited through anyway, now spent behind the title song instead of as freezes in the room.

Starting Hot Wheels came out about 70 ms longer in both runs (5 new shaders in software GL, where one link blocks for hundreds of ms). That is within this setup's noise but was consistent, so it's worth a look on a real device; the number of shaders built and the one-link-per-frame rule are unchanged.

The single long frame that remains after Play (0.4–1 s in software GL) is the GPU drawing the full 1.36M-triangle room for the first time. It shows as idle in the CPU profile: the main thread is waiting on the software GPU, not doing work.

Scripts: `scripts/perf/framecost.ts` (`npx tsx scripts/perf/framecost.ts`), `scripts/perf/ready.cjs <port> [mbps] [repeat 0|1]`, `scripts/perf/net.cjs <out.json> [mbps] [port]`, `scripts/perf/first.cjs <port>`.

## Left to do / ideas

- Measure on real devices (iPad and a Chromebook with remote debugging) with `ready.cjs` and the Engine panel; the software-GL numbers are only good for before/after comparison.
- If the title reel is ever re-encoded, a phone-sized version would leave more of the link to the room on a first visit.
- If something is added to the room with `scene.children.push` instead of `add`, the gate won't see it. Everything in the codebase (and r3f) uses `add`.
