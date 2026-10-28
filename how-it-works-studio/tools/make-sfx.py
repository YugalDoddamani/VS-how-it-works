#!/usr/bin/env python3
"""
make-sfx.py - synthesise the reel's sound effects.

Every cue is generated from maths rather than downloaded, so the sound design
lives in the repo as code: no licence, no binary blobs, no "which file was
that?" and the whole set rebuilds in a second. The cues are deliberately short
and quiet - they mark an event on screen, they are not music.

Output: assets/sfx/*.wav, 44.1 kHz mono 16-bit.

Usage:
    python3 tools/make-sfx.py
    python3 tools/make-sfx.py --report
"""

from __future__ import annotations

import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SFX = ROOT / "assets" / "sfx"
RATE = 44100
RNG = np.random.default_rng(20261028)   # fixed seed: the cues are byte-stable


def env(n: int, attack: float = 0.004, decay: float = 0.25, power: float = 2.0) -> np.ndarray:
    """A simple attack/decay envelope, in seconds."""
    a = max(1, int(attack * RATE))
    d = max(1, int(decay * RATE))
    out = np.zeros(n)
    out[:a] = np.linspace(0, 1, a)
    tail = min(d, n - a)
    if tail > 0:
        out[a:a + tail] = np.linspace(1, 0, tail) ** power
    return out


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    """One-pole low-pass. Cheap, and the phase smear is what makes it sound natural."""
    alpha = 1 - np.exp(-2 * np.pi * cutoff / RATE)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        y[i] = acc
    return y


def highpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    return x - lowpass(x, cutoff)


def noise(n: int) -> np.ndarray:
    return RNG.standard_normal(n)


def norm(x: np.ndarray, peak: float = 0.85) -> np.ndarray:
    m = float(np.max(np.abs(x))) or 1.0
    return x * (peak / m)


def sweep_noise(dur: float, f0: float, f1: float, curve: float = 1.0) -> np.ndarray:
    """Band-passed noise whose centre frequency moves - a whoosh, in one line."""
    n = int(dur * RATE)
    src = noise(n)
    out = np.zeros(n)
    # three overlapping bands, stepped, so the move reads instead of smearing
    steps = 24
    for s in range(steps):
        t = s / (steps - 1)
        f = f0 * (f1 / f0) ** (t ** curve)
        a = int(t * (n - 1))
        b = min(n, a + n // steps + 64)
        band = highpass(lowpass(src[a:b], f * 1.6), max(120.0, f * 0.5))
        w = np.hanning(len(band))
        out[a:b] += band * w
    return out


# ---------------------------------------------------------------------------
# the cue set
# ---------------------------------------------------------------------------

def c_whoosh() -> np.ndarray:
    x = sweep_noise(0.26, 380, 2400)
    return norm(x * env(len(x), 0.01, 0.25, 1.6), 0.55)


def c_swipe() -> np.ndarray:
    x = sweep_noise(0.18, 900, 2600)
    return norm(x * env(len(x), 0.004, 0.16, 2.0), 0.45)


def c_pop() -> np.ndarray:
    n = int(0.13 * RATE)
    t = np.arange(n) / RATE
    body = np.sin(2 * np.pi * (520 + 900 * np.exp(-t * 40)) * t)
    click = highpass(noise(n), 4000) * np.exp(-t * 90)
    return norm((body * 0.8 + click * 0.35) * env(n, 0.002, 0.12, 2.2), 0.6)


def c_click() -> np.ndarray:
    n = int(0.07 * RATE)
    t = np.arange(n) / RATE
    x = highpass(noise(n), 2500) * np.exp(-t * 120)
    x += np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 160) * 0.5
    return norm(x, 0.5)


def c_tick() -> np.ndarray:
    n = int(0.035 * RATE)
    t = np.arange(n) / RATE
    return norm(highpass(noise(n), 6000) * np.exp(-t * 260), 0.35)


def c_thud() -> np.ndarray:
    n = int(0.34 * RATE)
    t = np.arange(n) / RATE
    body = np.sin(2 * np.pi * (96 * np.exp(-t * 6) + 44) * t)
    slap = lowpass(noise(n), 900) * np.exp(-t * 45) * 0.5
    return norm((body + slap) * env(n, 0.003, 0.32, 2.4), 0.8)


def c_paper() -> np.ndarray:
    n = int(0.38 * RATE)
    t = np.arange(n) / RATE
    x = highpass(noise(n), 2200) * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * t))
    return norm(x * env(n, 0.02, 0.35, 1.4), 0.4)


def c_riser() -> np.ndarray:
    n = int(0.55 * RATE)
    t = np.arange(n) / RATE
    f = 220 * (2 ** (t / 0.55 * 2.2))
    x = np.sin(2 * np.pi * np.cumsum(f) / RATE) * 0.6
    x += sweep_noise(0.55, 600, 5200) * 0.5
    return norm(x * env(n, 0.06, 0.5, 1.2), 0.5)


def c_chime() -> np.ndarray:
    n = int(1.1 * RATE)
    t = np.arange(n) / RATE
    x = np.zeros(n)
    for f, a, d in ((880.0, 0.5, 2.4), (1320.0, 0.35, 3.2), (1760.0, 0.22, 4.0)):
        x += np.sin(2 * np.pi * f * t) * np.exp(-t * d) * a
    return norm(x * env(n, 0.004, 1.05, 1.6), 0.55)


def c_warm() -> np.ndarray:
    """A soft low pad under the sign-off - the reel's only 'music'."""
    n = int(1.6 * RATE)
    t = np.arange(n) / RATE
    x = np.zeros(n)
    for f, a in ((196.0, 0.5), (294.0, 0.3), (392.0, 0.2)):
        x += np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 0.7 * t)) * a
    return norm(x * env(n, 0.25, 1.3, 1.3), 0.4)


CUES = {
    'whoosh': c_whoosh,
    'swipe': c_swipe,
    'pop': c_pop,
    'click': c_click,
    'tick': c_tick,
    'thud': c_thud,
    'paper': c_paper,
    'riser': c_riser,
    'chime': c_chime,
    'warm': c_warm,
}


def write_wav(path: Path, x: np.ndarray) -> None:
    data = np.clip(x, -1, 1)
    pcm = (data * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


def main() -> int:
    report = '--report' in sys.argv
    SFX.mkdir(parents=True, exist_ok=True)
    for name, fn in CUES.items():
        x = fn()
        print(f"  {name:<8} {len(x) / RATE:4.2f}s")
        if not report:
            write_wav(SFX / f'{name}.wav', x)
    if report:
        print('report only — nothing written')
    else:
        print(f"wrote {len(CUES)} cues to assets/sfx/")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
