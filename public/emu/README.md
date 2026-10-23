# Cartridge player

`play.html` runs [EmulatorJS](https://emulatorjs.org) 4.2.3 (GPL-3.0, see `LICENSE`)
from this folder, with only the `fceumm` (NES) and `gambatte` (Game Boy) cores.
Nothing is fetched from the EmulatorJS CDN; `checkForUpdates` is disabled in
`data/src/emulator.js` for that reason.

Cartridges live in `/public/roms`. The room passes `?rom=/roms/<file>&core=nes|gb`.

`data/emulator.min.js` and `data/emulator.min.css` are built from `data/src` by
`node scripts/bundle-emulator.mjs` (one file loads much faster than the eight
sources one by one); rebuild them after editing anything in `data/src`. The
RetroArch audio buffer is raised to 128 ms in `data/src/GameManager.js` so the
sound doesn't crackle while the 3D room is drawing in the same tab.
