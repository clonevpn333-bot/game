# HOMO CURIOSUS — origin: procedural score + SFX, every hit on a cue from pf/src/timeline.js.
# D dorian, 120 bpm. Music ducks under the narration (word timings from vo/assets/timing.json).
import json, os, re, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, '..', '_shared', 'tools'))
from sfxlib import *  # noqa

TOTAL = 28.0
N = int(TOTAL * SR)
B = 0.5
R = np.random.default_rng(42)
VO = json.load(open(os.path.join(ROOT, 'vo', 'assets', 'timing.json')))


def kick(f0=120, d=0.4):
    return sweep_sine(f0, 40, d, 0.25) * expdec(int(d * SR), 0.14)


def snare(d=0.25):
    return bp(noise(d), 1500, 7000) * expdec(int(d * SR), 0.06) + sweep_sine(240, 170, d, 0.5) * expdec(int(d * SR), 0.03) * 0.5


def hat(d=0.05):
    return hp(noise(d), 7500) * expdec(int(d * SR), 0.012)


def drip():
    s = np.zeros(int(0.6 * SR))
    place(s, sweep_sine(1800, 900, 0.05, 0.6) * expdec(int(0.05 * SR), 0.012), 0, 0.8)
    place(s, sweep_sine(1300, 2400, 0.08, 1.5) * expdec(int(0.08 * SR), 0.03), 0.02, 0.4)
    return reverb(s, 2.5, 0.6)


def drone(f, d):
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * k * t + R.random() * 6) * (1 + 0.15 * np.sin(2 * np.pi * 0.2 * t + k)) for k, a in [(1, 1), (2, 0.35), (3, 0.15), (1.5, 0.2)])
    return lp(s, 600) * adsr(len(t), 0.8, d, 1, 0.8)


def kalimba(f, d=0.9):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 5) + 0.3 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 18)
    return s * adsr(len(t), 0.002, d, 1, 0.05)


def glock(f, d=1.2):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)) * np.exp(-t * 3.2)


def gong(f=110, d=3.0):
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * dec) for m, a, dec in [(1, 1, 0.9), (1.47, 0.6, 1.3), (2.09, 0.5, 1.6), (2.76, 0.35, 2.2), (3.9, 0.2, 3)])
    return s * adsr(len(t), 0.004, d, 1, 0.2)


def tock():
    d = 0.08
    return bp(noise(d), 900, 3000) * expdec(int(d * SR), 0.01) + sweep_sine(900, 600, d, 0.5) * expdec(int(d * SR), 0.008)


def breath(d=1.4):
    n = int(d * SR)
    x = bp(noise(d), 600, 5000)
    env = np.sin(np.linspace(0, np.pi, n)) ** 0.7 * (0.8 + 0.2 * np.sin(np.linspace(0, 20, n)))
    return x * env


def engine(d):
    t = tt(d)
    f = 22 + 4 * np.sin(2 * np.pi * 0.7 * t)
    ph = np.cumsum(f) / SR
    pulses = (np.sin(2 * np.pi * ph) > 0.7).astype(float)
    return lp(pulses * noise(d) * 0.8 + pulses * 0.4, 1200) * adsr(len(t), 0.05, d, 1, 0.2)


def wind(d):
    n = int(d * SR)
    x = bp(noise(d), 300, 2000)
    return x * (0.6 + 0.4 * np.sin(np.linspace(0, 7, n))) * adsr(n, 0.3, d, 1, 0.4)


def strings(fs, d):
    t = tt(d)
    s = np.zeros(len(t))
    for f in fs:
        for det in (-0.3, 0, 0.3):
            ph = f * (1 + det / 100) * t + 0.004 * np.sin(2 * np.pi * 5 * t)
            s += 2 * (ph % 1) - 1
    return lp(s / (len(fs) * 3), 2000) * adsr(len(t), 0.4, d, 1, 0.8)


def sub_drop(d=1.2):
    return sweep_sine(90, 28, d, 0.6) * adsr(int(d * SR), 0.01, d, 1, 0.5)


