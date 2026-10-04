# WHY WE WONDER ep.3: pipe-and-tabor dance that turns frantic, then dread, then a warm outro.
# D dorian, 120 bpm. Music ducks under the narration (word timings from vo/assets/timing.json).
import json, os, re, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, '..', '_shared', 'tools'))
from sfxlib import *  # noqa

TOTAL = 40.0
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




def pipe(f, d, vib=0.004):
    t = tt(d)
    ph = f * t + vib * np.sin(2 * np.pi * 5.5 * t) * f / 5.5
    s = np.sin(2 * np.pi * ph) + 0.35 * np.sin(4 * np.pi * ph) + 0.12 * np.sin(6 * np.pi * ph)
    breath = bp(noise(d), f, f * 4) * 0.08
    return (s * 0.6 + breath) * adsr(len(t), 0.03, d, 0.85, 0.06)


def tabor(d=0.25):
    return sweep_sine(160, 90, d, 0.4) * expdec(int(d * SR), 0.06) + bp(noise(d), 1200, 5000) * expdec(int(d * SR), 0.03) * 0.5


TUNE = [62, 64, 65, 67, 69, 67, 65, 64, 62, 60, 62, 64, 65, 64, 62, 57]


def build_music():
    m = np.zeros(N + 4 * SR)
    P = lambda s, at, g=1.0: place(m, s, at, g)
    # a lone pipe in the street (the dance before anyone joins)
    tempo = lambda at: 0.25 if at < 15.0 else 0.25 * (1 - 0.35 * min(1, (at - 15.0) / 6.0))
    at, i = 0.6, 0
    while at < 21.25:
        d = tempo(at)
        if at > 6.9 or i % 2 == 0:
            P(pipe(mtof(TUNE[i % 16] + (12 if at > 19.5 else 0)), d * 0.95), at, 0.16 + 0.1 * min(1, at / 15))
        if i % 2 == 0 and at > 7.0:
            P(tabor(), at, 0.35 + 0.25 * min(1, max(0, (at - 15) / 5)))
        if at > 15.0 and i % 4 == 0:
            P(kick(80, 0.3), at, 0.5)
        at += d
        i += 1
    P(drone(mtof(38), 21.5), 0.0, 0.35)
    # ergot: woozy detuned pad
    P(strings([mtof(n) for n in (50, 53.3, 57, 60.6)], 5.8), 21.25, 0.35)
    # fear: dark drone, slow heartbeat toms
    P(drone(mtof(33), 6.0), 27.0, 0.6)
    for k, a in enumerate(np.arange(27.2, 32.7, 0.9)):
        P(kick(55, 0.4), a, 0.5); P(kick(50, 0.35), a + 0.22, 0.3)
    # the mind: one pipe phrase returns, slow
    for k, n in enumerate([62, 65, 69, 67]):
        P(pipe(mtof(n), 0.6), 32.9 + k * 0.6, 0.18)
    # outro: warm lift
    P(pad([mtof(n) for n in (50, 54, 57, 62)], 4.2) * 0.6, 35.8)
    for k, n in enumerate([74, 78, 81, 86, 81, 78]):
        P(kalimba(mtof(n), 0.9), 37.7 + k * 0.22, 0.16)
    m = reverb(m[:N], 2.0, 0.28)
    t = np.arange(N) / SR
    duck = np.ones(N)
    for line in VO['lines']:
        for w in line['words']:
            a, b = int((w['s'] - 0.05) * SR), int((w['e'] + 0.08) * SR)
            duck[max(0, a):min(N, b)] = 0.5
    k = int(0.06 * SR)
    duck = np.convolve(duck, np.ones(k) / k, mode='same')
    ride = np.interp(t, [0, 0.06, 19.5, 21.2, 21.4, 39.0, 40.0], [0, 0.8, 1.0, 1.15, 0.9, 1, 0])
    return m * duck * ride


def build_sfx():
    s = np.zeros(N + 3 * SR)
    P = lambda x, at, g=1.0: place(s, x, at, g)
    for a, g in ((1.33, 0.7), (2.86, 0.5), (3.57, 0.45), (4.38, 0.75)):
        P(stamp(), a, g); P(boom(), a, 0.12 + 0.1 * (a > 4))  # hook type stamped
    for k, a in enumerate(np.arange(0.25, 4.4, 0.152)):
        P(stamp(), a, 0.04 + 0.05 * k / 27)  # crowd stamped in
    for k in range(4):
        P(thud(150), 5.85 + k * 0.22, 0.2)  # footsteps on cobbles
    P(boing(0.4, 180), 7.05, 0.3)  # the first step of the dance
    P(chop(), 7.86, 0.4); P(chop(), 8.02, 0.4)  # notes struck out
    for k in range(5):
        P(tick(), 8.5 + k * 0.2, 0.4)  # days ticking
    for k, a in enumerate(np.arange(10.0, 14.3, 0.18)):
        P(stamp(), a, 0.05 + 0.1 * k / 24)  # dancers stamped in
    P(ding(1568, 0.8), 14.05, 0.25)
    for k in range(9):
        P(thud(120 + k * 5), 17.6 + k * 0.067, 0.3)  # planks
    P(whoosh(0.5, 300, 4000), 19.5, 0.4); P(riser(1.4), 19.6, 0.35)
    P(boom(), 21.25, 0.4)
    P(pop(500, 0.08), 22.45, 0.35)  # microscope PiP
    P(sweep_sine(300, 1200, 1.5, 0.6) * adsr(int(1.5 * SR), 0.2, 1.5, 1, 0.3) * 0.4, 25.2, 0.25)  # woozy
    for a in (28.85, 29.55, 31.4):
        P(stamp(), a, 0.5); P(boom(), a, 0.2)
    P(sub_drop(1.0), 31.45, 0.5)
    P(sparkle(0.8, 10, 5), 33.0, 0.2)
    P(boing(0.4, 220), 35.18, 0.3)  # the involuntary hop
    P(sparkle(1.0, 12, 7), 37.6, 0.2)
    P(ding(2093, 1.0), 39.1, 0.2)
    return reverb(s[:N], 1.3, 0.2)


if __name__ == '__main__':
    mus = build_music()
    sfx = build_sfx()
    mix = mus * 0.6 + sfx * 0.8
    mix = np.tanh(mix / max(1e-9, np.abs(mix).max()) * 1.4) * 0.75
    out = os.path.join(ROOT, 'remotion', 'public', 'score.wav')
    sf.write(out, mix.astype(np.float32), SR)
    print('wrote', out, round(N / SR, 2), 's')
