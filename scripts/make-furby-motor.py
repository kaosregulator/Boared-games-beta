"""
The whirr of a 1998 Furby's gearbox, synthesised, since no free recording of
one exists. Modelled on the real mechanism: one small 3 V brushed DC motor
spinning up to ~8,000 rpm, a worm gear on its shaft driving a plastic gear
train down to the cam that moves the eyes, ears, beak and body, all inside a
plastic shell under fur.

Layers: the 3-slot commutator's brush rasp (noise chopped at 3x the shaft
rate), a faint motor tone, the worm meshing (a train of tiny plastic ticks,
one per shaft turn, slightly uneven), the slow gear train's knock as the cam
turns, and a click from the cam's position switch at each end. Then a body
filter for the shell and the fur, which takes the edge off the top.

Written as one sample: spin-up | steady (loops cleanly) | spin-down, at
public/audio/furby/motor.mp3, with its section times in motor.json.

    python3 -I scripts/make-furby-motor.py public/audio/furby
"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np

SR = 22050
rng = np.random.default_rng(1998)


def onepole_lp(x, hz):
    a = np.exp(-2 * np.pi * hz / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def resonator(x, hz, decay_ms):
    # Two-pole resonance: a little plastic part ringing.
    r = np.exp(-1 / (decay_ms / 1000 * SR))
    c = 2 * r * np.cos(2 * np.pi * hz / SR)
    y = np.zeros_like(x)
    for i in range(len(x)):
        y[i] = x[i] + c * (y[i - 1] if i else 0) - r * r * (y[i - 2] if i > 1 else 0)
    return y


def tick(length, hz, decay_ms, amp):
    imp = np.zeros(length)
    imp[0] = amp
    return resonator(imp, hz, decay_ms)


def motor(speed):
    """speed: 0..1 per sample (fraction of full shaft rate)."""
    n = len(speed)
    shaft = 135.0 * speed  # rev/s at full speed
    phase = np.cumsum(shaft) / SR
    # Brushes: noise chopped at the commutator rate, bandpassed high.
    noise = rng.standard_normal(n)
    hiss = noise - onepole_lp(noise, 2500)
    chop = np.abs(np.sin(np.pi * 3 * phase)) ** 3
    brush = hiss * chop * 0.18 * speed
    # Motor tone: commutator frequency and a couple of harmonics, barely there.
    tone = sum(np.sin(2 * np.pi * 3 * k * phase) / k for k in (1, 2, 3)) * 0.05 * speed
    # Worm mesh: one soft tick per shaft turn, jittered.
    mesh = np.zeros(n)
    turns = np.floor(phase)
    edges = np.flatnonzero(np.diff(turns) > 0)
    for e in edges:
        j = min(n - 1, e + int(rng.integers(0, 6)))
        mesh[j] += 0.5 * (0.7 + 0.6 * rng.random())
    mesh = resonator(mesh, 1700, 2.5) * 0.06 + resonator(mesh, 620, 4) * 0.05
    # Slow gear train: a duller knock as the big gear's teeth pass (~1/14 of the shaft).
    slow = np.zeros(n)
    for e in np.flatnonzero(np.diff(np.floor(phase / 14)) > 0):
        slow[e] += 1
    slow = resonator(slow, 260, 18) * 0.05
    return brush + tone + mesh + slow


def main():
    out = sys.argv[1]
    up, steady, down = 0.09, 1.2, 0.16
    n_up, n_st, n_dn = int(up * SR), int(steady * SR), int(down * SR)
    speed = np.concatenate([
        np.linspace(0, 1, n_up) ** 0.6,
        1 + 0.03 * np.sin(2 * np.pi * 1.7 * np.arange(n_st) / SR),
        np.linspace(1, 0, n_dn) ** 1.6,
    ])
    y = motor(speed)
    # The cam switch: a click as it starts and as it stops.
    click = tick(1200, 2300, 3, 0.35) + tick(1200, 900, 6, 0.25)
    y[: len(click)] += click
    y[-n_dn // 2 : -n_dn // 2 + len(click)] += click[: len(y[-n_dn // 2 : -n_dn // 2 + len(click)])]
    # Shell and fur: roll off the top, keep the body.
    y = onepole_lp(onepole_lp(y, 4200), 6000)
    # Make the steady part loop without a seam: crossfade its end into its start.
    a, b = n_up, n_up + n_st
    fade = int(0.05 * SR)
    w = np.linspace(0, 1, fade)
    y[b - fade:b] = y[b - fade:b] * (1 - w) + y[a:a + fade] * w
    y /= np.abs(y).max() / 0.7
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        with wave.open(tmp.name, 'wb') as f:
            f.setnchannels(1)
            f.setsampwidth(2)
            f.setframerate(SR)
            f.writeframes((y * 32767).astype(np.int16).tobytes())
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp.name, '-codec:a', 'libmp3lame', '-b:a', '48k', os.path.join(out, 'motor.mp3')], check=True)
    json.dump({'loopStart': round(up, 4), 'loopEnd': round(up + steady - 0.05, 4), 'stopAt': round(up + steady, 4), 'end': round(up + steady + down, 4)},
              open(os.path.join(out, 'motor.json'), 'w'))
    print('wrote motor.mp3', round(len(y) / SR, 2), 's')


main()
