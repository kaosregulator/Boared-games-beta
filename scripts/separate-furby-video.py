"""
Splits the user's video of a 1998 Furby talking (Furby_1998_video.mp3, the
audio of youtu.be/wUOAdC8lewk) into two tracks: the voice, and the gearbox
motor running under it.

Supervised NMF. The voice is modelled on the clean Furby sounds already in
the sprite (the rips and the CD-ROM pack, public/audio/furby), the motor on
the video's own motor-only moments (loud above 6 kHz, no harmonics in the
voice band). The video's spectrogram is then explained as a mix of the two
sets of shapes, and each track is what its shapes account for (Wiener mask).

    python3 -I scripts/separate-furby-video.py Furby_1998_video.mp3 public/audio/furby out/
writes out/furby-video-voice.wav and out/furby-video-motor.wav.
"""
import json, os, sys
import numpy as np
import librosa
import soundfile as sf

SR = 44100
N, HOP = 4096, 1024
rng = np.random.default_rng(1998)


def nmf(V, k=None, W=None, learn_w=True, iters=250):
    """KL-divergence NMF by multiplicative updates; W stays fixed if learn_w is False."""
    W = rng.random((V.shape[0], k)) + 0.1 if W is None else W
    H = rng.random((W.shape[1], V.shape[1])) + 0.1
    for _ in range(iters):
        H *= (W.T @ (V / (W @ H + 1e-9))) / (W.sum(0)[:, None] + 1e-9)
        if learn_w:
            W *= ((V / (W @ H + 1e-9)) @ H.T) / (H.sum(1)[None, :] + 1e-9)
            norm = W.sum(0) + 1e-9
            W /= norm
            H *= norm[:, None]
    return W, H


def main(video, sprite_dir, out):
    x, _ = librosa.load(video, sr=SR)
    S = librosa.stft(x, n_fft=N, hop_length=HOP)
    V = np.abs(S)
    f = librosa.fft_frequencies(sr=SR, n_fft=N)

    # The motor as this microphone heard it: frames that are hiss up top and
    # flat (no harmonics) where the voice lives.
    hi = V[(f > 6000) & (f < 10000)].mean(0)
    band = V[(f > 250) & (f < 3500)]
    flat = np.exp(np.log(band + 1e-9).mean(0)) / (band.mean(0) + 1e-9)
    motor_only = (hi > np.percentile(hi, 50)) & (flat > np.percentile(flat, 75))
    Wm, _ = nmf(V[:, motor_only], k=10)

    # The voice from the clean sounds (not ones already taken from the video).
    sprite, _ = librosa.load(os.path.join(sprite_dir, 'furby.mp3'), sr=SR)
    clips = json.load(open(os.path.join(sprite_dir, 'furby.json')))['clips']
    clean = np.concatenate([sprite[int(c['start'] * SR):int((c['start'] + c['dur']) * SR)] for c in clips if not c['id'].startswith('v-')])
    Vv = np.abs(librosa.stft(clean, n_fft=N, hop_length=HOP))
    Vv = Vv[:, Vv.sum(0) > np.percentile(Vv.sum(0), 30)]
    Vv = Vv[:, rng.choice(Vv.shape[1], min(6000, Vv.shape[1]), replace=False)]
    Wv, _ = nmf(Vv, k=60, iters=150)

    W = np.hstack([Wv, Wm])
    _, H = nmf(V, W=W, learn_w=False, iters=300)
    voice = (Wv @ H[:Wv.shape[1]]) ** 2
    motor = (Wm @ H[Wv.shape[1]:]) ** 2
    mask = voice / (voice + motor + 1e-12)
    os.makedirs(out, exist_ok=True)
    sf.write(os.path.join(out, 'furby-video-voice.wav'), librosa.istft(S * mask, hop_length=HOP, length=len(x)), SR)
    sf.write(os.path.join(out, 'furby-video-motor.wav'), librosa.istft(S * (1 - mask), hop_length=HOP, length=len(x)), SR)
    print('motor-only frames used:', int(motor_only.sum()))


if __name__ == '__main__':
    main(*sys.argv[1:4])
