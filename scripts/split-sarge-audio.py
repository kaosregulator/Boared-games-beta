"""
Cuts the user's two Sarge recordings into one MP3 sprite with a JSON index:
public/audio/sarge/sarge.mp3 + sarge.json. In memory of R. Lee Ermey, who
voiced the green army men's sergeant.

- movie: "Sarge_R_Lee_Ermey.mp3" (0:38), the recon scene from Toy Story.
  Used for jumping out of the chopper and falling off the shelf.
- ts3: "Sarge_TS3_all_lines.mp3" (3:02), his lines from the Toy Story 3 game.

The movie clip's words come from the user's "Army_Men_First_MP3_Transcript.pdf".
Its speech is six bursts (silencedetect at -28 dB), in the transcript's
order: the squad's "Sir, no, sir!", "Yes, sir!", the 7.6 s Code Red order
(the transcript says 7.7 s), "Mission accomplished...", then the scout on the
baby monitor and Sarge's "Last present!", then the monitor again for "It's a
board game! Repeat: Battleship!". The monitor lines have no energy under
400 Hz and none over 3 kHz (the radio band), which is how they were told
apart from Sarge in the room; the transcript credits "It's a board game" to
Sarge, but it's on the monitor, so it's the recon soldier (an army man too).
Everybody in that clip is an army man; the rest of the movie scene isn't in it.

TS3:

The words come from the user's transcript (Sarge_Transcript.pdf). Its
timestamps drift (they run about 3 s early at the start and 30 s early by
the end), so the cuts were taken from the recording itself instead: every
line is a burst of speech between gaps of 0.6-0.8 s, found with
`ffmpeg -af silencedetect=noise=-35dB:d=0.18`. Matching the transcript to
those bursts in order, the lengths agree line for line (the long briefing
lines are the long bursts, "Good work, soldier!" is a one-second one), which
is what ties each line to its words. Where a line has a pause inside it
("All right! ... Mission accomplished!") its bursts are one clip.

Left out:
- The movie's "Okay, we're on the last present now." (the scout on the
  monitor, 15.3-17.0 s) and Sarge's "Last present!" echo after it. The
  Battleship clip starts after them, at 18.05 s.
- "Lotso and his gang have reprogrammed Buzz... and incarcerated Rex,
  Slinky, Hamm, and Jessie in high-security zones!" (TS3 123-132 s): the
  user asked for it to stay out.
- 0:00-0:03.7, the transcript's slate. It's lower-pitched than everything
  after it (about 166 Hz against his 230-350 Hz shouting), so not him.
- The transcript's last line runs past the end of the file; only its first
  sentence ("Let's hit that target!") is in the recording.

Tags are the moments a line plays in the army town and on the shelf duck
range (see sargeVoice.ts). The grunts and oofs carry no words: they go in
front of a line when you step off, land or get hit.

    python3 -I scripts/split-sarge-audio.py "<movie>.mp3" "<ts3>.mp3" public/audio/sarge
"""
import json, os, subprocess, sys, tempfile

GAP = 0.25

