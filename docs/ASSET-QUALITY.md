# Asset quality tiers

The room's furniture and props come in three builds, picked by the Graphics setting.

| Graphics | Model tier | Furniture (hero) | Close-ups (Game Boy, cards, VHS, NES, boombox, army tin) | Other props |
| --- | --- | --- | --- | --- |
| Low | low | 30k tris, 1024 px | 16k tris, 1024 px | 10k tris, 1024 px |
| Balanced | medium | 110k tris, 2048 px | 50k tris, 2048 px | 30k tris, 2048 px |
| High | high | 260k tris, 4096 px | 120k tris, 4096 px | 70k tris, 2048 px |

Triangle counts are ceilings. All maps are KTX2 **UASTC**, which stays compressed on the GPU and keeps printed text and art sharp.

The device caps the tier: phones and tablets top out at medium, devices reporting 4 GB or less top out at medium, 2 GB or less at low, and GPUs without 4096 px textures at medium. `?assets=low|medium|high` forces a tier for testing. The tier is fixed per page load; changing Graphics in the menu shows *Model detail → … on reload* with a Reload button.

## What was wrong before

`scripts/simplify-room-models.mjs` kept **2%** of each mesh with a **2%** error tolerance, so a 1 m shelf could lose 2 cm of shape. That's why the skateboard, blinds and drawer fronts went flat. The colour maps had also been re-encoded as **ETC1S** at 1536 px, which bands colour and smears print. The old Graphics presets only changed the pixel ratio, so Low, Balanced and High all loaded the same files. The PC desk looked better because it was built separately: 268k tris and 2048 px WebP.

That script is now retired (it refuses to run).

## Rebuilding

The workflow **Build asset quality tiers** (`.github/workflows/asset-tiers.yml`) does everything. It runs on its own when `scripts/assets/*.json` or the build script change on `main`, or by hand from the Actions tab (optionally for a few models only).

1. It downloads each original listed in `scripts/assets/sources.json` from Google Drive.
2. It runs `scripts/build-asset-tiers.mjs`.
3. It opens a pull request with `public/models/{low,medium,high}/` and `src/engine/assetTiers.json`.

**Drive access.** The originals must be readable by the workflow. Either share each file as *Anyone with the link → Viewer*, or create a Google Cloud service account, share the Drive folder with its email, and save its JSON key as the repository secret `GDRIVE_SERVICE_ACCOUNT_JSON`.

The workflow also needs *Settings → Actions → General → Allow GitHub Actions to create and approve pull requests* turned on.

**Safety check.** If an original's proportions don't match the room model it replaces (a wrong Drive file), that model is skipped and keeps its current file. The report in the PR lists it.

To run locally, put the originals in `assets-src/` (git-ignored), install `toktx` from KTX-Software, then:

```
npm i --no-save @gltf-transform/cli@4 sharp
npm run assets:tiers -- --only window.glb,toyshelf.glb
```

Budgets live in `scripts/assets/tiers.json`; which class each model is in lives in `scripts/assets/sources.json`.

## Not covered

Furby, Poo-Chi, the Hot Wheels track and racer, and the army-town soldiers keep their hand-tuned files. They have rigs, animation or custom processing, and they already look right. They can be added to `sources.json` later.
