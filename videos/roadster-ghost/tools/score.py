# ROADSTER GHOST · original score (D minor, 110 bpm) + SFX, cut to the locked VO timeline.
import json, os, sys
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, '..', '_shared', 'tools'))
from sfxlib import *  # noqa
TOTAL = 55.0; N = int(TOTAL * SR)
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
def music():
    m = np.zeros(N + 3 * SR); P = lambda x, at, g=1.0: place(m, x, at, g)
    def groove(a, b, lvl=1.0, full=False, march=False, drums=True):
        t = a; step = 0
        while t < b - 1e-6:
            name, root = chord(t); bi = step % 8
            if drums:
                if bi in (0, 4) or (full and bi in (2, 6)): P(kick(), t, 0.85 * lvl)
                if bi in (2, 6): P(clap(), t, 0.4 * lvl)
                P(hat(bi % 2 == 1), t, 0.12 * lvl)
                if march and bi == 7: P(tom(140), t, 0.3 * lvl)
            if full: P(reese(mtof(root), S8 * 0.95), t, 0.3 * lvl)
            else: P(pluck_bass(mtof(root + (12 if bi % 4 == 3 else 0)), S8 * 0.9), t, 0.5 * lvl)
            if bi in (0, 3, 5): P(box(CH[name][[0, 2, 1][[0, 3, 5].index(bi)]] + 12, 0.45), t, 0.11 * lvl)
            if bi == 0: P(organ(CH[name], BAR), t, 0.11 * lvl)
            t += S8; step += 1
    def melody(a, notes, g=0.2):
        t = a
        for n, d in notes:
            if n: P(theremin(n, d * B * 0.95), t, g)
            t += d * B
    P(organ([50, 62, 65, 69], 1.6), 0.0, 0.5); P(boom(), 0.0, 0.9); P(kick(0.6, 1.3), 0.0, 1.0)
    groove(0.0, 1.97, 1.0, full=True)
    P(organ([50, 56, 62], 1.2), 1.97, 0.4); P(boom(), 1.97, 0.6)
    for i, n in enumerate([81, 80, 81, 77, 76]): P(box(n, 0.6), 2.1 + i * 0.55, 0.15)
    groove(5.31, 7.86, 0.8); melody(5.31, [(74, 1.5), (73, 0.5), (74, 1), (77, 1)], 0.18)
    P(theremin(86, 1.6) * 0.6, 7.86, 0.16); [P(box(n - 0.3, 0.8), 7.9 + i * 0.4, 0.13) for i, n in enumerate([74, 73, 74, 69])]
    P(riser(0.6), 9.5, 0.3)
    P(organ([50, 62, 65, 69], 1.2), 10.16, 0.5); P(boom(), 10.16, 1.0); P(kick(0.7, 1.4), 10.16, 1.0)
    groove(10.16, 13.77, 1.0, full=True)
    groove(13.77, 24.86, 0.62, march=True)
    groove(24.86, 27.59, 1.0, full=True, march=True); melody(24.86, [(74, 1), (77, 1), (81, 1), (80, 1)], 0.2)
    groove(27.59, 40.57, 0.6); melody(31.46, [(62, 1), (65, 1), (69, 2), (70, 1), (69, 1), (65, 2)], 0.14)
    P(riser(1.2), 40.57, 0.45)
    for at in (41.76, 42.32, 42.87): P(boom(), at, 0.9); P(kick(0.6, 1.4), at, 1.0); P(organ([50, 62, 66, 69], 0.5), at, 0.4)
    groove(42.87, 44.09, 1.0, full=True)
    for i, n in enumerate([74, 75, 74, 69]): P(box(n - 0.3, 0.9), 44.2 + i * 0.35, 0.14)
    P(organ([50, 51, 56, 62, 63], 1.3), 46.53, 0.6); P(boom(), 46.53, 1.0); P(kick(0.7, 1.4), 46.53, 1.0)
    groove(47.89, 53.15, 0.75, march=True)
    P(organ([50, 62, 65, 69], 1.8), 53.15, 0.45); P(boom(), 53.15, 0.8)
    return m[:N]