def build_music():
    m = np.zeros(N + 4 * SR)
    P = lambda s, at, g=1.0: place(m, s, at, g)
    D, F, G, A, C, E = 50, 53, 55, 57, 60, 52  # D dorian
    # Act I: cave. drone, heartbeat toms, drips
    P(drone(mtof(38), 6.0), 0.0, 0.6)
    for i, at in enumerate(np.arange(0.5, 5.6, 1.0)):
        P(kick(80, 0.5), at, 0.5)
        P(kick(70, 0.4), at + 0.22, 0.3)
    # Act II: curiosity motif on kalimba from the stencil reveal; it climbs with each invention
    motif = [62, 65, 69, 67, 64, 62, 69, 72]
    for i, at in enumerate(np.arange(5.75, 16.0, 0.25)):
        if i % 2 == 1 and R.random() < 0.35:
            continue
        n = motif[i % 8] + (0 if at < 11 else 2 if at < 13.75 else 5)
        P(kalimba(mtof(n), 0.8), at, 0.16)
    P(pad([mtof(n) for n in (D, A, C + 2, F + 12)], 5.4) * 0.5, 5.75)
    P(pad([mtof(n) for n in (C - 12 + 12, G, C + 4, E + 12)], 5.0) * 0.45, 11.0)
    for i, at in enumerate(np.arange(8.25, 16.0, 0.5)):
        P(kick(110, 0.35), at, 0.55 if i % 2 == 0 else 0.35)
        P(hat(), at + 0.25, 0.25)
        if i % 4 == 2:
            P(snare(), at, 0.3)
    for at in np.arange(11.0, 13.75, 0.125):
        P(tock(), at, 0.22)  # clockwork escapement
    # Act III: the pull-back. strings swell, sub drop, rising Droste arpeggio
    P(strings([mtof(n) for n in (D - 12, A - 12, D, F)], 2.9), 16.0, 0.55)
    P(sub_drop(1.6), 16.0, 0.9)
    arp = [62, 65, 69, 72, 74, 77, 81, 84]
    for i, at in enumerate(np.arange(18.75, 21.0, 0.125)):
        P(glock(mtof(arp[i % 8] + (i // 8) * 2), 0.6), at, 0.1 + 0.08 * i / 18)
    P(strings([mtof(n) for n in (A - 12, E, A, C + 12)], 2.4), 18.75, 0.4)
    # Act IV: the name. full warm chord, then a gentle resolution that loops
    P(strings([mtof(n) for n in (D - 12, A - 12, D, F + 12 - 12 + 4, A)], 3.0), 21.75, 0.7)  # D major lift (F#)
    P(pad([mtof(n) for n in (D, 54, A, D + 12)], 3.0) * 0.6, 21.75)
    for i, at in enumerate(np.arange(21.75, 24.25, 0.25)):
        P(kalimba(mtof([74, 78, 81, 86][i % 4]), 0.9), at, 0.15)
        if i % 2 == 0:
            P(kick(110, 0.35), at, 0.5)
    P(pad([mtof(n) for n in (D, A, 54 + 12, D + 12)], 3.8) * 0.55, 24.25)
    for i, n in enumerate([74, 69, 66, 62]):
        P(glock(mtof(n), 1.6), 24.75 + i * 0.5, 0.14)
    m = reverb(m[:N], 2.2, 0.3)
    t = np.arange(N) / SR
    # duck under every spoken word (−7 dB), with fast attack / slower release
    duck = np.ones(N)
    for line in VO['lines']:
        for w in line['words']:
            a, b = int((w['s'] - 0.05) * SR), int((w['e'] + 0.08) * SR)
            duck[max(0, a):min(N, b)] = 0.45
    k = int(0.06 * SR)
    duck = np.convolve(duck, np.ones(k) / k, mode='same')
    ride = np.interp(t, [0, 0.4, 5.5, 5.75, 15.9, 16.0, 21.6, 21.75, 27.0, 28.0], [0, 0.8, 0.8, 1, 1, 1.1, 1, 1.15, 1, 0.6])
    return m * duck * ride


def build_sfx():
    s = np.zeros(N + 3 * SR)
    P = lambda x, at, g=1.0: place(s, x, at, g)
    P(drip(), 0.05, 0.6); P(drip(), 1.3, 0.35)
    P(crackle(2.6), 0.0, 0.12)  # torch
    P(thud(70), 2.25, 0.9); P(hiss(0.5), 2.27, 0.15)  # press
    P(whoosh(0.3, 200, 3000), 2.62, 0.3)
    P(breath(1.5), 3.45, 0.55); P(spray(1.4), 3.5, 0.35)  # breath + ochre
    P(pop(900, 0.06), 5.0, 0.4); P(sparkle(0.8, 10, 3), 5.0, 0.25)  # lift
    P(ding(2093, 0.8), 5.25, 0.3)  # ignite
    P(pluck_bass(mtof(38), 0.6), 5.75, 0.5)
    P(sweep_sine(300, 1200, 0.5, 2.0) * adsr(int(0.5 * SR), 0.05, 0.5, 1, 0.1), 6.375, 0.12)  # curl
    P(glock(mtof(86), 1.4), 7.0, 0.35); P(clink(2600), 7.0, 0.2)  # dot
    P(whoosh(0.25, 800, 5000), 8.1, 0.25)
    for i, at in enumerate([8.75, 9.25, 9.75, 10.25]):
        P(glock(mtof([74, 77, 81, 84][i]), 1.0), at, 0.3)
    P(lock(), 10.5, 0.6); P(ding(1568, 1.2), 10.5, 0.25)
    P(tock(), 11.0, 0.8); P(boom(), 11.0, 0.25)
    P(chop(), 11.875, 0.6); P(lock(), 11.875, 0.5)  # gear engages
    P(gong(98, 2.6), 13.25, 0.45)  # bronze
    P(wind(2.3), 13.75, 0.35); P(engine(2.0), 13.8, 0.4)
    P(whoosh(0.8, 150, 2500), 14.45, 0.45)  # liftoff
    P(sweep_sine(400, 1600, 0.45, 1.6) * adsr(int(0.45 * SR), 0.03, 0.45, 1, 0.1), 15.4, 0.14)  # flew
    P(whoosh(1.4, 80, 4000)[::-1], 14.65, 0.35); P(whoosh(1.6, 80, 4000, up=False), 16.0, 0.45)
    P(boom(), 16.0, 0.5)
    P(riser(1.2), 17.05, 0.25)
    P(ding(1318, 1.6), 18.25, 0.35); P(sparkle(1.0, 12, 5), 18.25, 0.2)  # moon
    P(whoosh(0.3, 600, 4000), 18.7, 0.25)
    P(riser(0.75), 18.75, 0.25); P(riser(0.75), 19.5, 0.3); P(riser(0.75), 20.25, 0.35)
    P(stamp(), 21.0, 0.5); P(boom(), 21.0, 0.45); P(crash := bp(noise(1.6), 3000, 12000) * expdec(int(1.6 * SR), 0.5), 21.0, 0.25)
    P(whoosh(0.5, 300, 3000), 21.4, 0.3)
    P(shing(0.8, 2400), 22.5, 0.3); P(kick(130, 0.4), 22.5, 0.6)  # HOMO
    P(shing(1.0, 3000), 23.125, 0.35); P(crash, 23.125, 0.25); P(boom(), 23.125, 0.35)  # CURIOSUS
    P(sparkle(1.2, 14, 7), 23.95, 0.25)
    P(pluck_bass(mtof(38), 1.0), 24.25, 0.5)
    P(ding(1760, 1.6), 24.75, 0.25)  # curious
    P(crackle(3.5), 24.25, 0.1)
    P(drip(), 27.5, 0.55)  # matches the opening: the film loops
    return reverb(s[:N], 1.4, 0.2)


if __name__ == '__main__':
    mus = build_music()
    sfx = build_sfx()
    mix = mus * 0.55 + sfx * 0.75
    mix = np.tanh(mix / max(1e-9, np.abs(mix).max()) * 1.4) * 0.75
    fade = np.ones(N); fade[-int(0.5 * SR):] = np.linspace(1, 0.4, int(0.5 * SR))
    out = os.path.join(ROOT, 'remotion', 'public', 'score.wav')
    sf.write(out, (mix * fade).astype(np.float32), SR)
    print('wrote', out, round(N / SR, 2), 's')