# (source, id, start s, end s, tags, words), cut from the recordings as above.
CUTS = [
    # The movie: the chopper bail-out and the high fall.
    ('movie', 'sir-no-sir', 0.00, 1.30, 'fall bail', 'Sir, no, sir!'),
    ('movie', 'yes-sir', 1.50, 2.25, 'bail', '...Yes, sir!'),
    ('movie', 'code-red', 3.57, 11.25, 'bail wave', "All right men, you heard him! Code Red, repeat: We are at Code Red! Recon Plan Charlie, execute! Let's move, move, move, move, move!"),
    ('movie', 'pack-it-up', 11.89, 15.20, 'land win', "Mission accomplished! Well done, men! Pack it up, we're going home."),
    ('movie', 'battleship', 18.05, 22.66, 'bail heli explore', "It's a big one... It's a... It's a board game! Repeat: Battleship!"),

    # Take 01: the parachute drill, the chewing-outs and the pats on the back.
    ('ts3', 'downdraft', 5.23, 6.84, 'chute', 'Look out for the downdraft!'),
    ('ts3', 'drifting', 7.46, 9.31, 'chute', 'You are drifting off course!'),
    ('ts3', 'freak-out', 10.00, 12.01, 'intro fall buddy', 'Do not freak out, soldier!'),
    ('ts3', 'breathe', 12.75, 14.47, 'chute fall buddy', 'Relax and remember to breathe.'),
    ('ts3', 'eye-on-phone', 15.22, 16.66, 'heli explore', 'Keep your eye on that phone.'),
    ('ts3', 'give-me-twenty', 17.41, 18.61, 'shot buddy', 'Drop and give me twenty!'),
    ('ts3', 'best-you-can-do', 19.36, 21.22, 'miss hardland', 'Is that the best you can do?'),
    ('ts3', 'thinking', 21.96, 23.09, 'miss fall bail', 'What were you thinking?!'),
    ('ts3', 'not-how', 23.82, 25.72, 'miss hardland', "That is not how it's done."),
    ('ts3', 'kidding-me', 26.45, 28.64, 'miss fall bail', 'You have got to be kidding me!'),
    ('ts3', 'try-again', 29.34, 30.72, 'again buddy', "Let's try again."),
    ('ts3', 'dont-pout', 31.42, 34.26, 'shot buddy', "Soldiers don't pout. Do it again!"),
    ('ts3', 'pick-yourself-up', 34.98, 37.83, 'shot buddy hardland', 'Pick yourself up, soldier, and try it again!'),
    ('ts3', 'make-me-sick', 38.48, 40.38, 'shot duck-over', 'You make me sick! Start over!'),
    ('ts3', 'write-home', 41.11, 44.09, 'shot duck-over', "Write home, soldier, and tell 'em you're pathetic!"),
    ('ts3', 'good-work', 44.72, 45.73, 'good land cleared duck-hit', 'Good work, soldier!'),
    ('ts3', 'mission-accomplished', 46.44, 49.67, 'cleared win', 'All right! Mission accomplished!'),
    ('ts3', 'asset', 50.39, 53.29, 'good win duck-perfect', 'You are an asset to toys everywhere!'),
    ('ts3', 'medal', 53.93, 55.84, 'good land cleared duck-hit', 'What do you want, a medal?'),
    ('ts3', 'how-you-do-it', 56.51, 57.74, 'good land duck-hit', "That's how you do it!"),
    ('ts3', 'promotion', 58.46, 60.68, 'win duck-perfect', "I'm recommending you for a promotion. Great job!"),
    ('ts3', 'move-move-move', 61.39, 66.58, 'wave start heli', 'Yes, sir! You heard him, men: Move, move, move!'),
    # The climbing grunts (stepping off, getting hit), then the landings and tumbles.
    ('ts3', 'grunt-1', 67.32, 68.27, 'grunt', ''),
    ('ts3', 'grunt-2', 68.83, 69.47, 'grunt', ''),
    ('ts3', 'grunt-3', 70.12, 70.58, 'grunt', ''),
    ('ts3', 'grunt-4', 71.33, 71.67, 'grunt', ''),
    ('ts3', 'grunt-5', 72.34, 72.55, 'grunt', ''),
    ('ts3', 'grunt-6', 73.26, 73.40, 'grunt', ''),
    ('ts3', 'oof-1', 74.08, 74.28, 'oof', ''),
    ('ts3', 'oof-2', 75.01, 75.59, 'oof', ''),
    ('ts3', 'oof-3', 76.24, 76.74, 'oof', ''),
    ('ts3', 'oof-4', 77.44, 77.79, 'oof', ''),
    ('ts3', 'oof-5', 78.46, 79.12, 'oof', ''),
    ('ts3', 'oof-6', 79.87, 80.28, 'oof', ''),
    ('ts3', 'oof-7', 80.93, 81.29, 'oof', ''),
    ('ts3', 'oof-8', 82.02, 82.41, 'oof', ''),
    ('ts3', 'ow', 83.12, 83.91, 'oof', ''),
    # Take 02: the briefing (the shrink-down intro and the duck story), the stealth mission, the landing zone.
    ('ts3', 'we-can-help', 84.64, 86.32, 'explore duck-story', 'Sir! I believe we can help.'),
    ('ts3', 'deployed', 86.61, 89.66, 'intro', 'My men are deployed throughout the room but tied up at the moment.'),
    ('ts3', 'free-em', 89.94, 93.39, 'explore', "If you can free 'em, they'll get that phone down safely, guaranteed!"),
    ('ts3', 'sound-off', 93.59, 98.82, 'intro', 'Men, where are ya? Sound off! Sound off! Roll call!'),
    ('ts3', 'roll-call', 99.42, 109.10, 'intro', '(The men sound off.)'),
    ('ts3', 'good-luck', 109.84, 112.39, 'intro', "That's all of them. Good luck."),
    ('ts3', 'steady', 113.08, 119.08, 'chute good', 'Steady... Steady... Careful now. Looking good, soldier. Amazing work!'),
    ('ts3', 'situation', 119.47, 122.73, 'wave duck-story', 'Psst! Sir! We have a situation, sir!'),
    ('ts3', 'spotlights-trucks', 132.55, 136.73, 'explore', "If you want to free 'em, watch out for the spotlights and patrolling trucks!"),
    ('ts3', 'alarm', 137.49, 140.25, 'explore', "If you're caught in the lights, an alarm will sound, and it's all over!"),
    ('ts3', 'stealth', 140.97, 143.78, 'explore duck-story', 'This rescue mission requires a covert, stealth approach.'),
    ('ts3', 'buttons', 144.47, 148.00, 'explore', 'Did you see the buttons that turn the lights off?'),
    ('ts3', 'watch-spotlights', 148.74, 151.44, 'explore', 'Remember, watch out for those spotlights!'),
    ('ts3', 'dont-land-on-me', 152.00, 155.75, 'land', "Do not land on me! The telephone's the objective!"),
    ('ts3', 'phone-target', 156.50, 159.41, 'combat heli', 'Remember, the telephone is the target!'),
    ('ts3', 'landing-zone', 160.16, 162.92, 'chute heli', 'All right, men: the landing zone is that telephone. Got it?!'),
    ('ts3', 'get-to-phone', 163.63, 166.59, 'start heli', "All right soldiers, let's get to that telephone!"),
    ('ts3', 'land-close', 167.18, 169.91, 'chute', 'Land as close as you can to that telephone, men!'),
    ('ts3', 'aiming-at', 170.34, 172.10, 'miss duck-miss', 'Soldier, what are you aiming at?!'),
    ('ts3', 'aiming', 170.34, 179.14, 'miss combat duck-miss', 'Soldier, what are you aiming at?! Do I look like a telephone to you? No? Well then hit the telephone!'),
    ('ts3', 'hit-target', 179.91, 181.69, 'wave start combat duck-story duck-start', "Let's hit that target!"),
]


