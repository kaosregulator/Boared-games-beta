# Cartridge player

`play.html` runs [EmulatorJS](https://emulatorjs.org) 4.2.3 (GPL-3.0, see `LICENSE`)
from this folder, with only the `fceumm` (NES) and `gambatte` (Game Boy) cores.
Nothing is fetched from the EmulatorJS CDN; `checkForUpdates` is disabled in
`data/src/emulator.js` for that reason.

Cartridges live in `/public/roms`. The room passes `?rom=/roms/<file>&core=nes|gb`.
