# ROADSTER GHOST · original score (D minor, 110 bpm) + SFX, cut to the locked VO timeline.
import json, os, sys
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, '..', '_shared', 'tools'))
from sfxlib import *  # noqa
TOTAL = 43.0; N = int(TOTAL * SR)
B = 60 / 110; BAR = 4 * B; S8 = B / 2
# section edges (s)
HIT0, GROOVE, SNEAK, JUMP, SCRATCH, TENSE, DOOR, DROP, SNIFF, RELIEF, MARCH, GROAN, FULL, MADE, RAIN, STING, CHASE, END = 0, 2.3, 8.75, 13.15, 14.55, 15.6, 27.55, 29.2, 31.45, 34.9, 36.2, 47.6, 48.75, 52.6, 53.95, 56.6, 57.95, 59.35
PROG = [('Dm', 38), ('Bb', 34), ('Gm', 31), ('A', 33)]
CH = {'Dm': [62, 65, 69], 'Bb': [58, 62, 65], 'Gm': [55, 58, 62], 'A': [57, 61, 64], 'D': [62, 66, 69]}
def saw(f, d, det=(0,), cut=3000):
    t = tt(d); s = sum(2 * ((f * (1 + c / 1200) * t + k * 0.13) % 1) - 1 for k, c in enumerate(det)) / len(det); return lp(s, cut)
def kick(d=0.4, g=1.0):
    x = sweep_sine(140, 42, d, 0.2) * expdec(int(d * SR), 0.16); c = bp(noise(0.008), 2000, 8000) * 0.3; x[:len(c)] += c; return x * g
def clap(d=0.22):
    x = np.zeros(int(d * SR))
    for o in (0, 0.011, 0.022): place(x, bp(noise(d - o), 900, 5000) * expdec(int((d - o) * SR), 0.05 if o == 0.022 else 0.008), o, 0.6)
    return x
def hat(o=False):
    d = 0.18 if o else 0.05; return hp(noise(d), 7500) * expdec(int(d * SR), 0.05 if o else 0.012)
def tom(f=110): return sweep_sine(f * 1.6, f, 0.35, 0.3) * expdec(int(0.35 * SR), 0.12)
def theremin(m, d):
    t = tt(d); f = mtof(m) * (1 + 0.012 * np.sin(2 * np.pi * 6 * t) * np.clip(t * 3, 0, 1)); ph = np.cumsum(f) / SR
    return (np.sin(2 * np.pi * ph) + 0.15 * np.sin(4 * np.pi * ph)) * adsr(len(t), 0.06, d, 0.85, 0.15)
def organ(notes, d):
    t = tt(d); s = sum(sum(a * np.sin(2 * np.pi * mtof(m) * k * t) for k, a in ((0.5, 0.5), (1, 1), (2, 0.5), (3, 0.3), (4, 0.2))) for m in notes) / len(notes)
    return s * adsr(len(t), 0.02, d, 0.9, 0.2) * (1 + 0.08 * np.sin(2 * np.pi * 6.5 * t))
def box(m, d=0.5):  # music box: bright bell
    t = tt(d); f = mtof(m); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 9)) * np.exp(-t * 4.5)
def reese(f, d):
    t = tt(d); s = saw(f, d, (-14, -5, 5, 14), 1100); return np.tanh(lp(s, 1300) * 2.2) * adsr(len(t), 0.003, d, 0.9, 0.03) + np.sin(2 * np.pi * f * t) * 0.7 * adsr(len(t), 0.004, d, 0.9, 0.04)
