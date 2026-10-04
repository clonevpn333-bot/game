# WHY WE WONDER ep.4: neutron star. Driving synth pulse (A minor, 120 bpm), pulsar clicks, a LIGO chirp, gold shimmer. Music ducks under the narration (word timings from vo/assets/timing.json).
import json, os, re, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, '..', '_shared', 'tools'))
from sfxlib import *  # noqa

TOTAL = 34.5
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



def saw(f, d, cut=1800):
    t = tt(d)
    s = sum(2 * ((f * (1 + dt / 100) * t) % 1) - 1 for dt in (-0.25, 0, 0.25)) / 3
    return lp(s, cut) * adsr(len(t), 0.005, d, 0.8, 0.04)


def chirp(t0, t1):
    # gravitational-wave chirp: frequency and amplitude climb to the merger
    d = t1 - t0
    t = tt(d)
    tau = np.maximum(d - t, 0.004)
    f = 35 * (tau / d) ** (-3 / 8)
    f = np.minimum(f, 900)
    ph = np.cumsum(f) / SR
    a = (tau / d) ** (-1 / 4) / 4
    return np.sin(2 * np.pi * ph) * np.minimum(a, 1) * adsr(len(t), 0.2, d, 1, 0.01)


BASS = [45, 45, 48, 43]          # A, A, C, G
ARP = [69, 72, 76, 72, 74, 72, 67, 71]


