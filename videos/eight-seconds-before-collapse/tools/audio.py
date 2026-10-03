# Tension music + SFX for "The 8 seconds before collapse" (procedural, seeded).
import json, os, sys
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "..", "_shared", "tools"))
from sfxlib import *  # noqa
lerp = lambda a, b, k: a + (b - a) * k

T = json.load(open(f"{ROOT}/assets/timing.json"))
TOTAL = T["total"]
N = int(TOTAL * SR)
R = np.random.default_rng(31)
COLLAPSE = 34.15
BEATS = [4.81, 9.42, 13.28, 17.16, 20.36, 24.43, 28.56, 33.56]


def synth_pulse(f, d=0.2):
    t = tt(d)
    ph = f * t
    saw = 2 * (ph % 1) - 1 + 2 * ((ph * 1.005) % 1) - 1
    return lp(saw, 900) * np.exp(-t * 9) * 0.5


def metal_groan(d=1.5):
    t = tt(d)
    f = 70 + 30 * np.sin(2 * np.pi * 0.7 * t) + 8 * np.sin(2 * np.pi * 11 * t)
    ph = np.cumsum(f) / SR
    s = sum(np.sin(2 * np.pi * ph * k) / k for k in (1, 2.7, 4.1, 5.9))
    return norm(bp(s, 60, 1800) * adsr(len(t), 0.2, d, 1, 0.4), 0.7)


def snap_metal():
    s = np.zeros(int(0.8 * SR))
    place(s, shing(0.6, 1500 + R.random() * 800), 0, 0.6)
    place(s, thud(90), 0, 0.7)
    place(s, crackle(0.25), 0, 0.5)
    return norm(s, 0.9)


def rumble(d=5.0):
    n = int(d * SR)
    x = lp(noise(d), 180, 4) * np.minimum(1, np.arange(n) / SR / 0.3) * np.exp(-np.arange(n) / SR / 2.2)
    return norm(x, 1.0)


def splash():
    s = np.zeros(int(1.5 * SR))
    place(s, bp(noise(1.2), 300, 6000) * expdec(int(1.2 * SR), 0.35), 0, 1)
    place(s, thud(60), 0, 0.6)
    return norm(s, 0.8)


def heartbeat():
    s = np.zeros(int(0.9 * SR))
    place(s, sweep_sine(70, 40, 0.18, 0.4) * expdec(int(0.18 * SR), 0.05), 0, 1)
    place(s, sweep_sine(65, 38, 0.16, 0.4) * expdec(int(0.16 * SR), 0.05), 0.22, 0.7)
    return s


def birds(d=3.0):
    s = np.zeros(int(d * SR))
    for i in range(10):
        at = R.random() * (d - 0.3)
        f0 = 2500 + R.random() * 1500
        ch = sweep_sine(f0, f0 * 1.3, 0.08, 0.5) * adsr(int(0.08 * SR), 0.01, 0.07, 0, 0)
        place(s, ch, at, 0.4)
        place(s, ch, at + 0.1, 0.3)
    return s


