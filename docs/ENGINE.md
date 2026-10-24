# Engine support layer

This is the shared support layer for the bedroom and the mini-games. It does not replace the room, the table games, or their controls.

## What is wired

| Piece | Where it lives | How the app uses it |
| --- | --- | --- |
| Logger | `logCore.mjs`, `src/engine/log.ts` | Browser console (warnings and errors in production, everything in dev or `?diag=1`). Server writes one JSON line per event to stdout. A ring of 200 redacted entries can be exported from the diagnostics panel. Secrets in field names or bearer/`api_key` text are removed before storage. |
| Asset registry | `src/engine/assets.ts`, `src/engine/registerRoom.ts` | Catalogs room models, shared GLTFs, room music, and the two optional warmups. `RoomModel` marks a prop ready after `useGLTF` resolves, and failed when its error boundary catches. |
| Preloader | `src/engine/preload.ts` | After the room is up and idle, `WalkRoom` calls `bootOptionalContent()`. That runs the existing `warmTableGames()` and `warmCartridges()` helpers, one registration each, with cancel and up to two retries. It does not fetch the bedroom GLBs. Those stay on `useGLTF.preload` inside `RoomModel`. |
| Resource cache | `src/engine/cache.ts`, `src/engine/gltfCache.ts` | Reads the cache `useGLTF` already fills (`suspend-react`). `THREE.Cache` stays off so file bytes are not stored twice. Room and game GLTFs are pinned. `disposeIfUnshared` only drops an unshared `blob:` upload, and only after that placement is removed. |
| Performance | `src/engine/perf.ts`, `src/engine/EngineBridge.tsx` | Frame deltas and `WebGLRenderer.info` are sampled inside the existing canvas. The bridge does not set React state per frame. Long tasks are exact when `PerformanceObserver` accepts `longtask`, otherwise `unsupported`. |
| Graphics | `src/engine/graphics.ts` | Presets are Low (pixel ratio 1), Balanced (at most 1.5), and High (at most 2). The default is High. Adaptive stepping is off until it is turned on in the diagnostics panel. Stepping changes pixel ratio only, after about 3 seconds under 40 fps or about 12 seconds over 55 fps, with an 8 second cooldown. Turning adaptive off returns to the chosen preset. A WebGL context loss does not change the preset. |
| Mini-game lifecycle | `src/engine/lifecycle.ts` | `WalkRoom` opens a record for the table session. Army Men and Hot Wheels open one when their worlds mount and run cleanups on unmount. The games still own their own timers and listeners. |
| Context recovery | `src/engine/recovery.ts` | The existing canvas rebuild in `WalkRoom` records loss and restore. `performance.memory` is reported as an estimate when the browser has it. |
| Diagnostics | `src/engine/DiagnosticsPanel.tsx` | Loaded with `import()` only when `import.meta.env.DEV`, `?diag=1`, or `localStorage['engine:diag'] === '1'`. |
| Preferences | `src/engine/persist.ts` | Graphics preset and the adaptive flag use the `engine:` localStorage prefix. Pose still uses `src/room/session.ts`. Placed props still use the `boared-room` IndexedDB in `src/room/userPlacements.ts`. |
| HTTP cache | `src/engine/httpCache.ts` | Implemented and tested. It is not attached to the radio proxy, trivia POST, ROM files, or the TV archive metadata cache. Those already have their own behavior. |

## Room sharpness

`finishMaterials` in `src/room/RoomModel.tsx` still forces `metalness` to 0 and clears `metalnessMap`. Tripo models are fully metallic and render black without an environment map. Authored `roughness` and `roughnessMap` are left alone, and anisotropy is set to the renderer's maximum. The old drei `PerformanceMonitor` no longer lowers the pixel ratio while you play. Layout, scale, and camera targets are unchanged.

High caps the pixel ratio at 2 so a 3x phone does not triple the fill rate. That cap is not a texture downsample. KTX2/Basis loading is unchanged.

## Logs on Railway

The process logs JSON to stdout, which Railway's own log view collects. Build logs are produced before this process starts, so a running server cannot see them.

For deploy, HTTP, and build logs in one place, the Railway template [intermodal](https://railway.com/deploy/intermodal) streams those sources to Loki, OTLP, or Prometheus. Locomotive forwards deploy logs to other vendors; intermodal is the one that also covers build logs. This repo does not install that template. Official notes: [ship logs to a third party](https://docs.railway.com/guides/ship-logs-third-party) and [third-party observability](https://docs.railway.com/guides/third-party-observability).

`Dockerfile` copies `logCore.mjs` next to `server.mjs`. Do not put API keys in log fields.

## Checks

```bash
npm run lint
npm test
npm run build
```

`npm test` runs `node --import tsx --test` on `tests/engine`. The health test imports `server.mjs` and listens on port 0. Importing the server does not bind the production port.

## Not in this layer

Device picking, crouch toggle, Hot Wheels unstick, Army Men wave changes, Clue card presentation, Furby table-open, Furby lights, and the NES boot hang were not changed here. Camera shots were not retuned.
