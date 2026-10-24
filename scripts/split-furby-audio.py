"""
Cuts the user's three long Furby recordings (furby 1998 rip1-3.m4a) into
single sounds and packs the ones the toy uses into one MP3 sprite with a
JSON index: public/audio/furby/furby.mp3 + furby.json.

The rips are separate sounds with true digital silence between them, so a
cut is wherever the level stays under -72 dBFS for 0.3 s. Each sound gets a
tag from what it is (listened to as spectrograms, plus speech-recognition
hints like the run of "ha ha ha" in the laughs); TAGS below is that list,
keyed rip:index. Untagged sounds under 8 s become "talk", one-syllable
sounds under 2 s become "chirp". Exact repeats are dropped.

Each entry also carries a 50 Hz loudness envelope (one digit 0-9 per 20 ms)
that drives the beak, so the mouth moves with the words like the real toy.

    python3 -I scripts/split-furby-audio.py rip1.m4a rip2.m4a rip3.m4a public/audio/furby \
        --library FurbSounds/

--video adds sounds from the user's video of a 1998 Furby talking
(Furby_1998_video.mp3, the audio of youtu.be/wUOAdC8lewk). Its gearbox is
audible under the voice, so each phrase is cleaned by spectral subtraction
against the moments where only the motor runs. VIDEO lists the phrases that
are plainly one thing in a spectrogram (held stepped notes: singing; pulsed
wobbling "ha"s: laughing; arching cries: whee); the rest of the video is
ordinary Furbish, which the rips already cover.

--library adds a folder of single, named 1998 Furby sounds (FurbSounds.zip,
ripped from the "Big Fun in Furbyland" CD-ROM). Their file names say what
each one is (YUM, SFX_LAUGH_3, me_hungry...), so LIBRARY maps them onto the
same tags exactly; those join the rips' pools, and the tags only the toy's
sensors use (yum, purr, kiss, scared...) come from here. The rips were also
cross-correlated against the library (log-mel, sliding cosine): only the
purrs matched cleanly (0.92), which is where the purr tags in TAGS come from.
"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np

SR = 22050
TAGS = {
    # laughing fits ("ha ha ha" / "ack ack ack")
    '1:19': 'laugh', '1:20': 'laugh', '1:22': 'laugh', '1:30': 'laugh-long', '1:45': 'laugh-long', '1:47': 'laugh-long',
    # breathing in and out, slow: snores
    '2:22': 'snore',
    # matched SFX_PURRSOFT in the library
    '1:23': 'purr', '1:25': 'purr', '1:52': 'purr',
    # one long falling sigh with breath noise
    '1:24': 'yawn',
    # yawn, then slow even thumps: dozing off
    '2:15': 'doze',
    # a vowel then a hiss
    '2:5': 'achoo', '2:8': 'achoo', '2:12': 'achoo', '2:32': 'achoo',
    # one rising/arching cry
    '1:40': 'whee', '1:39': 'whee', '1:10': 'whee', '1:13': 'whee',
    # "oh oh oh"
    '1:44': 'uhoh', '2:17': 'uhoh', '2:19': 'uhoh',
    # held, steady notes: singing
    '1:36': 'sing', '1:51': 'sing', '2:0': 'sing', '2:1': 'sing', '3:3': 'sing', '3:4': 'sing', '3:7': 'sing-long', '1:61': 'sing-long',
    # buzzing, breathy run: a raspberry / burp
    '2:28': 'burp',
    # long stories, kept for two Furbies chatting
    '1:17': 'story', '1:28': 'story', '2:14': 'story',
}
# Library file name -> tag. Anything not listed that's under 4 s is Furbish
# chatter ('talk'); credits and the distorted CD-ROM effects are skipped.
LIBRARY = {
    'laugh': 'SFX_LAUGH_1 SFX_LAUGH_2 SFX_LAUGH_3 SFX_LAUGH_4 SFX_LAUGH_5 SFX_TITTER',
    'purr': 'SFX_PURRSOFT SFX_PURRLOUD',
    'snore': 'SFX_SNORE1 SFX_SNORE2 SNORING',
    'yawn': 'SFX_YAWN SFX_STRETCH me_snooze',
    'achoo': 'SFX_SNEEZE1 SFX_SNEEZE2',
    'burp': 'SFX_BURP_LO SFX_BURP_SH',
    'uhoh': 'SFX_UHOH OOPSIE SFX_WHOA1 SFX_WHOA2',
    'whee': 'WEE WAHHOO1 WAHHOO2 WAHHOO3 WAHHOO4 whoopee ZOOM hooray',
    'sing': 'SING_TWINKLE0 SING_TWINKLE1 SING_TWINKLE2 SING_DUMDEDE BE_BOP',
    'wake': 'SING_REVEILLE1 SING_REVEILLE2 SUNUP COCKADO',
    'yum': 'YUM THANKS me_like MELIKE good',
    'hungry': 'me_hungry please_hungry ATAY KAH_ATAY DOOMOH_ATAY',
    'yuck': 'YUCK YECH COUGH',
    'kiss': 'SFX_KISS1 SFX_KISS2 KISSME me_like_kiss',
    'hug': 'please_hug_me me_love_you LOVE KAH_MAYMAY_UNYE MAYMAY',
    'tickle': 'tickle_me',
    'scared': 'me_scared SFX_AAAH SFX_SURPRISE TROUBLE',
    'dance': 'me_like_dance boogie PARTY BIGFUN',
    'hello': 'hello hey_me_see_you me_see_you HEY_KAH_AYAY_UNYE DAH_ALOH_UTYE',
    'night': 'ALOH_NIHT sing_me_sleep NIHT_NOHLAH SUNDOWN',
    'ow': 'ow ouch SFX_GRR SFX_WHINE',
    'happy': 'me_very_happy happy GOODFUN FUN yes hey_no_joke',
    'sigh': 'SFX_SIGH1 SFX_SIGH2 SFX_SIGH3 SFX_SIGH4 BOO_HOO',
}
LIBRARY = {name: tag for tag, names in LIBRARY.items() for name in names.split()}
LIBRARY_SKIP = {'credits', 'SFX_PHONE', 'SFX_BEEP', 'SFX_RAP1', 'SFX_RAP2', 'ILL_BE_BACK', 'credits'}
# Video phrase (start, end in seconds) -> tag.
VIDEO = {
    (10.11, 11.95): 'sing',
    (12.20, 14.29): 'sing',
    (14.57, 18.56): 'sing',
    (27.64, 28.55): 'sing',
    (77.89, 79.77): 'laugh',
    (80.32, 82.50): 'laugh',
    (83.09, 85.22): 'laugh',
    (19.12, 19.84): 'whee',
    (85.80, 89.13): 'whee',
}
MAX_TALK = 8.0
# Enough variety without a huge download: the rest of the talk is cut.
CAP = {'talk': 14, 'story': 1, 'sing-long': 1, 'laugh-long': 2}


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


def segments(x, gap=0.3):
    hop = SR // 100
    n = len(x) // hop
    db = 20 * np.log10(np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)
    on = db > -72
    out, i = [], 0
    while i < n:
        if not on[i]:
            i += 1
            continue
        j = last = i
        while j < n and (on[j] or j - last < gap * 100):
            if on[j]:
                last = j
            j += 1
        out.append((i / 100, (last + 1) / 100))
        i = j
    return out


def envelope(y):
    hop = SR // 50
    n = max(1, len(y) // hop)
    db = 20 * np.log10(np.sqrt((y[: n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)
    return ''.join(str(int(v)) for v in np.clip((db + 50) / 34 * 9, 0, 9))


def demotor(x):
    """The video with its motor taken out: spectral subtraction, the noise
    profile taken where the motor whirrs (loud above 8 kHz) but no one talks."""
    n, hop = 1024, 256
    win = np.hanning(n)
    S = np.fft.rfft(np.array([x[i:i + n] * win for i in range(0, len(x) - n, hop)]), axis=1)
    mag = np.abs(S)
    f = np.fft.rfftfreq(n, 1 / SR)
    hi = mag[:, f > 8000].mean(1) if SR > 16000 else mag[:, f > 6000].mean(1)
    voice = mag[:, (f > 300) & (f < 3000)].mean(1)
    motor_only = (hi > np.percentile(hi, 60)) & (voice < np.percentile(voice, 35))
    noise = mag[motor_only].mean(0)
    gain = np.maximum(1 - 2.0 * noise / np.maximum(mag, 1e-9), 0.05)
    # The voice chip has little up there; what's left is motor speckle.
    gain[:, f > 7000] *= 0.15
    y, norm = np.zeros(len(x)), np.zeros(len(x))
    for k, frame in enumerate(np.fft.irfft(S * gain, n=n, axis=1)):
        y[k * hop:k * hop + n] += frame * win
        norm[k * hop:k * hop + n] += win * win
    return (y / np.maximum(norm, 1e-3)).astype(np.float32)


def main():
    args = sys.argv[1:]
    library = video = None
    if '--library' in args:
        i = args.index('--library')
        library = args[i + 1]
        del args[i:i + 2]
    if '--video' in args:
        i = args.index('--video')
        video = args[i + 1]
        del args[i:i + 2]
    *rips, outdir = args
    os.makedirs(outdir, exist_ok=True)
    kept, pieces, seen = [], [], []
    cursor = 0.0
    pad = np.zeros(int(SR * 0.15), dtype=np.float32)
    for r, path in enumerate(rips, start=1):
        x = load(path)
        for k, (a, b) in enumerate(segments(x)):
            dur = b - a
            if dur < 0.4:
                continue
            tag = TAGS.get(f'{r}:{k}')
            if not tag:
                if dur > MAX_TALK:
                    continue
                tag = 'chirp' if dur < 2.0 else 'talk'
            y = x[int(max(0, a - 0.02) * SR): int((b + 0.03) * SR)].copy()
            env = envelope(y)
            if any(abs(len(env) - len(s)) <= 2 and env[:40] == s[:40] for s in seen):
                continue
            seen.append(env)
            if sum(1 for c in kept if c['tag'] == tag) >= CAP.get(tag, 99):
                continue
            fade = min(len(y), int(SR * 0.01))
            y[:fade] *= np.linspace(0, 1, fade)
            y[-fade:] *= np.linspace(1, 0, fade)
            kept.append({'id': f'r{r}-{k:02d}', 'tag': tag, 'start': round(cursor, 3), 'dur': round(len(y) / SR, 3), 'env': env})
            pieces += [y, pad]
            cursor += (len(y) + len(pad)) / SR
    if library:
        for name in sorted(os.listdir(library)):
            stem, ext = os.path.splitext(name)
            if ext.lower() != '.wav' or stem in LIBRARY_SKIP or stem.endswith('_distorted'):
                continue
            y = load(os.path.join(library, name))
            on = np.where(np.abs(y) > 0.01)[0]
            if not len(on):
                continue
            y = y[max(0, on[0] - 200): on[-1] + 400].copy()
            tag = LIBRARY.get(stem) or ('talk' if len(y) < 4 * SR else None)
            if not tag:
                continue
            y *= 0.8 / max(1e-6, np.abs(y).max())
            fade = min(len(y), int(SR * 0.01))
            y[:fade] *= np.linspace(0, 1, fade)
            y[-fade:] *= np.linspace(1, 0, fade)
            kept.append({'id': stem, 'tag': tag, 'start': round(cursor, 3), 'dur': round(len(y) / SR, 3), 'env': envelope(y)})
            pieces += [y, pad]
            cursor += (len(y) + len(pad)) / SR
    if video:
        x = demotor(load(video))
        for (a, b), tag in VIDEO.items():
            y = x[int((a - 0.03) * SR): int((b + 0.05) * SR)].copy()
            y *= 0.8 / max(1e-6, np.abs(y).max())
            fade = min(len(y), int(SR * 0.01))
            y[:fade] *= np.linspace(0, 1, fade)
            y[-fade:] *= np.linspace(1, 0, fade)
            kept.append({'id': f'v-{a:05.1f}', 'tag': tag, 'start': round(cursor, 3), 'dur': round(len(y) / SR, 3), 'env': envelope(y)})
            pieces += [y, pad]
            cursor += (len(y) + len(pad)) / SR
    sprite = np.concatenate(pieces)
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        with wave.open(tmp.name, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((np.clip(sprite, -1, 1) * 32767).astype(np.int16).tobytes())
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-codec:a', 'libmp3lame', '-b:a', '40k', os.path.join(outdir, 'furby.mp3')], check=True)
    json.dump({'clips': kept}, open(os.path.join(outdir, 'furby.json'), 'w'), separators=(',', ':'))
    tags = {}
    for c in kept:
        tags[c['tag']] = tags.get(c['tag'], 0) + 1
    print(f'{len(kept)} clips, {cursor:.0f} s', tags)


main()