def growl(d=0.8, f=70):
    t = tt(d); s = np.sin(2 * np.pi * f * t + 3 * np.sin(2 * np.pi * 9 * t)) + 0.5 * bp(noise(d), 200, 900)
    return lp(s, 900) * adsr(len(t), 0.05, d, 0.8, 0.2)
def scream(d=0.7, f=900):
    t = tt(d); return bp(noise(d), f * 0.8, f * 2.2) * (1 + 0.5 * np.sin(2 * np.pi * 7 * t)) * adsr(len(t), 0.02, d, 0.7, 0.2)
def sniff(): return bp(noise(0.16), 1500, 5000) * adsr(int(0.16 * SR), 0.03, 0.1, 0.4, 0.05)
def sfx():
    s = np.zeros(N + 3 * SR); P = lambda x, at, g=1.0: place(s, x, at, g)
    P(hiss(1.0), 0.0, 0.5); P(whoosh(0.5, 300, 4000), 0.0, 0.6); [P(crackle(0.25), 0.1 + k * 0.2, 0.12) for k in range(4)]
    P(whoosh(0.6, 3000, 300, up=False), 1.0, 0.45); P(thud(70), 1.85, 0.4)
    P(lp(noise(2.5), 500) * 0.4, 5.31, 0.25); P(whoosh(0.8, 200, 1200), 7.86, 0.2)
    P(hiss(1.2), 10.16, 0.55); P(whoosh(0.5, 200, 4000), 10.16, 0.6)
    for k in range(8): P(tick(), 11.35 + k * 0.08, 0.15)
    P(hiss(3.5), 13.8, 0.25); P(lp(noise(3.5), 200) * 0.6, 13.8, 0.35)          # rocket rumble
    P(hp(noise(1.5), 800) * np.linspace(0.8, 0.2, int(1.5 * SR)), 17.9, 0.35)   # tyre spin screech
    P(hiss(1.6), 19.95, 0.55)
    P(hiss(1.4), 21.35, 0.4); P(bp(noise(1.6), 300, 2500) * np.linspace(1, 0.2, int(1.6 * SR)), 22.9, 0.4)   # balloon farting off
    P(whoosh(0.6, 400, 3000), 24.9, 0.3); P(whoosh(0.6, 400, 3000), 26.1, 0.3)
    P(lp(noise(3.0), 900) * 0.3, 27.6, 0.2); P(ding(1320, 0.6), 33.0, 0.15)
    for k in range(3): P(whoosh(0.5, 300, 2500), 36.6 + k * 1.2, 0.2)
    P(whoosh(0.4, 300, 4000), 41.76, 0.6); P(hiss(1.3), 41.76, 0.5); P(whoosh(0.3, 3000, 500, up=False), 42.32, 0.5); P(whoosh(0.6, 200, 3000), 42.87, 0.5)
    P(sparkle(0.8, 8, 4), 45.2, 0.12); P(ding(880, 0.8), 46.95, 0.3); P(ding(880, 0.8), 47.15, 0.3)
    for k in range(4): P(stamp(), 50.0 + k * 0.22, 0.3)
    P(lp(noise(3.0), 500) * 0.4, 51.7, 0.25)
    return reverb(s[:N], 1.2, 0.18)
if __name__ == '__main__':
    mus, fx = music(), sfx()
    out = lambda n, x, g: sf.write(os.path.join(ROOT, 'remotion', 'public', n), (np.tanh(x / max(1e-9, np.abs(x).max()) * g) * 0.72).astype(np.float32), SR)
    out('score.wav', mus * 0.62 + fx * 0.8, 2.6); out('sfx.wav', fx, 1.2); out('music_only.wav', mus, 1.2)
    print('ok', TOTAL)
