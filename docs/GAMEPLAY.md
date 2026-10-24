# Gameplay ledger

This is the running record for the room and the mini-games. A row stays here until the same steps have been run again after the change.

## Fixed in this pass

| Area | What was wrong | Root cause | Fix | How it was checked |
| --- | --- | --- | --- | --- |
| Room crouch | C and Ctrl crouched only while held. | `WalkController` treated those keys as a held button. The on-screen Duck button used a second flag, so the two could disagree. | C toggles one latch. Space stands. The Duck button uses the same latch. Ctrl is left alone so shortcuts still work. Hot Wheels and Army Men still use C for their cameras, because the walker ignores C while those modes own the keys. | `tests/room/controls.test.ts`. Browser: enter the room, press C, `data-crouch` stays `1` after the key is released, press C again and it returns to `0`. |
| Look settings | Sensitivity and invert were not settings. The menu had no device choice. | Look speed was a constant in the drag handler. | Desktop, Laptop, Tablet, and Phone presets set a look-speed multiplier and save it in `room-controls`. The slider and invert checkboxes in Room studio apply on the next drag. WASD is unchanged. | `tests/room/controls.test.ts` for the math and the save. Browser: the title reel shows the four presets and the pressed one is saved. |
| Hot Wheels steering | A stopped car, or a car scrubbing a wall, barely turned. | Steering grip was `speed / 0.22`, so it was zero at rest. A head-on bump holds speed near zero, so the nose never came off the wall. | Grip keeps a 0.45 floor, then rises to the old curve once the car is moving. High-speed easing is unchanged. No teleport. | `tests/room/carSteer.test.ts`. Before the change a half-second of full steer at rest left heading at 0, and 1.5 s pinned on the dresser turned only 0.07 rad. After the change both assertions pass. |
| Furby table | "Open the new ones at the table" did not open the table. | The engine bar was a wide empty box at the top of the screen, so on a phone or a narrow window the click landed on that box. The box pull also added a 50 ms frame cap, so a slow frame never finished the open. | The engine control is only as wide as its button. The table request is recorded before the put-down. The flight and the pull follow real time. | `tests/room/furbyTable.test.ts`. Browser at 390px: the open button is the element under the cursor, the click shows "Opening Furby", and the play actions appear after the pull. |
| Clue cards | Suggestion cards stood up 50 ms apart, the note appeared in one paint, the card someone showed you was small, and Mrs. White's name was white on a white band. | `CardFan` delayed each card by `i * 0.05`. The table HUD printed the whole note at once. The shown card was 0.16 m away at scale 1. The name was drawn in white. | A fan waits 0.14 s between cards and each card rises over 0.62 s. The Clue note types on the clock, about 0.7 s for a line, and a late tick catches up. The shown card is closer and larger and stays until Continue. Faces keep the existing portraits, weapons, and floors, inside a coloured border, with the name in black on a cream plaque. The board camera is the same. | `tests/room/cluePace.test.ts`. Browser at 1280: the accuse fan shows six readable suspect cards under "Accuse: who did it?". A suggestion in the Study put the Study card up at scale 1.65, Continue was still there, and the note read "Professor Plum shows you the Study." The same card was readable at 390px, below the status card. This machine only painted every couple of seconds, so the letters in between were not sampled; `typedCount` checks 120 ms and 900 ms. |

## Still open

| Area | Expected | Actual | Next step |
| --- | --- | --- | --- |
| Hot Wheels, every mode | The same route in each mode, with a count of successful turns and recoveries. | Only the steering-at-rest and dresser-pin cases were simulated. The orange loop, the bed gap, and a full lap were not driven in a browser. | Drive one fixed route per mode and compare. |
| Army Men | Existing waves and cameras stay. Aim lines up. An endless Easy/Medium/Hard mode and a soldier tutorial are still to be built. | Not changed in this pass. | Reproduce aim error at two distances before editing. |
| Clue, the rest of a case | An accusation played through to a winner, and the suggestion fan on a phone. | One suggestion and the card it showed were played on the existing board camera. The accuse fan was seen at 1280. The phone fan was not opened. | Play an accusation, and open the fan at 390px. |
| Table open | The box always unfolds from the same click. | Furby from the hands is fixed above. The shelf boxes were not re-tried here. | Click each shelf box once and record which ones fail. |
| Phone, tablet, and a 2x laptop | Layouts and the new presets match the device. | At 390px the Furby table does open. The play card then covers the top of the toys. This environment's pixel ratio is 1. | Move that card off the toys, then repeat crouch and presets on a phone and a tablet. |
| Performance | Frame time before and after on the same scene. | Not measured. The pixel-ratio work from the engine layer is unchanged. | Sample the same bedroom view before further rendering changes. |

## Left alone on purpose

The other agent's offline server and 24/7 show work was not on `main` when this branch started. TV archive code was not edited. Game cameras, models, and rules were not replaced.
