# Music + SFX for "Falling into a black hole" (procedural, seeded).
import json, os, sys
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "..", "_shared", "tools"))
from sfxlib import *  # noqa

T = json.load(open(f"{ROOT}/assets/timing.json"))
TOTAL = T["total"]
N = int(TOTAL * SR)
R = np.random.default_rng(11)


def drone(f, d, det=0.3):
    t = tt(d)
    s = np.zeros(len(t))
    for k, a in [(1, 1), (2, 0.5), (3, 0.25), (1.5, 0.3)]:
        for dd in (-det, det):
            s += a * np.sin(2 * np.pi * f * k * (1 + dd / 100) * t + R.random() * 6)
    return lp(s, 900)


def shimmer(f, d):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * f * m * t) * (0.5 + 0.5 * np.sin(2 * np.pi * (0.3 + i * 0.17) * t)) for i, m in enumerate([1, 1.5, 2, 3]))
    return s * adsr(len(t), 0.8, d, 1, 0.8)


def heartbeat():
    s = np.zeros(int(0.9 * SR))
    place(s, sweep_sine(70, 40, 0.18, 0.4) * expdec(int(0.18 * SR), 0.05), 0, 1)
    place(s, sweep_sine(65, 38, 0.16, 0.4) * expdec(int(0.16 * SR), 0.05), 0.22, 0.7)
    return s


def creak(d=1.4):
    t = tt(d)
    f = 120 + 260 * (t / d) ** 1.5 + 18 * np.sin(2 * np.pi * 7 * t)
    ph = np.cumsum(f) / SR
    saw = 2 * (ph % 1) - 1
    return norm(bp(saw, 200, 2500) * adsr(len(t), 0.05, d, 1, 0.2) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t)), 0.6)


def tear():
    s = np.zeros(int(1.2 * SR))
    place(s, crackle(0.6), 0, 0.8)
    place(s, whoosh(0.9, 200, 6000), 0.05, 0.9)
    place(s, boom(), 0.0, 0.7)
    return norm(s, 0.9)


def build_sfx():
    s = np.zeros(N + 2 * SR)
    P = lambda sig, at, g=1.0: place(s, sig, at, g)
    P(whoosh(1.6, 80, 1200), 0.0, 0.5)
    P(boom(), 3.75, 0.45)
    P(sparkle(1.2, 14, 3), 3.8, 0.25)
    P(whoosh(1.4, 100, 900, up=False), 4.6, 0.4)
    P(riser(1.0), 6.3, 0.25)
    P(sparkle(0.9, 10, 5), 9.55, 0.3)
    for i in range(4):  # the watch: slow, normal ticks
        P(tick(), 11.6 + i * 1.0, 0.9)
        P(clink(1800), 11.6 + i * 1.0, 0.12)
    P(pop(500), 15.75, 0.35)
    for i in range(140):  # Earth's clock racing
        at = 16.6 + i * (8.3 / 140) * (1 - 0.4 * i / 140)
        P(tick(), at, 0.35)
    P(riser(0.8), 19.6, 0.35)
    P(whoosh(0.7, 300, 3000), 24.5, 0.4)
    P(boing(0.5, 120), 25.5, 0.3)
    P(whoosh(3.5, 60, 700), 25.6, 0.55)
    for i in range(8):
        P(heartbeat(), 26.0 + i * 0.85 * (1 - i * 0.05), 0.55)
    P(creak(2.6), 29.6, 0.45)
    P(pop(260), 31.6, 0.3)
    P(riser(1.0), 33.9, 0.45)
    P(tear(), 35.0, 0.9)
    P(whoosh(0.5, 400, 4000), 36.4, 0.35)
    for i in range(7):
        P(clink(1200 + 150 * i), 37.9 + i * 0.08, 0.2)
    P(whoosh(2.0, 100, 2000), 41.7, 0.4)
    P(buzz(), 44.15, 0.2)
    P(sparkle(0.8, 6, 7), 49.2, 0.25)
    P(boom(), 50.95, 0.9)
    P(squish(), 53.5, 0.35)
    P(squish(), 53.62, 0.25)
    s = reverb(s[:N], 2.2, 0.3)
    return norm(s, 0.9)


def build_music():
    m = np.zeros(N + 6 * SR)
    # D minor-ish drone bed that swells with the fall, then drops away
    place(m, drone(mtof(38), 26) * 0.5, 0.0)
    place(m, drone(mtof(36), 26) * 0.5, 25.0)
    for i, (at, n) in enumerate([(0, 74), (4.6, 77), (10.6, 81), (15.0, 79), (20.0, 84), (35.0, 86), (41.0, 82)]):
        place(m, shimmer(mtof(n), 7.0) * 0.12, at)
    # soft bell arpeggio while hovering / watching the future
    notes = [62, 65, 69, 72, 74, 72, 69, 65]
    for i in range(int((25.0 - 10.6) / 0.42)):
        at = 10.6 + i * 0.42
        place(m, marimba(mtof(notes[i % 8] + 12), 1.2, 0.5) * 0.12, at)
    # sub rumble rising during the fall
    t = np.arange(N) / SR
    sub = np.sin(2 * np.pi * (34 + 8 * np.clip((t - 25) / 10, 0, 1)) * t) * np.clip((t - 25) / 8, 0, 1) * (t < 51.0)
    m[:N] += sub * 0.35
    # inside reality: pulsing synth pad
    place(m, pad([mtof(n) for n in (50, 57, 62, 65)], 16.0) * 0.5, 35.1)
    m = reverb(m[:N], 3.0, 0.35)
    g = np.interp(t, [0, 0.6, 50.8, 51.0, 52.0, TOTAL], [0, 1, 1, 0.0, 0.0, 0.0])
    # a last faint drone under the blinking eye
    tail = drone(mtof(26), TOTAL - 51.6) * 0.25
    m = m * g
    place(m, tail * adsr(len(tail), 1.0, 1, 1, 0.8), 51.6)
    return norm(m, 0.8)


if __name__ == "__main__":
    sf.write(f"{ROOT}/assets/audio/sfx.wav", build_sfx(), SR)
    sf.write(f"{ROOT}/assets/audio/music.wav", build_music(), SR)
    print("ok", TOTAL)
