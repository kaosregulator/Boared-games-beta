# Master checklist: the owner's play-test notes (before PR 56)

Everything the owner listed: the 20 note screenshots, the original prompt, and the
mockups (SNES time capsule, Movie Row capsule, Game Boy, army HUD). Each item
shows what PR 56 left behind and what this branch does about it.

**The rule for all of it:** keep the room as it was before PR 56 (commit `5daf709`):
the midnight 90s bedroom, the same feel, flow and style. Games come *into* that room.
No invented stand-in art or fake assets.

Status key: ✅ done · 🟡 partly · ❌ not done · 💥 broken by PR 56

---

## A. Time capsule cards (the new memory cards)

Mockups: *SNES Time Capsule* and *The Movie Row*.

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| A1 | Rename memory cards to **Time Capsules**, one for each game and prop | 🟡 renamed, but the card is a heavy purple slab | Rebuild to the mockup |
| A2 | **See-through** hologram glass: a thin glowing edge, with the room visible behind it | 💥 0.4–0.6 purple fill, 18px blur and big glows; not see-through | Clear glass, no blur, thin neon rim |
| A3 | Not big or bulky | 💥 up to 46rem × 88dvh | About 34rem, compact, phone-safe |
| A4 | No odd animation on every card | 💥 scanline overlay on every card, and the "Animations" tab only zooms the photo | Remove both |
| A5 | Tabs along the bottom: **History · Video · Images · Animations** | 🟡 the tabs exist, but are stacked inside the slab | A separate glass tab bar under the card, like the mockup |
| A6 | Video **plays inside the card** (Movie Row) | 💥 a cramped iframe; game cards never get a video | A real player area at 16:9 |
| A7 | The **real 3D asset spins**, safeguarded so it can't be copied | ❌ `TimeCapsule.tsx` is never imported; cards show a plain `<img>` | Render the actual GLB in a small locked canvas: no download, no right-click save |
| A8 | Images tab: the original image first, Next shows the others, then the spinning asset | 🟡 | Image carousel that ends on the spinning asset |
| A9 | A hologram beam rising from the object into the card | ❌ | Light beam from the hotspot up to the card |

## B. Army men (shrink-down)

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| B1 | The game loads and plays | 💥 **Deadlocked.** The film calls `startCoach()`, which refuses unless you are standing next to Sarge, but the film freezes you. Every soldier is frozen, the bars stay up, and the camera is locked forever. | Fixed: the film starts the speech itself |
| B2 | First shot after shrinking: a **room corner** wide where you see the whole room and watch the carpet town unfold | 🟡 low and close to the rug | Corner wide while the town pops up |
| B3 | Pan and zoom in on the instructor | 🟡 | Sweep down onto Sarge |
| B4 | Zoomed in enough to feel like a **mini war** | ❌ | Low orbit across the town while the men work |
| B5 | **Cinematic black bars** | ✅ (stuck on forever) | Kept, cleared when the film ends |
| B6 | Pan around the battlefield while he gives instructions | ❌ (a small wobble on Sarge) | Orbit shot on "My men are deployed…" |
| B7 | On "Men, where are ya?" the men **line up in a row and salute** | 💥 the arm-bone hack bent every arm bone | Men run in to a line on the road; a real salute pose |
| B8 | The camera unlocks after "That's all of them. Good luck" | 💥 never happens | Unlocks after that line, then you roam as normal |
| B9 | Keycap control bar (army mockup) | 🟡 a plain text strip | Keycap bar like the mockup |

## C. Sarge's voice

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| C1 | Clips cut off and don't finish | 🟡 the audio edges are clean; lines get cut by `sargeStop()` when the next line starts | Stop lines cutting each other off; finish the line before the next |
| C2 | Remove the line that mentions **Zerg** | 🟡 only a test was added; no clip text mentions Zerg, so it must be in the audio of some clip | Find the clip by ear or speech-to-text and drop it |
| C3 | Use a Hugging Face voice model to remake full clips that tell the whole story | ❌ | Blocked: this session's network can't reach huggingface.co. Needs the domain allowed |

