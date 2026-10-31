# HAUNTED SHIFT · original score "Night Shift Macabre" (D minor, 110 bpm) + SFX, cut to the locked VO timeline.
import json, os, sys
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, '..', '_shared', 'tools'))
from sfxlib import *  # noqa
TOTAL = 61.0; N = int(TOTAL * SR)
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
    # 0.0 HIT: organ stab + boom
    P(organ([50, 62, 65, 69], 1.6), 0.0, 0.5); P(boom(), 0.0, 0.8); P(kick(0.6, 1.2), 0.0, 0.9)
    for i, n in enumerate([74, 77, 81, 77, 74, 73]): P(box(n, 0.6), 0.35 + i * 0.3, 0.18)
    def groove(a, b, lvl=1.0, full=False, drums=True, bass=True, mel=True, march=False):
        t = a; step = 0
        while t < b - 1e-6:
            name, root = chord(t); bi = step % 8
            if drums:
                if bi in (0, 4) or (full and bi == 6): P(kick(), t, 0.85 * lvl)
                if bi in (2, 6): P(clap(), t, 0.4 * lvl)
                P(hat(bi % 2 == 1 and full), t, 0.12 * lvl)
                if march and bi in (3, 7): P(tom(140 if bi == 3 else 110), t, 0.35 * lvl)
            if bass:
                if full: P(reese(mtof(root), S8 * 0.95), t, 0.32 * lvl)
                elif bi % 2 == 0 or march: P(pluck_bass(mtof(root + (12 if bi == 6 else 0)), S8 * 0.9), t, 0.55 * lvl)
            if mel and bi in (0, 3, 5): P(box(CH[name][[0, 2, 1][[0, 3, 5].index(bi)]] + 12, 0.45), t, 0.12 * lvl)
            if bi == 0: P(organ(CH[name], BAR), t, 0.12 * lvl)
            t += S8; step += 1
    # theremin melody over the intro (Danse-macabre-ish)
    def melody(a, notes, g=0.22):
        t = a
        for n, dur in notes: 
            if n: P(theremin(n, dur * B * 0.95), t, g)
            t += dur * B
    groove(GROOVE, SNEAK, 0.9)
    melody(GROOVE + BAR, [(74, 1.5), (73, 0.5), (74, 1), (77, 1), (76, 2), (69, 2)], 0.2)
    groove(SNEAK, JUMP, 0.8, march=True)
    P(organ([50, 56, 62, 65], 1.4), JUMP, 0.55); P(boom(), JUMP, 0.9); P(kick(0.6, 1.3), JUMP, 0.9)
    # TENSION 15.6–27.5: drone + heartbeat, rising
    d = DOOR - TENSE; t = tt(d)
    P(lp(saw(mtof(38), d, (-8, 8), 400), 500) * np.linspace(0.3, 1, len(t)), TENSE, 0.3)
    P(organ([62, 65, 68], d) * np.linspace(0.2, 1, len(t)), TENSE, 0.12)
    hb = TENSE
    while hb < DOOR: P(kick(0.3, 0.9), hb, 0.6); P(kick(0.3, 0.6), hb + 0.18, 0.5); hb += 0.85 - 0.3 * (hb - TENSE) / d
    for i in range(int(d / B)): P(box([74, 75, 74, 81][i % 4], 0.5), TENSE + i * B, 0.08)
    P(riser(1.5), DROP - 1.5, 0.4)
    # DROP: chaos street
    groove(DROP, SNIFF, 1.0, full=True)
    melody(DROP, [(74, 1), (77, 1), (81, 1), (80, 1)], 0.22)
    # SNIFF: near silence, a high held note + heartbeat
    d = RELIEF - SNIFF; P(theremin(86, d) * 0.5, SNIFF, 0.1); hb = SNIFF + 0.3
    while hb < RELIEF - 0.2: P(kick(0.3, 0.8), hb, 0.5); P(kick(0.3, 0.6), hb + 0.17, 0.4); hb += 0.75
    P(organ([62, 66, 69], 1.3), RELIEF, 0.25)
    # MARCH: comedic sneaky zombie march, building
    groove(MARCH, GROAN, 0.85, march=True)
    melody(MARCH, [(62, 0.5), (0, 0.5), (65, 0.5), (0, 0.5), (69, 1), (68, 1), (67, 0.5), (0, 0.5), (66, 0.5), (0, 0.5), (65, 2), (62, 0.5), (0, 0.5), (65, 0.5), (0, 0.5), (69, 1), (72, 1), (70, 2), (69, 2)], 0.18)
    P(organ([50, 62, 65, 69], 1.1), GROAN, 0.4); P(boom(), GROAN, 0.6)
    groove(FULL, MADE, 1.0, full=True, march=True)
    melody(FULL, [(74, 1), (76, 1), (77, 1), (79, 1), (81, 2), (78, 2)], 0.22)
    # MADE: resolve to D major
    P(organ([50, 62, 66, 69, 74], 1.6), MADE, 0.35)
    for i, n in enumerate([74, 78, 81, 86]): P(box(n, 0.9), MADE + i * 0.2, 0.14)
    # RAIN: detuned music box alone
    for i, n in enumerate([74, 73, 74, 69, 70]): P(box(n - 0.3, 0.8), RAIN + 0.3 + i * 0.45, 0.13)
    # STING + CHASE
    P(organ([50, 51, 56, 62, 63], 1.3), STING, 0.6); P(boom(), STING, 1.0); P(kick(0.7, 1.4), STING, 1.0)
    groove(CHASE, END, 1.0, full=True, march=True)
    P(organ([50, 62, 65, 69], 1.8), END, 0.45); P(boom(), END, 0.8)
    return m[:N]
