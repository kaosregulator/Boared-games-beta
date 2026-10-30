"""
Builds the hologram voices: every time capsule read aloud, once per voice,
as a short old-transmission recording in public/voice/<voice>/<card>.mp3.

    python scripts/voice/build_voices.py [--only crt-tv,nes] [--voices transmission]

Each recording is: a few droid beeps, a burst of static, (sometimes) a ship
computer line, the card read by a neural voice (Piper), then static and a
click off. The voice is pitched, slowed, squeezed through a radio band and
given a little echo, according to the profile below. Only the card's own words
(scripts/voice/narration.json) are ever spoken.

A card is rebuilt only when its words or its profile change (the hash in
public/voice/manifest.json). Runs in the hologram-voices workflow: the voice
models come from Hugging Face (rhasspy/piper-voices).
"""

import argparse
import hashlib
import json
import math
import random
import struct
import subprocess
import sys
import tempfile
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "voice"
MODELS = ROOT / ".voice-models"
SFX = Path(__file__).resolve().parent / "sfx"
HF = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en"

# The three voices. Bump "v" to rebuild every card for a profile.
PROFILES = {
    # An older man, calm and a little mysterious, over a crackly radio.
    "transmission": {
        "v": 1,
        "model": "en_GB/alan/medium/en_GB-alan-medium",
        "length": 1.14,  # about 0.88x speed
        "pitch": 0.93,  # a little lower
        "band": (280, 3200),
        "echo": "aecho=0.85:0.55:45|95:0.22|0.12",
        "extra": "acrusher=bits=11:mode=log:aa=1:mix=0.35",
        "hiss": 0.012,
        "intro": None,
        "seed": 1,
    },
    # A recorded hologram plea from far away: brighter, flickering in and out.
    "message": {
        "v": 1,
        "model": "en_US/lessac/medium/en_US-lessac-medium",
        "length": 1.06,
        "pitch": 1.0,
        "band": (360, 3600),
        "echo": "aecho=0.8:0.5:28|61:0.25|0.14",
        "extra": "tremolo=f=6.5:d=0.16,vibrato=f=4.5:d=0.025",
        "hiss": 0.016,
        "intro": None,
        "seed": 2,
    },
    # The starship talking: crisp, a little robotic, with a doubled metallic edge.
    "computer": {
        "v": 1,
        "model": "en_US/amy/medium/en_US-amy-medium",
        "length": 1.0,
        "pitch": 0.98,
        "band": (200, 5200),
        "echo": "aecho=0.7:0.45:70:0.2",
        "extra": "chorus=0.6:0.8:20|32:0.35|0.28:0.3|0.45:1.6|1.1,acrusher=bits=10:mode=log:aa=1:mix=0.25",
        "hiss": 0.006,
        "intro": "processing-female.wav",
        "seed": 3,
    },
}

RATE = 22050