def main():
    sources = {'movie': sys.argv[1], 'ts3': sys.argv[2]}
    out = sys.argv[3]
    os.makedirs(out, exist_ok=True)
    clips, parts, at = [], [], 0.0
    with tempfile.TemporaryDirectory() as tmp:
        silence = os.path.join(tmp, 'gap.wav')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=32000:cl=mono', '-t', str(GAP), silence], check=True)
        for i, (source, cid, a, b, tags, text) in enumerate(CUTS):
            src = sources[source]
            # A little air either side, with short fades so nothing clicks.
            a0 = max(0.0, a - 0.06)
            dur = round(b - a0 + 0.12, 3)
            wav = os.path.join(tmp, f'{i:03d}.wav')
            subprocess.run([
                'ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{a0:.3f}', '-t', f'{dur:.3f}', '-i', src,
                '-ac', '1', '-ar', '32000', '-af', f'afade=t=in:d=0.03,afade=t=out:st={dur - 0.06:.3f}:d=0.06', wav,
            ], check=True)
            clips.append({'id': cid, 'tags': tags.split(), 'start': round(at, 3), 'dur': dur, 'text': text})
            parts += [wav, silence]
            at += dur + GAP
        listing = os.path.join(tmp, 'list.txt')
        with open(listing, 'w') as f:
            f.writelines(f"file '{p}'\n" for p in parts)
        subprocess.run([
            'ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listing,
            '-ac', '1', '-ar', '32000', '-b:a', '64k', os.path.join(out, 'sarge.mp3'),
        ], check=True)
    with open(os.path.join(out, 'sarge.json'), 'w') as f:
        json.dump({'clips': clips}, f, separators=(',', ':'))
    print(len(clips), 'clips,', round(at, 1), 's')


main()