def build_music():
    m = np.zeros(N + 4 * SR)
    P = lambda s, at, g=1.0: place(m, s, at, g)
    def groove(a, b, energy):
        at = a
        while at < b - 1e-6:
            k = int(round(at / B))
            bar = (k // 8) % 4
            P(pluck_bass(mtof(BASS[bar]), 0.3), at, 0.55 * energy)
            P(pluck_bass(mtof(BASS[bar]), 0.2), at + 0.25, 0.3 * energy)
            if k % 2 == 0: P(kick(110, 0.35), at, 0.7 * energy)
            P(hat(), at + 0.25, 0.25 * energy)
            P(saw(mtof(ARP[k % 8]), 0.22, 2600), at, 0.12 * energy)
            P(saw(mtof(ARP[(k + 3) % 8] + 12), 0.15, 3200), at + 0.25, 0.06 * energy)
            at += B
    groove(0.0, 5.5, 1.0)                       # hook + reveal
    P(drone(mtof(33), 3.0), 5.25, 0.6)          # the giant star
    P(riser(1.6), 5.7, 0.4)
    groove(8.0, 12.0, 0.9)                      # sun, city
    groove(12.0, 16.5, 1.1)                     # spin (pulsar clicks ride on top, see sfx)
    P(drone(mtof(33), 4.8), 16.5, 0.55)         # pen: tension
    P(strings([mtof(n) for n in (57, 60, 64)], 3.0), 18.0, 0.25)
    P(pad([mtof(n) for n in (57, 64, 69, 72)], 1.9), 21.25, 0.45)   # craziest: breath
    P(drone(mtof(28), 2.6), 23.0, 0.6)
    P(pad([mtof(n) for n in (53, 60, 64, 69)], 4.4), 25.4, 0.55)   # gold: warm
    for k, n in enumerate([81, 84, 88, 84, 86, 88, 91, 88, 84, 81, 84, 88, 93, 88, 84, 81]):
        P(glock(mtof(n), 1.0), 25.6 + k * 0.25, 0.08)
    P(pad([mtof(n) for n in (57, 64, 69, 72)], 4.8), 29.7, 0.5)    # outro
    for k, n in enumerate([76, 81, 84, 88, 84, 81]):
        P(kalimba(mtof(n), 0.9), 32.2 + k * 0.22, 0.16)
    m = reverb(m[:N], 1.6, 0.22)
    t = np.arange(N) / SR
    duck = np.ones(N)
    for line in VO['lines']:
        for w in line['words']:
            a, b = int((w['s'] - 0.05) * SR), int((w['e'] + 0.08) * SR)
            duck[max(0, a):min(N, b)] = 0.55
    k = int(0.06 * SR)
    duck = np.convolve(duck, np.ones(k) / k, mode='same')
    ride = np.interp(t, [0, 0.03, 34.0, 34.5], [0.9, 1, 1, 0])
    return m * duck * ride


def build_sfx():
    s = np.zeros(N + 3 * SR)
    P = lambda x, at, g=1.0: place(s, x, at, g)
    P(whoosh(0.35, 400, 3000, up=False), 0.0, 0.4)
    P(thud(70), 0.3, 0.9); P(boom(), 0.3, 0.5); P(clink(2200), 0.32, 0.3)       # spoon slams the pan
    for k in range(10): P(tick(), 1.65 + k * 0.08, 0.12)                          # tons counter
    P(whoosh(0.3, 300, 2500, up=False), 2.55, 0.4)
    P(thud(60), 2.85, 1.0); P(boom(), 2.85, 0.6)                                   # Everest lands
    P(ding(1320, 0.8), 3.0, 0.25)                                                  # =
    P(whoosh(0.5, 200, 5000), 3.72, 0.5); P(sparkle(0.8, 10, 4), 4.3, 0.2)        # reveal
    P(sub_drop(1.2), 5.62, 0.6)                                                    # crushed
    P(boom(), 7.34, 1.0); P(sub_drop(1.4), 7.34, 0.7); P(crackle(0.9), 7.4, 0.3)   # supernova
    P(whoosh(0.4, 300, 3000), 8.0, 0.3)
    P(lock(), 9.75, 0.6); P(thud(80), 10.15, 0.7)                                 # press plates
    P(whoosh(0.45, 200, 4000, up=False), 10.3, 0.4)
    P(ding(988, 0.9), 11.5, 0.25)                                                  # 20 km
    # pulsar clicks, rate follows the spin (1 → 6 → 60 rad/s ≈ beam passes)
    at = 12.0
    while at < 16.5:
        w = 1 if at < 12.77 else 6 if at < 13.6 else 6 + 54 * min(1, (at - 13.6) / 2.4)
        P(tick(), at, 0.25 + 0.15 * min(1, (at - 12) / 4))
        at += np.pi / w
    for k in range(14): P(tick(), 14.75 + k * 0.093, 0.1)                        # counter
    P(pop(700, 0.1), 16.6, 0.25)                                                   # bracket
    P(boom(), 17.45, 0.9); P(crunch(), 17.45, 0.5)                                 # first impact
    P(whoosh(0.5, 3000, 300, up=False), 17.95, 0.5); P(zap(0.3), 18.0, 0.2)       # rewind
    P(riser(1.7), 18.25, 0.45)
    P(pop(500, 0.08), 18.6, 0.3)                                                   # PiP
    P(boom(), 19.94, 1.0); P(sub_drop(1.2), 19.94, 0.6); P(crunch(), 19.94, 0.5)  # slow-mo impact
    P(shing(1.2, 2000), 21.35, 0.25); P(ding(1568, 1.2), 22.66, 0.3)              # question mark
    P(chirp(23.0, 24.07), 23.0, 0.5)                                               # LIGO chirp
    P(boom(), 24.07, 1.0); P(sub_drop(1.6), 24.07, 0.7)                            # merger
    P(sparkle(1.2, 16, 6), 24.2, 0.3); P(stamp(), 24.97, 0.5); P(ding(2093, 1.0), 24.99, 0.25)  # Au
    P(shing(1.4, 2600), 25.8, 0.35)                                                # the ring forms
    for k in range(5): P(clink(2600 + 300 * k), 26.4 + k * 0.38, 0.12)
    P(sparkle(0.9, 12, 8), 27.99, 0.3)                                             # forged
    P(pop(500, 0.08), 28.75, 0.3)                                                  # PiP
    P(whoosh(0.5, 300, 2000), 29.7, 0.3)
    P(sparkle(1.0, 12, 7), 32.1, 0.2)
    return reverb(s[:N], 1.3, 0.2)


if __name__ == '__main__':
    mus = build_music()
    sfx = build_sfx()
    mix = mus * 0.6 + sfx * 0.8
    mix = np.tanh(mix / max(1e-9, np.abs(mix).max()) * 1.4) * 0.75
    out = os.path.join(ROOT, 'remotion', 'public', 'score.wav')
    sf.write(out, mix.astype(np.float32), SR)
    # SFX-only stem (for a version with a sound added in the Shorts app)
    sx = np.tanh(sfx / max(1e-9, np.abs(sfx).max()) * 1.2) * 0.7
    sf.write(os.path.join(ROOT, 'remotion', 'public', 'sfx.wav'), sx.astype(np.float32), SR)
    print('wrote', out, round(N / SR, 2), 's')
