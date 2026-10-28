#!/usr/bin/env python3
"""
make-sfx.py - synthesise the sound-effect kit, so the repo needs no sample pack.

Ten cues, each a few hundred milliseconds, each built from the same handful of
generators: a sine with a pitch curve, white noise through a moving band, and an
envelope. That is enough for everything a paper-and-ink explainer needs - a click
when a card lands, a whoosh on a cut, a thud when the stamp comes down - and it
means the soundtrack can be rebuilt byte for byte on any machine.

Mono, 44.1 kHz, 16-bit, normalised to -3 dBFS so the mixer can decide the level.

Usage:
    python3 tools/make-sfx.py             # write assets/sfx/*.wav
    python3 tools/make-sfx.py --list      # names only
"""

from __future__ import annotations

import math
import struct
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "sfx"
RATE = 44100


# ---------------------------------------------------------------------------
# generators
# ---------------------------------------------------------------------------

def env(n: int, attack: float, decay: float, power: float = 1.0) -> np.ndarray:
    """Attack/decay envelope, in seconds, as a 0..1 array of length n."""
    t = np.arange(n) / RATE
    a = np.clip(t / max(1e-4, attack), 0, 1)
    d = np.exp(-np.clip(t - attack, 0, None) / max(1e-4, decay))
    return (a * d) ** power


def sine(n: int, f0: float, f1: float | None = None, curve: float = 1.0) -> np.ndarray:
    """A sine whose frequency glides from f0 to f1."""
    f1 = f0 if f1 is None else f1
    t = np.arange(n) / RATE
    phase = 2 * math.pi * (f0 + (f1 - f0) * (t / max(1e-6, t[-1] if n > 1 else 1)) ** curve) * t
    return np.sin(phase)


def noise(n: int, seed: int = 7) -> np.ndarray:
    return np.random.default_rng(seed).uniform(-1, 1, n)


def onepole_lp(x: np.ndarray, cutoff: float) -> np.ndarray:
    """One-pole low-pass, applied as a running average - good enough for texture."""
    a = math.exp(-2 * math.pi * cutoff / RATE)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def lp(x: np.ndarray, cutoff: float) -> np.ndarray:
    """Fast low-pass: FFT brick-wall with a soft edge. Cheaper than a loop."""
    spectrum = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / RATE)
    edge = np.clip((cutoff - freqs) / max(1.0, cutoff * 0.35), 0, 1)
    return np.fft.irfft(spectrum * edge, n=len(x))


def hp(x: np.ndarray, cutoff: float) -> np.ndarray:
    spectrum = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / RATE)
    edge = np.clip((freqs - cutoff) / max(1.0, cutoff * 0.35), 0, 1)
    return np.fft.irfft(spectrum * edge, n=len(x))


