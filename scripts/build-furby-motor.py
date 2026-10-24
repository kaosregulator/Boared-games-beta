"""
The gearbox of a real 1998 Furby, from the user's recording of one
(furby_1998_motor.mp3, kept in the project files under furby/): a dalmatian
Furby with a dead speaker, so all you hear is the motor turning the cam.

The recording is quiet and hissy and comes in bursts, one per movement. This
takes the hiss out (spectral subtraction against the gaps between bursts),
cuts out each burst with its own spin-up and spin-down, evens their levels,
and gives each a loop in its steady middle so a burst can run as long as the
Furby's mouth does. Written as one sprite, public/audio/furby/motor.mp3, with
each burst's times in motor.json.

    python3 -I scripts/build-furby-motor.py /mnt/project-files/furby/furby_1998_motor.mp3 public/audio/furby
"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np

SR = 44100
N, HOP = 1024, 256
ATTACK, RELEASE, XFADE = 0.06, 0.08, 0.03


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def stft(x):
    w = np.hanning(N)
    frames = [x[i:i + N] * w for i in range(0, len(x) - N, HOP)]
    return np.fft.rfft(np.array(frames), axis=1)


def istft(S, length):
    w = np.hanning(N)
    y, norm = np.zeros(length), np.zeros(length)
    for k, f in enumerate(np.fft.irfft(S, n=N, axis=1)):
        i = k * HOP
        y[i:i + N] += f * w
        norm[i:i + N] += w * w
    return y / np.maximum(norm, 1e-3)


def denoise(x):
    S = stft(x)
    mag = np.abs(S)
    level = mag.mean(axis=1)
    # The quietest fifth of the frames is the room and the recorder: the hiss.
    quiet = level <= np.percentile(level[level > 0], 20)
    noise = mag[quiet & (level > 0)].mean(axis=0)
    gain = np.maximum(1 - 1.8 * noise / np.maximum(mag, 1e-12), 0.06)
    # Smooth the mask over time so the leftover hiss doesn't warble.
    for k in range(1, len(gain)):
        gain[k] = np.maximum(gain[k], gain[k - 1] * 0.6)
    return istft(S * gain, len(x)), quiet


def bursts(x, quiet):
    hop = int(SR * 0.01)
    rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    floor = np.percentile(rms, 25)
    on = rms > floor * 3.2
    runs, start = [], None
    for i, v in enumerate(np.append(on, False)):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if runs and start - runs[-1][1] < 6:
                runs[-1] = (runs[-1][0], i)
            else:
                runs.append((start, i))
            start = None
    return [(a * hop / SR, b * hop / SR) for a, b in runs if (b - a) * hop / SR >= 0.25]


def main(src, out_dir):
    x = load(src)
    clean, quiet = denoise(x)
    parts, index, t = [], [], 0.0
    gap = np.zeros(int(SR * 0.05))
    for a, b in bursts(clean, quiet):
        a, b = max(0, a - 0.01), min(len(x) / SR, b + 0.02)
        seg = clean[int(a * SR):int(b * SR)].copy()
        body = seg[int(ATTACK * SR):len(seg) - int(RELEASE * SR)]
        seg *= 10 ** (-18 / 20) / max(np.sqrt(np.mean(body ** 2)), 1e-6)
        seg *= min(1, 0.89 / np.abs(seg).max())
        fade = int(SR * 0.004)
        seg[:fade] *= np.linspace(0, 1, fade)
        seg[-fade:] *= np.linspace(1, 0, fade)
        # Loop region in the steady middle; its last XFADE blends into what
        # leads up to its start, so the jump back is seamless.
        ls, le = int(ATTACK * SR), len(seg) - int(RELEASE * SR)
        xf = int(XFADE * SR)
        w = np.linspace(0, 1, xf)
        seg[le - xf:le] = seg[le - xf:le] * (1 - w) + seg[ls - xf:ls] * w
        parts += [seg, gap]
        index.append({
            'start': round(t, 4),
            'loopStart': round(t + ls / SR, 4),
            'loopEnd': round(t + le / SR, 4),
            'end': round(t + len(seg) / SR, 4),
        })
        t += (len(seg) + len(gap)) / SR
    pcm = (np.concatenate(parts) * 32767).astype(np.int16)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'motor.wav')
        with wave.open(wav, 'wb') as f:
            f.setnchannels(1)
            f.setsampwidth(2)
            f.setframerate(SR)
            f.writeframes(pcm.tobytes())
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-b:a', '96k', os.path.join(out_dir, 'motor.mp3')], check=True)
    with open(os.path.join(out_dir, 'motor.json'), 'w') as f:
        json.dump({'bursts': index}, f)
    print(len(index), 'bursts,', round(t, 2), 's')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
