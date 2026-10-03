# Era-evolving score + SFX for the HOMO CURIOSUS trailer (procedural, seeded).
# The music changes instrument with each visual era: drums of the cave → harpsichord → lute
# → ragtime piano → chiptune → orchestral swell → title hit.
import json, os, sys
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "..", "_shared", "tools"))
from sfxlib import *  # noqa

T = json.load(open(f"{ROOT}/assets/timing.json"))
TOTAL = T["total"]
N = int(TOTAL * SR)
R = np.random.default_rng(5)
ERA = [0.0, 5.1, 6.9, 9.6, 11.3, 13.0, 15.45, 17.5, 23.1]


def tom(f=110, d=0.5):
    return sweep_sine(f * 1.6, f, d, 0.3) * expdec(int(d * SR), 0.12)


def drone(f, d):
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * k * t + R.random() * 6) for k, a in [(1, 1), (2, 0.4), (3, 0.2), (1.5, 0.25)])
    return lp(s, 700) * adsr(len(t), 0.6, d, 1, 0.4)


def harpsi(f, d=0.6):
    t = tt(d)
    s = sum((1 / k) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (3 + k * 1.5)) for k in range(1, 9))
    return hp(s, 150) * adsr(len(t), 0.002, d, 1, 0.05)


def lute(f, d=0.8):
    t = tt(d)
    s = sum((1 / k ** 1.3) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (2.5 + k)) for k in range(1, 7))
    return s * adsr(len(t), 0.003, d, 1, 0.05)


def piano(f, d=0.5):
    t = tt(d)
    s = sum((0.8 / k) * np.sin(2 * np.pi * f * k * (1 + 0.0007 * k) * t) * np.exp(-t * (4 + k * 2)) for k in range(1, 7))
    return lp(s, 3500) * adsr(len(t), 0.002, d, 1, 0.05)


def square(f, d, duty=0.5, vol=1.0):
    t = tt(d)
    s = np.where((f * t) % 1 < duty, 1.0, -1.0)
    return s * adsr(len(t), 0.002, d, 0.8, 0.02) * vol


