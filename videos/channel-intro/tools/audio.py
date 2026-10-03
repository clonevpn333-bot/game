# Trailer beat + SFX for the channel intro (procedural, seeded).
import json, os, sys
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "..", "_shared", "tools"))
from sfxlib import *  # noqa

T = json.load(open(f"{ROOT}/assets/timing.json"))
TOTAL = T["total"]
N = int(TOTAL * SR)
BPM = 140
B = 60 / BPM
IMPACTS = [0.0, 1.38, 4.39, 5.89, 7.06, 9.27, 10.56, 14.22, 15.25, 15.54, 15.84, 16.56, 17.8]


def kick():
    d = 0.45
    return sweep_sine(150, 42, d, 0.25) * expdec(int(d * SR), 0.16)


def snare():
    d = 0.3
    return bp(noise(d), 1200, 8000) * expdec(int(d * SR), 0.07) + sweep_sine(260, 180, d, 0.5) * expdec(int(d * SR), 0.04) * 0.5


def hat(open_=False):
    d = 0.18 if open_ else 0.05
    return hp(noise(d), 7000) * expdec(int(d * SR), 0.06 if open_ else 0.012)


def bass808(f, d):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t * (1 + 0.6 * np.exp(-t * 30)))
    return np.tanh(s * 1.8) * np.exp(-t * 1.6) * adsr(len(t), 0.005, d, 1, 0.05)


def stab(fs, d=0.35):
    t = tt(d)
    s = sum(2 * ((f * t) % 1) - 1 + 2 * ((f * 1.007 * t) % 1) - 1 for f in fs)
    return lp(s / len(fs), 2600) * np.exp(-t * 7)


def build_music():
    m = np.zeros(N + 2 * SR)
    bars = int(TOTAL / (4 * B)) + 1
    roots = [37, 37, 40, 35]  # C#, C#, E, B
    for b in range(bars):
        t0 = b * 4 * B
        drop = t0 >= 9.9  # pattern gets fuller once Pip arrives
        place(m, kick(), t0, 0.9)
        place(m, kick(), t0 + 2.5 * B, 0.7)
        if drop:
            place(m, kick(), t0 + 1.75 * B, 0.5)
        place(m, snare(), t0 + 2 * B, 0.55)
        for i in range(8 if not drop else 16):
            step = B / 2 if not drop else B / 4
            place(m, hat(open_=(i % 8 == 6)), t0 + i * step, 0.18)
        r = roots[b % 4]
        place(m, bass808(mtof(r - 12), 4 * B * 0.9), t0, 0.55)
        if drop:
            for k, off in enumerate([0, 0.75, 1.5, 2.5, 3.25]):
                place(m, stab([mtof(r + 12), mtof(r + 15), mtof(r + 19)]), t0 + off * B, 0.12)
    # final hit
    place(m, kick(), 17.8, 1.0)
    place(m, pad([mtof(n) for n in (49, 52, 56, 61)], 4.5) * 0.4, 17.8)
    m = reverb(m[:N], 1.2, 0.15)
    tl = np.arange(N) / SR
    g = np.interp(tl, [0, 0.05, 9.75, 9.9, 10.5, 10.56, TOTAL - 0.8, TOTAL], [0, 1, 1, 0.25, 0.25, 1, 1, 0])
    return norm(m * g, 0.85)


def build_sfx():
    s = np.zeros(N + 2 * SR)
    P = lambda sig, at, g=1.0: place(s, sig, at, g)
    for at in IMPACTS:
        P(stamp(), at, 0.5)
        P(boom(), at, 0.3)
        P(whoosh(0.3, 300, 6000)[::-1], max(0, at - 0.3), 0.3)
    for i, at in enumerate([0.12, 0.25, 0.38, 0.51]):
        P(whoosh(0.35, 500, 7000), at, 0.4)
        P(thud(90), at + 0.35, 0.5)
    for c in [3.2, 4.85, 6.95, 8.18, 9.9, 11.2, 13.5, 15.1, 17.6]:
        P(whoosh(0.4, 300, 5000), c - 0.15, 0.35)
    P(chop(), 4.39, 0.5)
    P(riser(1.0), 5.8, 0.4)
    for i in range(8):
        P(zap(0.12), 7.05 + i * 0.12, 0.15)
    P(lock(), 8.9, 0.4)
    for i in range(6):
        P(shing(0.4, 2200 + i * 200), 9.27 + i * 0.05, 0.25)
    P(riser(0.5), 10.0, 0.4)
    P(boing(0.4, 200), 10.6, 0.35)
    P(sparkle(1.0, 10, 3), 10.6, 0.3)
    P(riser(0.7), 13.5, 0.4)
    P(boom(), 14.22, 0.8)
    P(crackle(0.8), 14.22, 0.5)
    for at in (15.25, 15.54, 15.84, 16.56):
        P(pop(500), at, 0.35)
    P(ding(1568, 1.2), 17.85, 0.5)
    P(sparkle(1.2, 12, 9), 18.55, 0.35)
    s = reverb(s[:N], 1.0, 0.12)
    return norm(s, 0.9)


if __name__ == "__main__":
    sf.write(f"{ROOT}/assets/audio/music.wav", build_music(), SR)
    sf.write(f"{ROOT}/assets/audio/sfx.wav", build_sfx(), SR)
    print("ok", TOTAL)
