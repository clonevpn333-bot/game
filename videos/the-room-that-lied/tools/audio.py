# Noir music + SFX for "The Room That Lied" (procedural, seeded).
import json, os, sys
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "..", "_shared", "tools"))
from sfxlib import *  # noqa

T = json.load(open(f"{ROOT}/assets/timing.json"))
TOTAL = T["total"]
N = int(TOTAL * SR)
R = np.random.default_rng(21)
BPMN = 92
B = 60 / BPMN


def upright(f, d=0.5):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6) + 0.2 * np.sin(6 * np.pi * f * t) * np.exp(-t * 10)
    thump = lp(noise(0.03), 400) * expdec(int(0.03 * SR), 0.008)
    s[: len(thump)] += thump * 0.6
    return s * np.exp(-t * 3.2) * adsr(len(t), 0.006, d, 1, 0.05)


def vibe(f, d=1.4):
    t = tt(d)
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * 5.5 * t)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 1.6) + 0.3 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 6)
    return s * trem * adsr(len(t), 0.004, d, 1, 0.1)


def brush(acc=1.0):
    d = 0.22
    return bp(noise(d), 2500, 9000) * adsr(int(d * SR), 0.02, 0.2, 0, 0) * acc


def ride():
    d = 0.5
    t = tt(d)
    s = sum(np.sin(2 * np.pi * f * t + R.random() * 6) for f in (3100, 4270, 5330, 6810))
    return hp(s + noise(d) * 0.5, 3000) * np.exp(-t * 9)


def piano(fs, d=1.2):
    t = tt(d)
    s = np.zeros(len(t))
    for f in fs:
        for k, a in [(1, 1), (2, 0.4), (3, 0.2), (4, 0.1)]:
            s += a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (2.5 + k))
    return s / len(fs)


def drone(f, d):
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * k * t + R.random() * 6) for k, a in [(1, 1), (2, 0.4), (3.01, 0.2)])
    return lp(s, 1200) * adsr(len(t), 0.5, d, 1, 0.6)


def sting(fs, d=2.0):
    return piano(fs, d) * 1.4 + drone(fs[0] / 2, d) * 0.3


def typewriter(n=12, gap=0.06):
    s = np.zeros(int((n * gap + 0.3) * SR))
    for i in range(n):
        place(s, bp(noise(0.02), 1500, 7000) * expdec(int(0.02 * SR), 0.004), i * gap + R.random() * 0.01, 0.9)
    place(s, ding(2600, 0.5), n * gap + 0.05, 0.4)
    return s


def footsteps(at0, n, gap, s, g=0.3):
    for i in range(n):
        place(s, lp(noise(0.06), 900) * expdec(int(0.06 * SR), 0.015), at0 + i * gap, g)


def creak_door(d=0.8):
    t = tt(d)
    f = 300 + 180 * np.sin(2 * np.pi * 1.3 * t) + 40 * np.sin(2 * np.pi * 17 * t)
    ph = np.cumsum(f) / SR
    return norm(bp(2 * (ph % 1) - 1, 400, 3000) * adsr(len(t), 0.05, d, 1, 0.2), 0.5)


def glass_break():
    s = np.zeros(int(1.2 * SR))
    for i in range(16):
        place(s, clink(2000 + R.random() * 4000), R.random() * 0.25, 0.5 + R.random() * 0.5)
    place(s, crackle(0.5), 0, 0.6)
    return norm(s, 0.9)


def freeze_hit():
    s = np.zeros(int(2.5 * SR))
    place(s, boom(), 0, 0.9)
    place(s, crackle(1.2), 0.0, 0.6)
    t = tt(2.0)
    shim = sum(np.sin(2 * np.pi * f * t) for f in (1760, 2217, 2637, 3520)) * np.exp(-t * 1.5)
    place(s, shim * 0.2, 0.02, 1)
    return norm(s, 1.0)