def chip_noise(d):
    n = int(d * SR)
    x = np.repeat(R.uniform(-1, 1, n // 40 + 1), 40)[:n]
    return x * expdec(n, 0.03)


def blip(f0, f1, d=0.12):
    t = tt(d)
    f = np.geomspace(f0, f1, len(t))
    ph = np.cumsum(f) / SR
    return np.where(ph % 1 < 0.5, 1.0, -1.0) * adsr(len(t), 0.002, d, 0.7, 0.02)


def strings(fs, d):
    t = tt(d)
    s = np.zeros(len(t))
    for f in fs:
        for det in (-0.25, 0, 0.25):
            ph = f * (1 + det / 100) * t + 0.003 * np.sin(2 * np.pi * 5.5 * t)
            s += 2 * (ph % 1) - 1
    return lp(s / (len(fs) * 3), 2200) * adsr(len(t), 0.25, d, 1, 0.5)


def scratch(d=0.25):
    n = int(d * SR)
    x = bp(noise(d), 2500, 7000) * (0.5 + 0.5 * np.sin(2 * np.pi * 22 * np.arange(n) / SR)) ** 2
    return x * adsr(n, 0.01, d, 1, 0.05)


def projector(d):
    s = np.zeros(int(d * SR) + SR)
    for i in range(int(d * 24)):
        place(s, hp(noise(0.012), 2000) * expdec(int(0.012 * SR), 0.003), i / 24, 0.4 if i % 2 else 0.25)
    return s


def build_music():
    m = np.zeros(N + 4 * SR)
    P = lambda sig, at, g=1.0: place(m, sig, at, g)
    # A · cave: low drone + heartbeat toms
    P(drone(mtof(33), 5.4), 0.0, 0.5)
    for i, at in enumerate(np.arange(0.3, 5.0, 0.6)):
        P(tom(70 if i % 2 == 0 else 95, 0.6), at, 0.7 if i % 2 == 0 else 0.45)
    # B · star chart: harpsichord arpeggio in D minor
    arp = [62, 65, 69, 74, 77, 74, 69, 65]
    for i, at in enumerate(np.arange(5.1, 6.9, 0.15)):
        P(harpsi(mtof(arp[i % 8])), at, 0.35)
    P(harpsi(mtof(50), 1.6), 5.1, 0.4)
    # C · sketchbook: lute, Renaissance cadence
    prog = [(57, [64, 69, 72]), (55, [62, 67, 71]), (53, [60, 65, 69]), (52, [59, 64, 68])]
    for b, (root, ch) in enumerate(prog):
        t0 = 6.9 + b * 0.675
        P(lute(mtof(root - 12), 1.0), t0, 0.5)
        for k, n in enumerate(ch + ch[::-1]):
            P(lute(mtof(n), 0.5), t0 + k * 0.1125, 0.22)
    # D · film: ragtime piano (oom-pah), slightly detuned
    beat = 60 / 150
    bassn = [43, 50, 43, 50]
    chords = [[59, 62, 67], [59, 62, 67], [60, 64, 67], [59, 62, 67]]
    for i in range(int((11.3 - 9.6) / beat) + 1):
        at = 9.6 + i * beat
        P(piano(mtof(bassn[i % 4]), 0.4), at, 0.55)
        for n in chords[i % 4]:
            P(piano(mtof(n), 0.25), at + beat / 2, 0.22)
    mel = [74, 76, 74, 71, 72, 74, 79, 78, 79]
    for i, n in enumerate(mel):
        P(piano(mtof(n), 0.3), 9.6 + i * beat / 2 + (beat / 4 if i % 2 else 0), 0.3)
    # E · 8-bit: square arps + noise hat
    sq = [57, 60, 64, 69, 64, 60]
    for i, at in enumerate(np.arange(11.3, 13.0, 1 / 12)):
        P(square(mtof(sq[i % 6] + 12), 0.07, 0.25), at, 0.12)
    for i, at in enumerate(np.arange(11.3, 13.0, 0.2125)):
        P(square(mtof(33 if (i // 4) % 2 == 0 else 36), 0.18, 0.5), at, 0.18)
        P(chip_noise(0.05), at + 0.106, 0.15)
    # F · cel-shaded 3D: big drums + strings
    for i, at in enumerate(np.arange(13.0, 15.45, 0.306)):
        P(tom(55, 0.7), at, 0.9 if i % 2 == 0 else 0.5)
        if i % 2:
            P(bp(noise(0.25), 1500, 7000) * expdec(int(0.25 * SR), 0.06), at, 0.3)
    P(strings([mtof(n) for n in (50, 57, 62, 65)], 1.25), 13.0, 0.5)
    P(strings([mtof(n) for n in (48, 55, 60, 64)], 1.3), 14.2, 0.5)
    # G · questions: stop-time hits only (silence between words) — handled in SFX
    # H · the spark: warm pad grows, celesta arpeggio
    P(pad([mtof(n) for n in (50, 57, 62, 66)], 6.0) * 0.6, 17.5)
    cel = [74, 78, 81, 86, 81, 78]
    for i, at in enumerate(np.arange(17.6, 23.0, 0.225)):
        P(marimba(mtof(cel[i % 6] + (5 if at > 20.25 else 0)), 0.8, 0.5), at, 0.12 + 0.1 * (at - 17.6) / 5.4)
    for i, at in enumerate(np.arange(20.25, 23.0, 0.45)):
        P(tom(60, 0.5), at, 0.5)
    # I · title: full chord, everything together
    P(strings([mtof(n) for n in (43, 50, 55, 59, 62, 67)], TOTAL - 23.1), 23.1, 0.7)
    P(pad([mtof(n) for n in (55, 62, 67, 71)], TOTAL - 23.1) * 0.5, 23.1)
    for i, at in enumerate(np.arange(23.1, TOTAL - 1.0, 0.28)):
        P(harpsi(mtof([67, 71, 74, 79][i % 4]), 0.5), at, 0.12)
        if i % 4 == 0:
            P(tom(55, 0.7), at, 0.6)
    m = reverb(m[:N], 1.8, 0.25)
    t = np.arange(N) / SR
    g = np.interp(t, [0, 0.3, 15.4, 15.5, 17.4, 17.55, TOTAL - 1.5, TOTAL], [0, 1, 1, 0.12, 0.12, 1, 1, 0])
    return norm(m * g, 0.85)


def build_sfx():
    s = np.zeros(N + 2 * SR)
    P = lambda sig, at, g=1.0: place(s, sig, at, g)
    # cave
    P(crackle(5.0), 0.0, 0.18)  # torch
    P(spray(1.4), 2.55, 0.5)
    P(thud(70), 2.77, 0.6)  # hand pressed to the wall
    P(boom(), 3.47, 0.35)
    for at in (0.4, 0.75, 1.1):
        P(whoosh(0.3, 200, 1500), at, 0.15)  # brush strokes
    # transitions, each in its era's voice
    P(whoosh(0.5, 150, 2500), 4.9, 0.35)
    P(sparkle(1.0, 12, 4), 5.3, 0.35)
    P(shing(0.8, 2600), 6.3, 0.2)
    P(whoosh(0.25, 800, 5000), 6.82, 0.3)  # page flip
    for i in range(10):
        P(scratch(0.18 + 0.1 * (i % 3)), 7.0 + i * 0.19, 0.22)  # quill
    for i in range(5):
        P(whoosh(0.18, 300, 2000), 9.08 + i * 0.39, 0.2)  # wing flaps
    P(crackle(0.6), 9.45, 0.4)  # paper burn
    P(projector(1.7), 9.6, 0.5)
    P(pop(900, 0.05), 9.62, 0.3)
    # 8-bit
    P(blip(200, 1600, 0.3), 11.45, 0.3)
    P(chip_noise(0.7), 11.5, 0.2)
    for i in range(4):
        P(blip(300 + i * 60, 250, 0.06), 12.2 + i * 0.075, 0.2)  # footsteps
    P(blip(988, 988, 0.08), 12.47, 0.25)
    P(blip(1319, 1319, 0.3), 12.55, 0.25)  # coin
    # 3D impacts
    for at in (13.0, 14.33, 14.76):
        P(stamp(), at, 0.55)
        P(boom(), at, 0.35)
        P(whoosh(0.3, 300, 6000)[::-1], max(0, at - 0.3), 0.3)
    P(riser(1.2), 14.2, 0.3)
    # the questions — each in its own medium
    P(stamp(), 15.45, 0.6)
    P(whoosh(0.3, 200, 2500), 15.6, 0.5)
    P(thud(80), 15.64, 0.7)  # WHY: brush slap
    P(shing(0.7, 2200), 15.99, 0.45)  # HOW: engraving
    P(clink(1800), 15.99, 0.3)
    P(blip(400, 1200, 0.12), 16.35, 0.4)  # WHAT: 8-bit
    P(buzz(), 16.7, 0.35)  # IF: neon hum
    P(zap(0.3), 16.71, 0.25)
    # the spark
    P(stamp(), 17.5, 0.4)
    P(whoosh(2.0, 200, 3000), 17.6, 0.25)
    P(riser(1.0), 18.7, 0.3)
    P(boom(), 19.68, 0.5)
    P(sparkle(1.4, 16, 9), 19.7, 0.4)
    for i in range(8):
        P(pop(500 + i * 90), 20.3 + i * 0.17, 0.4)
    P(riser(1.3), 21.8, 0.35)
    P(ding(1568, 1.5), 22.3, 0.3)
    # title
    P(stamp(), 23.1, 0.7)
    P(boom(), 23.1, 0.6)
    P(whoosh(0.4, 300, 6000)[::-1], 22.7, 0.4)
    for i in range(24):
        P(tick(), 23.15 + i * 0.035, 0.25)  # font slot-machine
    P(shing(1.0, 3000), 23.81, 0.3)
    P(sparkle(1.2, 12, 2), 24.8, 0.35)
    P(pop(700), 26.2, 0.5)  # subscribe click
    P(ding(2093, 1.2), 26.25, 0.25)
    s = reverb(s[:N], 1.4, 0.2)
    return norm(s, 0.9)


if __name__ == "__main__":
    sf.write(f"{ROOT}/assets/audio/sfx.wav", build_sfx(), SR)
    sf.write(f"{ROOT}/assets/audio/music.wav", build_music(), SR)
    print("ok", TOTAL)