def band(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return hp(lp(x, hi), lo)


def normalize(x: np.ndarray, peak: float = 0.707) -> np.ndarray:
    m = float(np.max(np.abs(x))) or 1.0
    return x / m * peak


def fade_tail(x: np.ndarray, ms: float = 12) -> np.ndarray:
    n = min(len(x), int(RATE * ms / 1000))
    if n:
        x[-n:] *= np.linspace(1, 0, n)
    return x


# ---------------------------------------------------------------------------
# the kit
# ---------------------------------------------------------------------------

def cue_whoosh() -> np.ndarray:
    """A cut: filtered noise that sweeps past the camera."""
    n = int(RATE * 0.34)
    t = np.linspace(0, 1, n)
    nz = noise(n, 3)
    # a moving band: close and bright in the middle of the sweep
    lo = band(nz, 300, 5200) * (0.4 + 0.6 * np.sin(np.pi * t) ** 2)
    body = lp(nz, 700) * 0.35 * np.sin(np.pi * t)
    return normalize(fade_tail(lo + body), 0.55)


def cue_pop() -> np.ndarray:
    """A card landing on the page."""
    n = int(RATE * 0.13)
    tone = sine(n, 620, 300, 0.6) * env(n, 0.002, 0.035, 1.4)
    click = band(noise(n, 11), 1500, 8000) * env(n, 0.0005, 0.006)
    return normalize(fade_tail(tone + 0.5 * click), 0.6)


def cue_click() -> np.ndarray:
    """A small mechanism: a switch, a toggle, a checkbox."""
    n = int(RATE * 0.075)
    tick = band(noise(n, 5), 1800, 9000) * env(n, 0.0004, 0.004)
    ping = sine(n, 1850, 1400, 1.0) * env(n, 0.0006, 0.012) * 0.5
    return normalize(fade_tail(tick + ping), 0.55)


def cue_thud() -> np.ndarray:
    """The stamp coming down."""
    n = int(RATE * 0.3)
    low = sine(n, 110, 62, 1.6) * env(n, 0.001, 0.075, 1.2)
    slap = lp(noise(n, 21), 1800) * env(n, 0.0008, 0.02) * 0.7
    return normalize(fade_tail(low + slap), 0.75)


def cue_tick() -> np.ndarray:
    """A line of text arriving."""
    n = int(RATE * 0.05)
    return normalize(fade_tail(band(noise(n, 31), 2600, 11000) * env(n, 0.0003, 0.0035)), 0.4)


def cue_swipe() -> np.ndarray:
    """A thumb scrolling a feed."""
    n = int(RATE * 0.26)
    t = np.linspace(0, 1, n)
    nz = noise(n, 9)
    sweep = band(nz, 900, 7000) * np.sin(np.pi * t) ** 1.5
    return normalize(fade_tail(sweep, 20), 0.5)


def cue_paper() -> np.ndarray:
    """A page or a note opened."""
    n = int(RATE * 0.42)
    t = np.linspace(0, 1, n)
    nz = noise(n, 13)
    rustle = band(nz, 1200, 6500) * (0.55 + 0.45 * np.sin(np.pi * t * 3) ** 2)
    return normalize(fade_tail(rustle * np.sin(np.pi * t) ** 0.6, 30), 0.5)


def cue_riser() -> np.ndarray:
    """A reveal coming: a slow rise into the next beat."""
    n = int(RATE * 0.62)
    t = np.linspace(0, 1, n)
    tone = sine(n, 180, 980, 1.8) * (t ** 1.6) * 0.6
    air = band(noise(n, 17), 800, 6000) * (t ** 2.4) * 0.4
    return normalize(fade_tail(tone + air, 40), 0.5)


def cue_chime() -> np.ndarray:
    """The sign-off: two soft partials, left ringing."""
    n = int(RATE * 0.95)
    a = sine(n, 884) * env(n, 0.004, 0.26)
    b = sine(n, 1326) * env(n, 0.004, 0.18) * 0.55
    c = sine(n, 442) * env(n, 0.004, 0.34) * 0.35
    return normalize(fade_tail(a + b + c, 60), 0.45)


def cue_warm() -> np.ndarray:
    """A low, warm pad under the last line."""
    n = int(RATE * 1.5)
    out = np.zeros(n)
    for f, amp in ((196, 0.5), (247, 0.35), (294, 0.28), (392, 0.14)):
        out += sine(n, f) * amp
    return normalize(fade_tail(out * env(n, 0.12, 0.85), 120), 0.4)


KIT = {
    "whoosh": cue_whoosh,
    "pop": cue_pop,
    "click": cue_click,
    "thud": cue_thud,
    "tick": cue_tick,
    "swipe": cue_swipe,
    "paper": cue_paper,
    "riser": cue_riser,
    "chime": cue_chime,
    "warm": cue_warm,
}


# ---------------------------------------------------------------------------

def write_wav(path: Path, samples: np.ndarray) -> None:
    data = np.clip(samples, -1, 1)
    pcm = (data * 32767).astype("<i2").tobytes()
    with wave.open(str(path), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(pcm)


def main() -> None:
    if "--list" in sys.argv:
        print("\n".join(sorted(KIT)))
        return
    OUT.mkdir(parents=True, exist_ok=True)
    for name in sorted(KIT):
        samples = KIT[name]()
        path = OUT / f"{name}.wav"
        write_wav(path, samples)
        print(f"  {path.relative_to(ROOT)}  {len(samples) / RATE:.2f}s")
    print(f"\n{len(KIT)} cues written to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
