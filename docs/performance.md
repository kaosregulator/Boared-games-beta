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

Single runs in the test browser are noisy: a later re-run of the same merged build gave a 3.6 s worst frame on pressing play and a 6 s worst army stall, so compare builds back to back on the same machine and repeat a run before trusting a difference.

The follow-up to PR #54 (warm-up in light-free pieces, canvas textures warmed too, uploads tracked per renderer after a graphics reset) measured the same as the merged build within that noise: pressing play 2.0 to 3.7 s worst frame against 3.6 s, army worst stall 5.3 to 6.5 s against 6.0 s.

Scripts are in the session's scratchpad (`perf.cjs`, `pc.cjs`, `walk.cjs`), not in the repo; they are short Playwright scripts that use the hooks above.

## Left to do / ideas

- On a GPU without `KHR_parallel_shader_compile` (rare on desktop, more common on old Android) the first compile still blocks; it now happens behind the title or before the army town shows, rather than mid-animation.
- Reloading mid-session skips the title reel, so there is no warm-up window; the first seconds compile as before.
- The room is about 580k triangles and 157 draw calls. Merging static props would be the next big GPU win.
- Hot Wheels adds a spot light (a different count from point lights), so starting a race still rebuilds the lit shaders once.