def growl(d=0.8, f=70):
    t = tt(d); s = np.sin(2 * np.pi * f * t + 3 * np.sin(2 * np.pi * 9 * t)) + 0.5 * bp(noise(d), 200, 900)
    return lp(s, 900) * adsr(len(t), 0.05, d, 0.8, 0.2)
def scream(d=0.7, f=900):
    t = tt(d); return bp(noise(d), f * 0.8, f * 2.2) * (1 + 0.5 * np.sin(2 * np.pi * 7 * t)) * adsr(len(t), 0.02, d, 0.7, 0.2)
def sniff(): return bp(noise(0.16), 1500, 5000) * adsr(int(0.16 * SR), 0.03, 0.1, 0.4, 0.05)
def sfx():
    s = np.zeros(N + 3 * SR); P = lambda x, at, g=1.0: place(s, x, at, g)
    for at in (0.0, 0.35, 0.7, 1.05, 1.5, 1.9): P(crunch(), at, 0.55)
    P(growl(1.0), 0.05, 0.4)
    P(thud(60), 2.3, 0.5); P(lp(noise(1.8), 300) * expdec(int(1.8 * SR), 0.6), 2.3, 0.9); P(hp(noise(0.08), 2500) * expdec(int(0.08 * SR), 0.02), 2.3, 0.8)
    P(whoosh(0.4, 300, 3000), 4.0, 0.3)
    for k in range(3): P(buzz(), 5.75 + k * 0.18, 0.25)
    P(ding(1760, 0.5), 5.8, 0.18); P(whoosh(0.2, 1500, 5000), 6.7, 0.25)
    for i in range(8): P(growl(0.7, 55 + i * 6), 7.3 + i * 0.18, 0.12)
    P(squish(), 9.2, 0.25); P(squish(), 9.8, 0.25); P(pop(900), 10.4, 0.2)
    P(whoosh(0.3, 400, 4000), 13.0, 0.45); P(wahwah(), 14.65, 0.0)
    P(bp(noise(0.25), 400, 3000) * np.linspace(1, 0, int(0.25 * SR)), 14.5, 0.5)                    # record scratch
    for at in (16.0, 17.0, 18.6, 19.5): P(growl(0.9, 60), at, 0.2)
    P(tick(), 19.25, 0.3); [P(tick(), 19.25 + k * 0.1, 0.2) for k in range(12)]
    for at in (20.5, 20.8, 21.1, 22.0, 22.4, 22.9): P(crunch(), at, 0.45)
    P(bp(noise(2.0), 300, 2500) * 0.4, 24.3, 0.25)                                                   # applause
    for k in range(14): P(clap(0.12), 24.3 + k * 0.14 + 0.03 * np.sin(k), 0.18)
    P(thud(140), 28.5, 0.6); P(shing(0.25, 900), 28.5, 0.3); P(whoosh(0.5, 200, 2000), 28.6, 0.3)
    for k in range(6): P(scream(0.6, 700 + k * 150), 29.25 + k * 0.33, 0.18)
    P(crackle(2.2), 29.2, 0.3); P(siren(2.0), 29.4, 0.12)
    for at in (32.9, 33.15, 33.4, 33.95, 34.2): P(sniff(), at, 0.45)
    P(hiss(0.8), 35.3, 0.15)
    for k in range(10): P(growl(0.6, 50 + k * 4), 36.4 + k * 0.28, 0.08)
    for k in range(10): P(thud(130), 40.6 + k * 0.13, 0.15)                                           # running in
    P(boom(), 47.6, 0.3)
    P(siren(1.6), 51.0, 0.1); P(lp(noise(1.5), 200) * 0.5, 51.0, 0.3)                              # truck idle
    P(sparkle(0.8, 8, 4), 52.6, 0.15)
    P(pop(1400, 0.08), 54.15, 0.3)                                                                  # the drop on your face
    d = TOTAL - 54.3; P(hp(noise(d), 1500) * np.clip(np.linspace(0, 3, int(d * SR)), 0, 1) * 0.5, 54.3, 0.35)  # rain bed
    P(whoosh(0.25, 3000, 600, up=False), 56.6, 0.5)
    for i in range(10): P(growl(0.9, 45 + i * 7), 56.65 + i * 0.05, 0.12)
    for k in range(10): P(thud(150), 59.35 + k * 0.15, 0.15)
    return reverb(s[:N], 1.2, 0.18)
if __name__ == '__main__':
    mus, fx = music(), sfx()
    out = lambda n, x, g: sf.write(os.path.join(ROOT, 'remotion', 'public', n), (np.tanh(x / max(1e-9, np.abs(x).max()) * g) * 0.72).astype(np.float32), SR)
    out('score.wav', mus * 0.62 + fx * 0.8, 2.6); out('sfx.wav', fx, 1.2); out('music_only.wav', mus, 1.2)
    print('ok', TOTAL)
