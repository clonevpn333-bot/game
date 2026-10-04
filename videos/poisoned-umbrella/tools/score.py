# THE POISONED UMBRELLA: procedural noir score + SFX on every story beat.
# D minor, 120 bpm. Music ducks under the narration (word timings from vo/assets/timing.json).
import json, os, re, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, '..', '_shared', 'tools'))
from sfxlib import *  # noqa

TOTAL = 42.0
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



def rain_bed(d):
    n = int(d * SR)
    x = bp(noise(d), 800, 9000) * 0.5 + lp(noise(d), 400) * 0.3
    drops = np.zeros(n)
    rr = np.random.default_rng(3)
    for at in rr.uniform(0, d, int(d * 40)):
        i = int(at * SR)
        k = min(n - i, int(0.01 * SR))
        drops[i:i + k] += rr.uniform(0.2, 1) * np.exp(-np.arange(k) / (0.002 * SR))
    return x + hp(drops, 2000) * 0.6


def build_music():
    m = np.zeros(N + 4 * SR)
    P = lambda s, at, g=1.0: place(m, s, at, g)
    P(drone(mtof(38), 15.5), 0.0, 0.55)
    P(strings([mtof(n) for n in (50, 53, 57)], 12.0), 0.0, 0.25)
    # tension pulse from the dive to the gun
    for i, at in enumerate(np.arange(15.25, 33.0, 0.25)):
        n = [38, 38, 41, 38, 36, 38, 43, 41][i % 8]
        P(pluck_bass(mtof(n), 0.3), at, 0.32)
        if i % 2 == 0:
            P(kick(70, 0.35), at, 0.35)
        if i % 4 == 2:
            P(hat(), at, 0.15)
    P(strings([mtof(n) for n in (50, 53, 57, 62)], 7.5), 15.25, 0.3)
    P(strings([mtof(n) for n in (48, 52, 55, 60)], 5.5), 22.5, 0.3)
    P(strings([mtof(n) for n in (46, 50, 53, 58)], 5.5), 27.75, 0.3)
    # the end: dark drone, then a warm major lift for the name
    P(drone(mtof(38), 4.5), 33.0, 0.5)
    P(pad([mtof(n) for n in (50, 54, 57, 62)], 3.0) * 0.6, 39.0)
    for i, n in enumerate([74, 78, 81, 86, 81, 78]):
        P(kalimba(mtof(n), 0.9), 39.2 + i * 0.24, 0.16)
    m = reverb(m[:N], 2.2, 0.3)
    t = np.arange(N) / SR
    duck = np.ones(N)
    for line in VO['lines']:
        for w in line['words']:
            a, b = int((w['s'] - 0.05) * SR), int((w['e'] + 0.08) * SR)
            duck[max(0, a):min(N, b)] = 0.45
    k = int(0.06 * SR)
    duck = np.convolve(duck, np.ones(k) / k, mode='same')
    ride = np.interp(t, [0, 0.3, 8.75, 8.8, 12.0, 12.2, 41.0, 42.0], [0, 1, 1, 0.35, 0.35, 1, 1, 0])
    return m * duck * ride


def build_sfx():
    s = np.zeros(N + 3 * SR)
    P = lambda x, at, g=1.0: place(s, x, at, g)
    rb = rain_bed(8.8)
    rb[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    P(rb, 0.0, 0.35)
    P(rain_bed(3.0) * np.linspace(0, 1, int(3.0 * SR)) * 0.6, 12.0 - 3.0, 0.0)
    P(boom(), 1.02, 0.35)
    P(whoosh(0.8, 150, 2500), 1.9, 0.45)
    P(stamp(), 3.62, 0.5)
    P(whoosh(0.25, 800, 5000), 3.3, 0.25); P(pop(900, 0.05), 3.6, 0.2)
    P(snap(), 8.71, 0.8); P(shing(0.6, 3600), 8.71, 0.45); P(zap(0.15), 8.71, 0.15)
    P(whoosh(0.5, 4000, 200, up=False)[::-1], 8.3, 0.3)
    P(sweep_sine(2000, 300, 0.4, 0.5) * expdec(int(0.4 * SR), 0.2), 8.8, 0.3)  # freeze
    P(pop(700, 0.05), 9.2, 0.3)
    for i in range(6):
        P(bp(noise(0.06), 2000, 6000) * expdec(int(0.06 * SR), 0.02), 11.55 + i * 0.05, 0.3)  # scribble
    for at in np.arange(12.1, 14.6, 0.55):
        P(np.sin(2 * np.pi * 1000 * tt(0.08)) * adsr(int(0.08 * SR), 0.005, 0.08, 1, 0.02), at, 0.12)  # monitor beep
    P(np.sin(2 * np.pi * 1000 * tt(0.64)) * adsr(int(0.64 * SR), 0.005, 0.64, 1, 0.1), 14.61, 0.12)  # flatline
    P(riser(1.2), 15.25, 0.35); P(whoosh(1.6, 60, 1200), 15.4, 0.5); P(sub_drop(1.2), 15.5, 0.6)
    for at in (15.8, 16.3, 16.8):
        P(kick(55, 0.3), at, 0.5)  # muffled heartbeat through tissue
    P(ding(1760, 1.4), 17.59, 0.35); P(sparkle(1.0, 12, 4), 17.0, 0.25)
    P(clink(2600), 18.3, 0.35)
    P(sweep_sine(1800, 2400, 0.75, 1) * adsr(int(0.75 * SR), 0.05, 0.75, 1, 0.1) * 0.5, 19.55, 0.12)  # drill
    P(lock(), 20.9, 0.3)
    P(hiss(0.7), 21.66, 0.25)
    for at in np.arange(22.6, 25.0, 0.13):
        P(pop(300 + (at * 97) % 300, 0.05), at, 0.08)  # bubbling
    P(pop(600, 0.08), 24.45, 0.35)
    P(clink(1800), 25.67, 0.3); P(stamp(), 26.21, 0.45); P(boom(), 26.21, 0.25)
    P(thud(120), 27.8, 0.4); P(thud(130), 28.0, 0.3)
    P(buzz(), 28.6, 0.15); P(whoosh(0.3, 600, 5000), 28.5, 0.3)
    P(ding(1320, 1.0), 29.47, 0.25)
    for i in range(5):
        P(tock(), 30.6 + i * 0.12, 0.35)
    P(lock(), 31.3, 0.3)
    P(thud(90), 32.44, 0.8); P(hiss(0.4), 32.44, 0.45); P(whoosh(0.4, 400, 6000), 32.46, 0.35)  # the gun
    P(bp(noise(0.08), 3000, 9000) * expdec(int(0.08 * SR), 0.02), 33.2, 0.4)  # string snaps
    for i in range(4):
        P(thud(80 + i * 10), 33.6 + i * 0.3, 0.35)
    P(whoosh(1.2, 2000, 100, up=False), 34.2, 0.3)
    P(ding(1568, 1.6), 36.9, 0.25)
    P(sparkle(1.2, 12, 7), 39.1, 0.2)
    P(ding(2093, 1.4), 40.75, 0.22)
    return reverb(s[:N], 1.4, 0.2)


if __name__ == '__main__':
    mus = build_music()
    sfx = build_sfx()
    mix = mus * 0.55 + sfx * 0.8
    mix = np.tanh(mix / max(1e-9, np.abs(mix).max()) * 1.4) * 0.75
    out = os.path.join(ROOT, 'remotion', 'public', 'score.wav')
    sf.write(out, mix.astype(np.float32), SR)
    print('wrote', out, round(N / SR, 2), 's')