def run(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def fetch_model(model: str) -> Path:
    MODELS.mkdir(exist_ok=True)
    onnx = MODELS / (Path(model).name + ".onnx")
    for path, url in ((onnx, f"{HF}/{model}.onnx"), (Path(f"{onnx}.json"), f"{HF}/{model}.onnx.json")):
        if not path.exists():
            print("downloading", url, flush=True)
            urllib.request.urlretrieve(url, path)
    return onnx


def beeps(path: Path, seed: int):
    """A few quick droid chirps, different for each voice but the same every time."""
    rnd = random.Random(seed)
    samples = []
    for _ in range(5):
        n = int(RATE * (0.05 + rnd.random() * 0.06))
        f0 = 900 + rnd.random() * 1600
        f1 = f0 * (0.6 + rnd.random() * 0.9)
        phase = 0.0
        for i in range(n):
            # A sine sweeping f0 -> f1, with a quick fade in and out.
            phase += 2 * math.pi * (f0 + (f1 - f0) * i / n) / RATE
            env = min(1.0, i / (RATE * 0.006), (n - i) / (RATE * 0.012))
            samples.append(0.32 * env * math.sin(phase))
        samples += [0.0] * int(RATE * (0.015 + rnd.random() * 0.03))
    samples += [0.0] * int(RATE * 0.05)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(RATE)
        wf.writeframes(struct.pack(f"<{len(samples)}h", *(int(x * 32767) for x in samples)))


def click(path: Path):
    """The click off: a short, sharp pop."""
    n = int(RATE * 0.12)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(RATE)
        wf.writeframes(struct.pack(f"<{n}h", *(int(16000 * math.exp(-i / RATE * 90) * math.sin(2 * math.pi * 180 * i / RATE)) for i in range(n))))


def static(path: Path, seconds: float, seed: int, loud: float):
    """Radio static: band-limited noise with a crackle, fading out."""
    run(
        [
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", f"anoisesrc=d={seconds}:c=pink:r={RATE}:a={loud}:seed={seed}",
            "-af", f"highpass=f=500,lowpass=f=4200,afade=t=in:d=0.04,afade=t=out:st={seconds * 0.45:.2f}:d={seconds * 0.55:.2f}",
            "-ac", "1", str(path),
        ]
    )


def radio(src: Path, dst: Path, p: dict):
    """Pitch, then the radio band, the profile's colour, echo and a level squeeze."""
    lo, hi = p["band"]
    chain = [
        f"asetrate={RATE}*{p['pitch']}", f"aresample={RATE}", f"atempo={1 / p['pitch']:.4f}",
        f"highpass=f={lo}", f"highpass=f={lo}", f"lowpass=f={hi}", f"lowpass=f={hi}",
        "acompressor=threshold=-20dB:ratio=5:attack=5:release=80:makeup=3",
        p["extra"], p["echo"],
        "alimiter=limit=0.89",
    ]
    run(["ffmpeg", "-y", "-i", str(src), "-af", ",".join(c for c in chain if c), "-ac", "1", "-ar", str(RATE), str(dst)])


def build(card: str, text: str, name: str, p: dict, voice, tmp: Path) -> float:
    from piper import SynthesisConfig

    raw = tmp / "raw.wav"
    with wave.open(str(raw), "wb") as wf:
        voice.synthesize_wav(text, wf, syn_config=SynthesisConfig(length_scale=p["length"], noise_scale=0.6, noise_w_scale=0.75))
    # Piper's own rate may differ; bring it to ours first.
    raw22 = tmp / "raw22.wav"
    run(["ffmpeg", "-y", "-i", str(raw), "-ac", "1", "-ar", str(RATE), str(raw22)])
    spoken = tmp / "spoken.wav"
    radio(raw22, spoken, p)

    pieces = [tmp / "beeps.wav", tmp / "static-in.wav"]
    if p["intro"]:
        intro = tmp / "intro.wav"
        radio(SFX / p["intro"], intro, p)
        pieces += [intro, tmp / "gap.wav"]
    pieces += [spoken, tmp / "static-out.wav", tmp / "click.wav"]

    # Hiss under everything, the "vintage" bed.
    joined = tmp / "joined.wav"
    with open(tmp / "list.txt", "w") as f:
        for piece in pieces:
            f.write(f"file '{piece}'\n")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"), "-ac", "1", "-ar", str(RATE), str(joined)])
    seconds = float(
        subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(joined)],
            check=True, capture_output=True, text=True,
        ).stdout
    )
    dst = OUT / name / f"{card}.mp3"
    dst.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg", "-y", "-i", str(joined),
            "-f", "lavfi", "-i", f"anoisesrc=d={seconds:.2f}:c=brown:r={RATE}:a={p['hiss']}:seed={p['seed']}",
            "-filter_complex", "[1]highpass=f=900,lowpass=f=5000[h];[0][h]amix=inputs=2:duration=first:normalize=0,volume=5dB,alimiter=limit=0.95,aresample=16000",
            "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "20k", str(dst),
        ]
    )
    return round(seconds, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--voices", default=",".join(PROFILES))
    args = ap.parse_args()

    from piper import PiperVoice

    texts = json.loads((Path(__file__).resolve().parent / "narration.json").read_text())
    only = set(filter(None, args.only.split(",")))
    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}

    for name in args.voices.split(","):
        p = PROFILES[name]
        voice = PiperVoice.load(str(fetch_model(p["model"])))
        entries = manifest.setdefault(name, {})
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            beeps(tmp / "beeps.wav", p["seed"])
            static(tmp / "static-in.wav", 0.7, p["seed"], 0.22)
            static(tmp / "static-out.wav", 0.55, p["seed"] + 7, 0.18)
            run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={RATE}:cl=mono", "-t", "0.25", str(tmp / "gap.wav")])
            # The click off: a short, sharp pop.
            click(tmp / "click.wav")
            for card, text in texts.items():
                if only and card not in only:
                    continue
                digest = hashlib.sha1(json.dumps([text, p], sort_keys=True).encode()).hexdigest()[:12]
                have = entries.get(card)
                if have and have.get("hash") == digest and (OUT / name / have["file"]).exists():
                    continue
                seconds = build(card, text, name, p, voice, tmp)
                entries[card] = {"file": f"{card}.mp3", "seconds": seconds, "hash": digest}
                print(name, card, seconds, flush=True)
                manifest_path.parent.mkdir(parents=True, exist_ok=True)
                manifest_path.write_text(json.dumps(manifest, indent=1, sort_keys=True) + "\n")
        # Cards that no longer exist.
        for card in [c for c in entries if c not in texts]:
            (OUT / name / entries[card]["file"]).unlink(missing_ok=True)
            del entries[card]
    manifest_path.write_text(json.dumps(manifest, indent=1, sort_keys=True) + "\n")


if __name__ == "__main__":
    sys.exit(main())