## D. Game Boy (bean bag)

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| D1 | New layout for the how-to and button labels (mockup) | 🟡 4 flat dark plaques ("PAD", "B", "A", "START") | Neon sticker labels: MOVE, B BACK, A SELECT, SELECT, START |
| D2 | **Big Screen (V)** and **Stand Up (Esc)** buttons at the bottom | 🟡 at the bottom, but bound to F, not V | V for Big Screen, as the mockup says |
| D3 | Game Boy at eye level; you can still walk around and stand up | ✅ | Keep |
| D4 | Works on desktop, laptop, tablet and phone | 🟡 the desktop inset is never applied (`viewRig.ts:134`), so the buttons overlap the Game Boy | Fix the inset order |
| D5 | Esc and V still work while the game has focus | 💥 the emulator iframe swallows the keys | Forward the keys from the iframe |

## E. High shelf stool

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| E1 | A "Grab a stool" button before the card on the top shelf | ✅ (it stays up after you walk away) | Clear it when you walk off |
| E2 | The card is visible after the button | ✅ | — |
| E3 | A mini stool appears | ✅ (under your feet, out of view) | Set it in front of you |
| E4 | The camera **steps up** like climbing stairs, so you see on top | 🟡 two height jumps | Step bob animation |
| E5 | Only that shelf (the other has the Easter egg soldiers) | ✅ | — |

## F. PC media player

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| F1 | Temporary playback only, never stores files | ✅ memory only, cleared on close | — |
| F2 | Warning for huge files; say which types play | 🟡 a hard 40 MB refusal; the type list isn't shown | Show the types and the size limit |

## G. Hot Wheels track

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| G1 | Bird's eye: arrow keys look and pan instead of orbiting | 🟡 pans, but on room axes, not screen axes | Pan relative to the screen |
| G2 | Third person: Up arrow must not jump to first person | ✅ | Verify by playing |

## H. Board and table games

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| H1 | **Monopoly**: mini houses you buy | ✅ | — |
| H2 | Monopoly: trading, selling, auctions | 🟡 auctions work; selling and trading are one automatic button | Choose the property, the partner and the price |
| H3 | Monopoly: a Chance card stayed on screen forever | 🟡 mostly fixed; it blocks deed inspection for the rest of the turn | Fix the edge case |
| H4 | Monopoly: the owner's colour strip on the board under the property name | ❌ | Owner strip on the board |
| H5 | Monopoly: click to inspect another player's properties | 🟡 shows only their first deed | A browsable list |
| H6 | **Battleship**: icon legend in the corner | ✅ dots | Icon legend |
| H7 | Battleship: hit and miss marks hard to see (lighting) | 🟡 unlit now, but misses vanish at low angles | Billboard miss markers |
| H8 | **Sorry**: the real board from the owner's repo, replacing the flat game | ✅ on the table (the old flat game is dead code) | Remove the dead code; animate the pawn steps |
| H9 | **Clue** cards: the real 3D figure spinning on the card, classic style | 🟡 figures built from primitives, not the assets | Use the real figure assets |
| H10 | **Texas Hold'em**: 3D, with cards and chips on the table | ✅ | Play-test |
| H11 | **Blackjack**: Follow action follows every action, not only the dealer at the end | 🟡 no shot on stand, bust or payout | Add them |
| H12 | **Go Fish**: cards on the table | ✅ | Play-test |
| H13 | **Liar's Dice (Perudo)**: "idk what this is", replace it or remove it | ❌ still on the neon wall as a flat game | Remove it from the room |
| H14 | **Wizard's Chess**: the owner's 3D board (cathedral, melee captures, stone shatter) replaces the old chess | 🟡 pieces only; no cathedral, no captures, no AI | Port the board and the capture cinematics |
| H15 | **Guess Who** from the owner's repo | ✅ playable (guessing is awkward) | Add a proper Guess button |
| H16 | **Mouse Trap** from the owner's repo | 🟡 always drawn fully built; no crank | Build it piece by piece, then the crank |
| H17 | Rules for each new game | ✅ in `gameData.ts` | — |