def chord(t0):
    k = int(max(0, t0 - GROOVE) // BAR) % 4; return PROG[k]
def pad2(notes, d, cut=1400):
    t = tt(d); x = sum(saw(mtof(m), d, (-7, 0, 7), cut) for m in notes) / len(notes)
    a = min(int(0.6 * SR), len(t) // 3); env = np.ones(len(t)); env[:a] = np.linspace(0, 1, a); env[-a:] = np.linspace(1, 0, a)
    return lp(x, cut) * env
def music():
    m = np.zeros(N + 3 * SR); P = lambda x, at, g=1.0: place(m, x, at, g)
    prog = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]]
    for i, t0 in enumerate(np.arange(0, TOTAL, 4.0)): P(pad2(prog[i % 4], 4.3), t0, 0.16)
    for t0 in np.arange(0, TOTAL, B * 2):                                  # sub pulse, half-time heartbeat
        P(np.sin(2 * np.pi * 36.7 * tt(0.5)) * expdec(int(0.5 * SR), 0.2), t0, 0.5)
    def beat(a, b, lvl=1.0):
        t = a; k = 0
        while t < b:
            if k % 4 == 0: P(kick(0.5, 1.1), t, 0.7 * lvl)
            if k % 4 == 2: P(clap(0.2), t, 0.25 * lvl)
            P(hat(k % 2 == 1), t, 0.07 * lvl); t += B / 2; k += 1
    beat(0.0, 3.3, 1.0)
    for t0 in np.arange(3.34, 28.5, 0.5): P(tick(), t0, 0.12)                 # the frozen clock ticking
    beat(12.47, 16.8, 0.55); beat(23.2, 28.5, 0.55)
    beat(28.51, 33.7, 0.9); beat(38.87, 41.1, 0.7)
    for t0, g in [(0.0, 1.0), (6.25, 1.0), (7.9, 0.7), (13.3, 0.5), (30.4, 0.8), (35.6, 0.9), (37.36, 0.8)]: P(boom(), t0, g); P(kick(0.6, 1.3), t0, 0.8 * g)
    for t0 in (8.8, 11.18, 11.64, 11.91): P(thud(110), t0 + 0.42 if t0 > 9 else t0 + 0.42, 0.35)
    P(riser(1.2), 5.05, 0.3); P(riser(1.0), 29.2, 0.35)
    for i, n in enumerate([74, 77, 81, 86]): P(box(n, 1.0), 27.33 + i * 0.12, 0.1)   # oxygen sparkle
    P(organ([50, 57, 62, 65], 1.8), 41.15, 0.3); P(boom(), 41.15, 0.6)
    return m[:N]
def growl(d=0.8, f=70):
    t = tt(d); s = np.sin(2 * np.pi * f * t + 3 * np.sin(2 * np.pi * 9 * t)) + 0.5 * bp(noise(d), 200, 900)
    return lp(s, 900) * adsr(len(t), 0.05, d, 0.8, 0.2)
def scream(d=0.7, f=900):
    t = tt(d); return bp(noise(d), f * 0.8, f * 2.2) * (1 + 0.5 * np.sin(2 * np.pi * 7 * t)) * adsr(len(t), 0.02, d, 0.7, 0.2)
def sniff(): return bp(noise(0.16), 1500, 5000) * adsr(int(0.16 * SR), 0.03, 0.1, 0.4, 0.05)
def sfx():
    s = np.zeros(N + 3 * SR); P = lambda x, at, g=1.0: place(s, x, at, g)
    P(whoosh(0.5, 200, 5000), 0.2, 0.7); P(lp(noise(1.2), 400) * np.linspace(1, 0, int(1.2 * SR)), 0.0, 0.4)
    P(hp(noise(0.5), 3000) * expdec(int(0.5 * SR), 0.15), 1.25, 0.2)
    P(whoosh(0.55, 5000, 300, up=False), 3.34, 0.45)                       # rewind
    P(sweep_sine(200, 2400, 0.7, 1.0) * adsr(int(0.7 * SR), 0.05, 0.6, 0.6, 0.1) * 0.25, 4.05, 0.3)   # scan
    P(whoosh(0.5, 200, 4000), 6.25, 0.6); P(hp(noise(0.8), 1500) * expdec(int(0.8 * SR), 0.3), 6.25, 0.3)
    P(thud(80), 7.9, 0.5)
    P(squish(), 13.2, 0.4); P(squish(), 14.7, 0.4)
    P(whoosh(0.7, 3000, 200, up=False), 20.9, 0.3); P(lp(noise(2.0), 120) * np.linspace(0, 1, int(2.0 * SR)), 21.0, 0.3)
    P(sparkle(0.8, 8, 4), 27.3, 0.15)
    P(whoosh(0.5, 200, 4000), 29.17, 0.5); [P(pop(500 + k * 120, 0.06), 31.4 + k * 0.12, 0.2) for k in range(6)]
    P(whoosh(0.6, 400, 3000), 33.74, 0.3); P(hp(noise(0.6), 1200) * expdec(int(0.6 * SR), 0.25), 35.61, 0.5)   # tyres bite
    P(thud(140), 37.36, 0.6); P(crunch(), 37.38, 0.4)
    return reverb(s[:N], 1.1, 0.2)
if __name__ == '__main__':
    mus, fx = music(), sfx()
    out = lambda n, x, g: sf.write(os.path.join(ROOT, 'remotion', 'public', n), (np.tanh(x / max(1e-9, np.abs(x).max()) * g) * 0.72).astype(np.float32), SR)
    out('score.wav', mus * 0.62 + fx * 0.8, 2.6); out('sfx.wav', fx, 1.2); out('music_only.wav', mus, 1.2)
    print('ok', TOTAL)