def build_sfx():
    s = np.zeros(N + 4 * SR)
    P = lambda sig, at, g=1.0: place(s, sig, at, g)
    P(birds(4.0), 0.2, 0.25)
    P(whoosh(0.8, 200, 3000), 4.5, 0.35)
    for at in BEATS:
        P(tick(), at, 1.0)
        P(clink(1500), at, 0.25)
        P(thud(55), at, 0.35)
    P(buzz(), 5.6, 0.12)
    P(lock(), 6.6, 0.5)
    P(pop(900, 0.06), 7.85, 0.3)
    P(whoosh(0.6, 400, 5000), 9.3, 0.35)
    P(zap(0.4), 9.4, 0.15)
    P(metal_groan(1.6), 12.4, 0.35)
    for i in range(10):
        P(pop(300 + i * 40, 0.06), 13.6 + i * 0.25, 0.18)
    P(whoosh(0.6, 400, 5000, up=False), 16.85, 0.3)
    P(birds(3.0), 17.0, 0.35)
    P(whoosh(0.5, 600, 6000), 20.1, 0.35)
    P(crackle(2.8), 21.0, 0.45)
    P(metal_groan(2.0), 24.5, 0.45)
    P(stamp(), 25.6, 0.55)
    for i, at in enumerate([30.6, 31.4, 32.2, 33.0]):
        P(snap_metal(), at, 0.5)
    P(stamp(), 30.1, 0.45)
    for i in range(6):
        P(heartbeat(), 28.6 + i * 0.8, 0.5)
    P(stamp(), 33.52, 0.7)
    # COLLAPSE
    P(boom(), COLLAPSE, 1.0)
    P(rumble(5.5), COLLAPSE, 0.9)
    for i in range(14):
        P(snap_metal(), COLLAPSE + 0.05 + i * 0.18 + R.random() * 0.1, 0.55)
    P(metal_groan(2.5), COLLAPSE + 0.3, 0.6)
    for i in range(5):
        P(splash(), COLLAPSE + 1.4 + i * 0.35, 0.6)
    P(whoosh(2.5, 80, 900), COLLAPSE + 0.5, 0.5)
    P(metal_groan(1.4), 38.4, 0.25)
    for at in (39.2, 44.1, 49.4, 49.75):
        P(squish(), at, 0.18)
    P(sparkle(0.6, 6, 3), 40.3, 0.2)
    for i in range(12):
        P(tick(), 44.6 + i * 0.16, 0.35)
    P(ding(1568, 1.0), 47.8, 0.35)
    P(boing(0.5, 200), 48.4, 0.3)
    s = reverb(s[:N], 1.3, 0.18)
    return norm(s, 0.92)


def build_music():
    m = np.zeros(N + 4 * SR)
    # pulsing low ostinato that accelerates as the countdown runs
    t = 4.8
    k = 0
    notes = [38, 38, 41, 38, 43, 38, 41, 40]
    while t < 33.4:
        prog = (t - 4.8) / (33.4 - 4.8)
        step = lerp(0.32, 0.17, prog)
        place(m, synth_pulse(mtof(notes[k % 8] - 12 + (2 if t > 24 else 0)), 0.25), t, 0.55)
        if k % 2 == 0:
            place(m, synth_pulse(mtof(notes[k % 8]), 0.2), t, 0.15 + 0.15 * prog)
        t += step
        k += 1
    # string-ish swell (pad) rising into the collapse
    place(m, pad([mtof(n) for n in (50, 53, 57)], 14) * 0.5, 20.0)
    place(m, pad([mtof(n) for n in (52, 55, 59, 62)], 9) * 0.6, 25.0)
    # sunny opening + calm aftermath
    for i in range(10):
        place(m, marimba(mtof([72, 76, 79, 76][i % 4]), 0.6, 0.6) * 0.3, 0.3 + i * 0.42)
    place(m, pad([mtof(n) for n in (48, 52, 55)], 4.5) * 0.25, 0.0)
    for i in range(int((TOTAL - 38.6) / 0.5)):
        at = 38.6 + i * 0.5
        place(m, marimba(mtof([60, 64, 67, 72, 67, 64][i % 6]), 0.6, 0.5) * 0.22, at)
    place(m, pad([mtof(n) for n in (48, 52, 55)], TOTAL - 38.0) * 0.25, 38.0)
    m = reverb(m[:N], 1.8, 0.22)
    tl = np.arange(N) / SR
    g = np.interp(tl, [0, 0.3, 4.6, 4.9, 33.4, 33.5, COLLAPSE + 0.01, 38.4, 38.8, TOTAL - 0.6, TOTAL], [0, 1, 1, 0.8, 0.8, 0, 0, 0, 1, 1, 0])
    return norm(m * g, 0.8)


if __name__ == "__main__":
    sf.write(f"{ROOT}/assets/audio/sfx.wav", build_sfx(), SR)
    sf.write(f"{ROOT}/assets/audio/music.wav", build_music(), SR)
    print("ok", TOTAL)