## I. Rubik's Cube

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| I1 | The cube in the room | ✅ | — |
| I2 | Better controls (find a repo) | ❌ not touched | New control scheme |

## J. TV

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| J1 | All TOON channels on one channel | ✅ "Toon Party" | — |
| J2 | Woody Woodpecker on its own channel | 🟡 the channel has one short | Check the catalogue |
| J3 | Felix the Cat on one channel | ✅ | — |
| J4 | Betty Boop on its own channel | ✅ | — |
| J5 | Superman and Popeye merged | ✅ | — |
| J6 | Add UBI (Ub Iwerks) | ✅ | — |
| J7 | Every short plays once before the reshuffle | ✅; the guide shows the wrong "next" at the wrap | Fix the guide |
| J8 | TV sound in the spatial (Atmos-style) audio, with bedroom music muted | 🟡 spatial yes; music not muted | Mute the bedroom tape while the TV plays |

## K. Radio

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| K1 | A SomaFM sign-in screen popped up while browsing | 🟡 likely a fallback stream returning an auth page | Reject auth/redirect streams |

## L. I Spy book

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| L1 | Zoom | 🟡 zooms in only; no zoom out on touch | Pinch and +/− |
| L2 | Both pages are pictures | ✅ | — |
| L3 | Find-list at the bottom of the pages, like the book | ✅ | — |
| L4 | Back button to the carpet I Spy | ✅ | — |

## M. View-Master and toy chest (original prompt)

| # | Ask | After PR 56 | Plan |
|---|-----|-------------|------|
| M1 | **No fake placeholder** View-Master slides | ✅ removed | — |
| M2 | **~15 real 1990s reels from vm.vmdatabase.com, with a parallax effect**, shown after you pick | 💥 an iframe of the website; no images, no parallax | Real reel frames in the viewer, with depth parallax; stereo left/right lenses |
| M3 | Parallax via toshas/stereospace (Hugging Face) | ❌ | Blocked here (huggingface.co is not allowed). A local depth model does the same job; run stereospace later if allowed |
| M4 | A real View-Master interaction animation | 🟡 a CSS lever | Lever pull advances the reel |
| M5 | The owner's toy chest under the neon games wall | ✅ (the boxes inside do nothing) | Clicking a box starts that game |

---

### Blocked by this session's network policy

The environment denies these hosts. Allow them in the environment's Network
settings to finish C3 and M3:

- `huggingface.co` and `*.hf.space`: voice model, stereospace
- `vm.vmdatabase.com` and `v5.airtableusercontent.com`: reel scans. Worked around by capturing the database pages through Firecrawl.
- `archive.org` and `upload.wikimedia.org`: only matters for checking the card videos and photos from inside the container. Players' browsers fetch them directly.

---

## Status after PR #58

Done in #57 / #58: A (time capsules), B (army film + keycaps), C1 (Sarge finishes
his lines), D (Game Boy), E (stool climb), F (PC player), G (Hot Wheels), H1–H17
(Monopoly, Battleship, Sorry, Blackjack, Hold'em, Go Fish, Guess Who, Mouse Trap
build-up + crank, Liar's Dice removed, Wizard's Chess board + captures + AI),
I (Rubik notation pad + Undo), J (TV channels, guide, music ducking), K (radio),
L (I Spy zoom), M (View-Master reels in 3D, toy chest boxes).

H9 Clue: `clue.glb` is only the box scan, so the cards spin the same 3D figures
that stand on the board (no separate pawn models exist).

Still blocked: C2 (find the "Zerg" clip) and C3 (remake Sarge's voice) need
`huggingface.co`, which this session's network still refuses. J2: only one Woody
Woodpecker short is public domain; the channel is filled with Walter Lantz shorts.
