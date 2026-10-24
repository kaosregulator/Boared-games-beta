# Home Vault

Your own offline copy of a show from the Internet Archive, shrunk as small as it
can go and still look right, with a catalog in Postgres and a player on your
network. The game's TV plays from it (channel 8, Arthur 24/7) whenever it's
running, and streams archive.org when it isn't.

It starts with **Arthur (1996), complete as aired**:
https://archive.org/details/arthur-1996-complete_202203. That's 260 files (two
stories each), 25 seasons plus 7 specials, about 118 hours. Arthur is still
under copyright, so this is a personal archive for your own use. Don't share
or publish the files.

## What it does

1. **Downloads** each original `.mkv` straight from the item's storage server,
   resuming dropped transfers and checking archive.org's MD5 for every file.
2. **Shrinks** it with ffmpeg to **AV1 video (SVT-AV1) + Opus audio** in WebM:
   480p, 10-bit, CRF 46, Opus 32 kb/s stereo. Embedded subtitles are kept as a
   `.vtt` file beside it, plus a thumbnail.
3. **Records** each episode in Postgres (title, season, runtime, source file and
   MD5, SHA-256 of the small file, when it was last checked) *and* in a `.json`
   sidecar next to the video. Lose the database and `reindex` rebuilds it from
   the sidecars.
4. **Serves** a player page and a channel feed with byte-range seeking, so the
   game's TV jumps straight to "what's on now".
5. **Verifies** every file against its checksum on demand. With `--parity` it
   also writes ~5% PAR2 repair data per episode (the old Usenet trick), so a few
   bad sectors on an old drive get repaired instead of lost.

None of the pieces are new. AV1, Opus, PAR2, checksums and Postgres all exist
already. What this adds is putting them together into one pipeline that you can
just plug in.

## The numbers

Measured on this item from a 4-core cloud machine:

| | original `.mkv` | archive.org `.mp4` | **vault (AV1 + Opus)** |
|---|---|---|---|
| Total size | 96.2 GB | 42.1 GB | **~14 GB** |
| Per 26-min file | 160–650 MB | ~160 MB | **~50 MB** |
| Video | H.264, 480p–1080p, 0.9–3 Mb/s | H.264, re-encoded down | AV1 480p, ~230 kb/s |
| Subtitles | yes | no | yes (`.vtt`) |
| Download speed seen | 3.6–14 MB/s | 5–30 MB/s | — |

**Why start from the `.mkv`:** it's the master copy. The `.mp4` is archive.org's
own re-encode, so it's already lost some quality, and it has no subtitles.
Shrinking the best source gives the best picture at the same tiny size. The
`.mp4` downloads about twice as fast; use `--source mp4` if that matters more.

**How long it takes:**

- Downloading 96 GB: about 2–3 hours on a 100 Mb/s+ line (7 hours at the slowest
  speed seen).
- Shrinking 118 hours of video: SVT-AV1 preset 8 ran at 3.2–3.6× realtime on 4
  cores, so about **35 hours on a 4-core machine** and roughly 15–18 hours on an
  8-core desktop. Downloads run alongside the encoding, so the encode time is the
  total.
- It resumes. Stop it any time and run `all` again; finished episodes are skipped.

**Smaller still:** `--crf 52` lands around 200 kb/s (~11 GB total) and still looks
clean on cartoon art. `--preset 6` saves another ~7% but is 2.6× slower.

## Why not store the video inside Postgres

Postgres can hold binary data (`bytea`, large objects), but it's a poor home for
14 GB of video. Every backup and vacuum drags the whole archive along, rows get
TOAST-chunked into 2 KB pieces, you can't easily stream a byte range for seeking,
and one corrupt page can take an episode with it. Plain files on disk can be
copied to another drive, checked with a checksum, repaired with PAR2 and played
by anything. So the video stays on disk and Postgres is the index: what each
file is, its checksum, and its status.

## Run it

You need Node 20+, ffmpeg 6+ with SVT-AV1 and libopus (Homebrew, apt on Ubuntu
24.04, winget `Gyan.FFmpeg` all have them), curl, and optionally `par2` and
Postgres.

```bash
cd vault
npm install
node vault.mjs list                  # the whole item: sizes, runtimes, estimates
node vault.mjs all --parity          # download + shrink everything (resumable)
node vault.mjs serve                 # http://localhost:8088
```

Options: `--season 1,3-5` (0 means the specials), `--only s01e01-e02`,
`--source mp4`, `--crf 46`, `--preset 8`, `--height 480`, `--audio-kbps 32`,
`--drop-source` (delete each original once its small copy is done),
`--ahead 2` (how many originals to download ahead of the encoder).

Keep it on an external drive: `VAULT_DIR=/Volumes/Vault node vault.mjs all`.

With Postgres, set `DATABASE_URL=postgres://user:pass@localhost:5432/vault`; the
table is created on first run. `node vault.mjs reindex` refills it from the files,
and `node vault.mjs verify` re-hashes every episode.

### With Docker (the plug-in box)

On any always-on machine (old laptop, mini PC, Raspberry Pi 5):

```bash
cd vault
VAULT_DATA=/mnt/vault docker compose up -d                                  # Postgres + player
VAULT_DATA=/mnt/vault docker compose run --rm vault node vault.mjs all --parity
```

Everything (episodes, sidecars, the Postgres data, the item's own catalog and
torrent) lives under that one folder, so the drive is the whole archive.

## The game's TV

Channel 8 runs every Arthur episode in air order around the clock, specials
last, on the same 6 AM broadcast clock as the other channels. Each part plays
from the vault when it's running and has that episode, and falls back to
archive.org's `.mp4` otherwise.

The TV looks for the vault at `http://localhost:8088`. To use another machine,
run `localStorage.setItem('vault-url', 'http://192.168.1.20:8088')` in the
browser console (or build with `VITE_VAULT_URL`), and start the vault with
`VAULT_ORIGINS` set to the game's address (for example
`VAULT_ORIGINS=https://your-game.example`). The vault only lets the game on
`localhost` and the sites in `VAULT_ORIGINS` read it, so other web pages can't
look through your archive. Browsers block plain `http`
from an `https` page unless it's `localhost`, so a vault on another machine works
with the game running locally (`npm run dev`) or behind your own HTTPS.

AV1 plays in current Chrome, Edge and Firefox, and in Safari only on Apple
hardware that decodes AV1 (M3, A17 Pro and newer). Elsewhere the TV just uses
archive.org.

If the episode list on archive.org changes: `node vault/vault.mjs lineup --refresh`.