def build_sfx():
    s = np.zeros(N + 3 * SR)
    P = lambda sig, at, g=1.0: place(s, sig, at, g)
    P(whoosh(1.2, 100, 1500), 0.0, 0.35)
    P(sting([mtof(50), mtof(53), mtof(57)], 2.5), 0.15, 0.4)
    P(typewriter(14), 5.6, 0.4)
    P(creak_door(0.8), 5.6, 0.4)
    footsteps(6.2, 14, 0.18, s, 0.25)
    for at in (7.9, 9.25, 10.05):
        P(pop(480), at, 0.3)
    P(creak_door(0.6), 10.6, 0.3)
    P(thud(110), 11.2, 0.4)
    footsteps(12.0, 12, 0.19, s, 0.22)
    P(creak_door(0.7), 11.7, 0.3)
    P(thud(120), 14.75, 0.5)
    P(lock(), 15.0, 0.55)
    P(typewriter(8), 16.3, 0.35)
    P(creak_door(0.9), 16.3, 0.35)
    P(whoosh(0.7, 300, 3000), 19.2, 0.35)
    P(glass_break(), 20.95, 0.4)
    P(stamp(), 21.05, 0.55)
    P(whoosh(0.6, 400, 2500, up=False), 22.3, 0.3)
    P(stamp(), 25.55, 0.7)
    P(riser(0.8), 25.9, 0.35)
    P(freeze_hit(), 26.7, 0.9)
    P(whoosh(1.4, 80, 1200), 26.95, 0.4)
    P(whoosh(0.6, 400, 5000), 28.9, 0.45)
    P(pop(520), 29.05, 0.35)
    P(whoosh(0.4, 600, 4000), 29.85, 0.3)
    P(pop(440), 30.08, 0.35)
    P(whoosh(0.4, 600, 4000), 30.9, 0.3)
    P(pop(380), 31.15, 0.35)
    P(buzz(), 32.4, 0.25)
    P(whoosh(1.0, 100, 1500), 33.9, 0.35)
    footsteps(34.2, 60, 0.19, s, 0.15)
    for at in (37.9, 41.4, 44.88):
        P(glass_break(), at, 0.8)
        P(stamp(), at, 0.35)
    P(whoosh(0.6, 300, 3000), 45.3, 0.35)
    for i in range(30):
        P(tick(), 46.8 + i * 0.087, 0.4)
    P(ding(1320, 1.0), 49.4, 0.3)
    P(riser(0.6), 49.9, 0.3)
    for i in range(14):
        P(tick(), 50.4 + i * 0.085, 0.5)
    P(stamp(), 50.65, 0.6)
    P(spray(3.4), 52.0, 0.15)
    P(pop(600), 53.4, 0.3)
    P(sting([mtof(49), mtof(52), mtof(56)], 1.6), 55.4, 0.35)
    P(pop(520), 56.75, 0.3)
    P(sting([mtof(50), mtof(53), mtof(56)], 2.0), 60.25, 0.55)
    P(riser(0.7), 60.6, 0.4)
    P(whoosh(0.5, 300, 6000), 61.15, 0.5)
    for i in range(10):
        P(tick(), 61.6 + i * 0.14, 0.4)
    P(glass_break(), 64.72, 0.7)
    P(stamp(), 66.2, 0.75)
    P(sting([mtof(50), mtof(57), mtof(62), mtof(65)], 2.5), 66.25, 0.45)
    s = reverb(s[:N], 1.2, 0.18)
    return norm(s, 0.9)


# Dm7 Gm7 Em7b5 A7
PROG = [(38, [62, 65, 69, 72]), (43, [62, 65, 67, 70]), (40, [62, 64, 67, 70]), (45, [61, 64, 67, 69])]
WALK = [[0, 3, 5, 7], [0, 2, 3, 5], [0, 3, 6, 7], [0, 4, 7, 8]]


def build_music():
    m = np.zeros(N + 4 * SR)
    bar = 4 * B
    nb = int(TOTAL / bar) + 1
    for b in range(nb):
        t0 = b * bar
        root, chord = PROG[b % 4]
        freeze = 26.6 < t0 + bar and t0 < 34.0
        for i, iv in enumerate(WALK[b % 4]):
            at = t0 + i * B
            if not (26.6 <= at < 34.0) and at < 66.2:
                place(m, upright(mtof(root - 12 + iv) * 2 / 2), at, 0.55)
        for i in range(4):
            at = t0 + i * B
            if not (26.6 <= at < 34.0) and at < 66.2:
                place(m, ride(), at, 0.08)
                place(m, ride(), at + B * 0.66, 0.05)
                if i % 2:
                    place(m, brush(), at, 0.18)
        if not freeze and t0 < 66:
            place(m, vibe(mtof(chord[0] + 12), 2.4), t0, 0.07)
            for k, n in enumerate(chord):
                place(m, vibe(mtof(n), 2.4), t0 + 0.02 * k, 0.08)
            if b % 2:
                place(m, piano([mtof(n) for n in chord], 1.0), t0 + 2.5 * B, 0.12)
    # frozen-room drone (suspended)
    place(m, drone(mtof(38), 7.6) * 0.6, 26.6)
    place(m, drone(mtof(45), 7.6) * 0.3, 26.6)
    m = reverb(m[:N], 2.0, 0.25)
    t = np.arange(N) / SR
    g = np.interp(t, [0, 0.4, 66.2, 66.6, TOTAL - 0.5, TOTAL], [0, 1, 1, 0.5, 0.5, 0])
    return norm(m * g, 0.8)


if __name__ == "__main__":
    sf.write(f"{ROOT}/assets/audio/sfx.wav", build_sfx(), SR)
    sf.write(f"{ROOT}/assets/audio/music.wav", build_music(), SR)
    print("ok", TOTAL)
