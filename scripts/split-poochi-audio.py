"""
Cuts the user's Poo-Chi recording ("Robo Chi Pets Original Poo Chi US
Model - ALL 6 SONGS.mp3", 3:31, someone playing the toy on a table) into the
sounds the room uses, packed into one MP3 sprite with a JSON index:
public/audio/poochi/poochi.mp3 + poochi.json.

Nothing here is guessed from a name. Every cut was read off the recording's
spectrogram (0-11 kHz, 20 ms frames) and its loudness:

- press: the first sound in the file, two sharp broadband clicks 0.1 s
  apart at 2.1 s. That is the head button going down and coming back up.
- bark4 / bark2 / bark: the toy's own bark, a 1 kHz tone that jumps up a
  fifth with a fizz of noise around it (the speaker rattling). Four fast
  ones answer the head press at 2.8 s; two at 6.2 s; four single, cleaner
  ones at 2:20, between songs five and six.
- beep: two short pure beeps at 2.1 kHz with a strong third harmonic. They
  come right before each of the six songs, every time (0:11, 0:43, 1:14,
  1:34, 2:28, 2:52), so they are the "song coming" signal.
- whir: the gearbox, a wide band of noise with a steady 3.8 kHz line while
  he walks, with no tones on it (0:31-0:38, inside song one).
- song1..song6: the six tunes, each starting after the beep and running
  until the toy goes quiet. Some are sung in barks alone, some over the
  motor while he dances; the title of the recording says there are six and
  the beeps split it into exactly six.

    python3 -I scripts/split-poochi-audio.py "<recording>.mp3" public/audio/poochi
"""
import json, os, subprocess, sys, tempfile
import numpy as np

SR = 22050

# (id, tag, start s, end s), read off the recording as above.
CUTS = [
    ('press', 'press', 2.02, 2.42),
    ('bark4', 'bark', 2.72, 3.58),
    ('bark2', 'bark', 6.08, 7.02),
    ('bark-a', 'bark', 140.12, 140.48),
    ('bark-b', 'bark', 140.56, 140.92),
    ('bark-c', 'bark', 140.98, 141.34),
    ('bark-d', 'bark', 141.42, 141.80),
    ('beep', 'beep', 11.10, 11.70),
    ('whir', 'whir', 31.0, 34.0),
    ('song1', 'song', 14.55, 38.85),
    ('song2', 'song', 45.45, 68.95),
    ('song3', 'song', 77.85, 89.0),
    ('song4', 'song', 97.3, 139.6),
    ('song5', 'song', 151.3, 167.9),
    ('song6', 'song', 175.5, 210.9),
]


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def envelope(x):
    """Loudness at 50 Hz, one digit 0-9 per 20 ms: drives the eyes and the mouth."""
    hop = SR // 50
    out = []
    for i in range(0, len(x), hop):
        r = np.sqrt(np.mean(x[i:i + hop] ** 2) + 1e-12)
        db = 20 * np.log10(r)
        out.append(str(int(np.clip((db + 50) / 4.5, 0, 9))))
    return ''.join(out)


def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    x = load(src)
    peak = np.max(np.abs(x))
    gap = np.zeros(int(SR * 0.25), dtype=np.float32)
    parts, clips, at = [], [], 0.0
    for cid, tag, a, b in CUTS:
        seg = x[int(a * SR):int(b * SR)].copy()
        fade = int(SR * 0.012)
        seg[:fade] *= np.linspace(0, 1, fade)
        seg[-fade:] *= np.linspace(1, 0, fade)
        seg = seg / peak * 0.89
        clips.append({'id': cid, 'tag': tag, 'start': round(at, 3), 'dur': round(len(seg) / SR, 3), 'env': envelope(seg)})
        parts += [seg, gap]
        at += (len(seg) + len(gap)) / SR
    os.makedirs(out_dir, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.f32') as tmp:
        np.concatenate(parts).astype(np.float32).tofile(tmp.name)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', tmp.name,
                        '-b:a', '64k', os.path.join(out_dir, 'poochi.mp3')], check=True)
    with open(os.path.join(out_dir, 'poochi.json'), 'w') as f:
        json.dump({'clips': clips}, f, separators=(',', ':'))
    print(f'{len(clips)} clips, {at:.1f} s')


if __name__ == '__main__':
    main()
