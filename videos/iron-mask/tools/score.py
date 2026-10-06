# WHY WE WONDER ep.6: the Man in the Iron Mask. Dark baroque — harpsichord arpeggios over a broken beat and sub in D minor —
# SLOWED + REVERB (×0.82, big hall), with a low choir; prison SFX on top, un-slowed.
import json, os, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, '..', '_shared', 'tools'))
from sfxlib import *  # noqa

TOTAL = 40.0
N = int(TOTAL * SR)
VO = json.load(open(os.path.join(ROOT, 'vo', 'assets', 'timing.json')))
R = np.random.default_rng(5)
SLOW = 0.82
BPM = 92.0
B = 60.0 / BPM


def harpsi(f, d, vel=1.0):
    t = tt(d)
    s = sum(((2 * ((f * k * t) % 1) - 1) / k) * np.exp(-t * (3 + k * 1.6)) for k in (1, 2, 3, 4, 6))
    return hp(s, 180) * adsr(len(t), 0.002, d, 1, 0.04) * vel * 0.8


def epiano(f, d, vel=1.0):
    t = tt(d)
    idx = 2.2 * np.exp(-t * 3.5) * vel
    mod = np.sin(2 * np.pi * f * t) * idx
    s = np.sin(2 * np.pi * f * t + mod) + 0.25 * np.sin(2 * np.pi * f * 2 * t + mod * 0.5) * np.exp(-t * 2)
    s += 0.12 * np.sin(2 * np.pi * f * 14 * t) * np.exp(-t * 30)  # tine
    s *= (1 + 0.18 * np.sin(2 * np.pi * 4.6 * t))  # tremolo
    return s * np.exp(-t * 1.1) * adsr(len(t), 0.004, d, 1, 0.12) * vel


def glide_lead(notes, d_each, glide=0.045):
    # wonky mono synth: square-ish with portamento between notes
    n = int(len(notes) * d_each * SR)
    f = np.zeros(n)
    for k, m in enumerate(notes):
        a = int(k * d_each * SR)
        f[a:] = mtof(m)
    k = max(1, int(glide * SR))
    f = np.convolve(np.pad(f, (k, 0), mode='edge'), np.ones(k) / k, mode='valid')[:n]
    ph = np.cumsum(f) / SR
    s = np.tanh(2.5 * np.sin(2 * np.pi * ph)) * 0.6 + 0.3 * (2 * (ph % 1) - 1)
    env = np.ones(n)
    for kk in range(len(notes)):
        a = int(kk * d_each * SR); bb = min(n, a + int(d_each * SR))
        env[a:bb] *= np.linspace(1, 0.55, bb - a)
    return lp(s * env, 2600) * adsr(n, 0.005, 0.1, 1, 0.05)


def choir(fs, d):
    t = tt(d)
    s = np.zeros(len(t))
    for f in fs:
        for det in (-0.4, 0, 0.35):
            s += 2 * ((f * (1 + det / 100) * t + 0.003 * np.sin(2 * np.pi * 5 * t)) % 1) - 1
    s = bp(s, 500, 900) * 0.8 + bp(s, 1000, 1400) * 0.5
    a = int(0.6 * SR); env = np.ones(len(t)); env[:a] = np.linspace(0, 1, a); env[-a:] = np.linspace(1, 0, a)
    return s * env / len(fs)


def kick(d=0.45):
    return sweep_sine(130, 42, d, 0.22) * expdec(int(d * SR), 0.16)


def snare(d=0.3):
    return bp(noise(d), 1200, 6500) * expdec(int(d * SR), 0.07) + sweep_sine(220, 160, d, 0.5) * expdec(int(d * SR), 0.04) * 0.6


def hat(d=0.05, open_=False):
    d = 0.18 if open_ else d
    return hp(noise(d), 7000) * expdec(int(d * SR), 0.05 if open_ else 0.012)


# D dorian voicings (MIDI): Dm11, G13, Em11, Fmaj9#11, Cmaj9, Am11, Bbmaj7#11 (borrowed, darker), A7sus
CH = {
    'Dm11': [50, 57, 60, 64, 65, 67], 'G13': [43, 53, 59, 64, 69], 'Em11': [52, 59, 62, 66, 69], 'Fmaj9': [41, 52, 57, 60, 67, 71],
    'Cmaj9': [48, 55, 59, 62, 64], 'Am11': [45, 55, 60, 62, 67], 'Bbmaj7': [46, 53, 57, 60, 64], 'A7sus': [45, 55, 59, 62, 67],
}
PROG = None
ROOT_ = {'Dm11': 38, 'G13': 43, 'Em11': 40, 'Fmaj9': 41, 'Cmaj9': 36, 'Am11': 45, 'Bbmaj7': 46, 'A7sus': 45}
CH.update({'Dm': [50, 57, 62, 65, 69], 'Gm': [43, 55, 58, 62, 67], 'A7': [45, 57, 61, 64, 67], 'Bb': [46, 53, 58, 62, 65], 'C': [48, 55, 60, 64, 67], 'F': [41, 53, 57, 60, 65]})
ROOT_.update({'Dm': 38, 'Gm': 43, 'A7': 45, 'Bb': 46, 'C': 48, 'F': 41})
PROG = ['Dm', 'Gm', 'A7', 'Dm', 'Bb', 'Gm', 'A7', 'A7']
SCALE = [62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81]


def build_beat():
    # composed at 92 bpm, long enough that after slowing it covers the film
    L_ = TOTAL * SLOW + 2
    n = int(L_ * SR)
    m = np.zeros(n + 4 * SR)
    P = lambda s, at, g=1.0: place(m, s, at, g)
    bar = 4 * B
    nb = int(L_ / bar) + 1
    for bi in range(nb):
        t0 = bi * bar
        ch = PROG[bi % len(PROG)]
        # keys: syncopated stabs (on 1, the "and" of 2, the 4) with a pickup
        notes = CH[ch][1:]
        for k in range(8):  # baroque broken-chord arpeggio
            mm = notes[[0, 1, 2, 3, 2, 1, 2, 3][k] % len(notes)] + (12 if k == 3 else 0)
            P(harpsi(mtof(mm), 0.5 * B, 1.0 if k % 2 == 0 else 0.75), t0 + k * 0.5 * B, 0.13)
        # sub bass with slides
        P(lp(np.sin(2 * np.pi * mtof(ROOT_[ch]) * tt(1.6 * B)) * adsr(int(1.6 * B * SR), 0.01, 1, 0.9, 0.1), 300), t0, 0.5)
        P(lp(np.sin(2 * np.pi * mtof(ROOT_[ch] + 12) * tt(0.4 * B)) * adsr(int(0.4 * B * SR), 0.01, 1, 0.9, 0.05), 300), t0 + 2.5 * B, 0.3)
        # broken beat (kick 1, a2; snare 3; ghosts; swung hats)
        if bi >= 0:
            for off in (0, 1.75 * B, 2.75 * B if bi % 2 else None):
                if off is not None: P(kick(), t0 + off, 0.8)
            P(snare(), t0 + 2 * B, 0.55)
            for off in (1.25 * B, 3.5 * B, 3.75 * B):
                P(snare(0.12), t0 + off, 0.12)
            for k in range(8):
                sw = 0.08 * B if k % 2 else 0
                P(hat(open_=(k == 7 and bi % 2 == 1)), t0 + k * 0.5 * B + sw, 0.18 if k % 2 == 0 else 0.1)
        # Dorian-Concept-style wonky lead run every other bar
        if bi % 2 == 1:
            r = np.random.default_rng(bi)
            start = r.integers(0, 5)
            notes = [SCALE[(start + k * r.choice([1, 2, -1])) % len(SCALE)] for k in range(9)]
            P(glide_lead(notes, B / 4), t0 + 2.25 * B, 0.07)
    return m[:n]


def slowed_reverb(x):
    # resample: play the beat at SLOW speed (tempo and pitch drop together), then a big dark hall
    n_out = int(len(x) / SLOW)
    idx = np.arange(n_out) * SLOW
    y = np.interp(idx, np.arange(len(x)), x)
    y = lp(y, 5200)
    y = reverb(y, 3.4, 0.5)
    return y


def build_music():
    beat = slowed_reverb(build_beat())[:N]
    m = np.zeros(N + 4 * SR)
    m[:len(beat)] += beat
    P = lambda s, at, g=1.0: place(m, s, at, g)
    # low choir pad (dark-fantasy bed) — D dorian, in the slowed key (≈ B dorian after the drop: keep it consonant)
    for t0, fs, d in ((0.0, (47, 54, 59, 62), 7.0), (7.0, (52, 55, 59, 64), 7.75), (14.73, (47, 50, 54, 59), 6.25), (20.98, (43, 50, 55, 59), 9.5), (30.48, (47, 54, 59, 62, 66), 6.75)):
        P(choir([mtof(f) for f in fs], d), t0, 0.22)
    m = m[:N]
    t = np.arange(N) / SR
    duck = np.ones(N)
    for line in VO['lines']:
        for w in line['words']:
            a, b = int((w['s'] - 0.05) * SR), int((w['e'] + 0.08) * SR)
            duck[max(0, a):min(N, b)] = 0.6
    k = int(0.08 * SR)
    duck = np.convolve(duck, np.ones(k) / k, mode='same')
    # drop out for the verdict, slam back for GUILTY; dip for the snuffed candle
    ride = np.interp(t, [0, 14.83, 15.03, 15.77, 15.79, 24.88, 25.13, 25.88, 26.08, 36.68, 37.23], [1, 1, 0.12, 0.12, 1.1, 1, 0.1, 0.1, 0.95, 1, 0])
    return m * duck * ride


def sub_drop(d=1.2):
    return sweep_sine(90, 28, d, 0.6) * adsr(int(d * SR), 0.01, d, 1, 0.5)


def riser(d=0.6):
    t = tt(d)
    return bp(noise(d), 400, 6000) * (t / d) ** 2 * 0.8 + sweep_sine(200, 900, d, 1.5) * (t / d) ** 2 * 0.3


def thunder(d=2.4):
    n = int(d * SR)
    x = lp(noise(d), 400) * 1.4 + bp(noise(d), 300, 1500) * 0.5
    env = np.exp(-np.linspace(0, 4, n)) * (0.6 + 0.4 * np.abs(np.sin(np.linspace(0, 23, n))))
    return np.concatenate([bp(noise(0.06), 2000, 8000) * 0.8, np.zeros(0)]) if False else x * env


def bell(f=110, d=4.0):
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * m_ * t) * np.exp(-t * dec) for m_, a, dec in [(0.5, 0.6, 0.6), (1, 1, 0.8), (1.19, 0.5, 1.1), (1.5, 0.45, 1.3), (2, 0.4, 1.6), (2.74, 0.3, 2.2), (3.76, 0.2, 3)])
    return s * adsr(len(t), 0.003, d, 1, 0.3)


def build_sfx():
    s = np.zeros(N + 4 * SR)
    P = lambda x, at, g=1.0: place(s, x, at, g)
    P(boom(), 0.0, 0.6); P(sub_drop(1.2), 0.0, 0.5); P(thunder(), 0.0, 0.5)
    for a in (0.0, 0.15, 0.38, 3.8, 4.7): P(whoosh(0.16, 800, 6000), max(0, a - 0.02), 0.35); P(thud(70), a, 0.45)
    P(whoosh(0.35, 2000, 200, up=False), 5.25, 0.5)                          # into the keyhole
    P(bell(98, 3.5), 5.5, 0.3); P(shing(1.0, 2600), 5.6, 0.3); P(whoosh(0.18, 800, 6000), 6.16, 0.3)   # the King, 1669
    P(boom(), 8.45, 0.9); P(thud(55), 8.45, 0.9); P(crunch(), 8.47, 0.3)     # door slams
    P(lock(), 9.2, 0.7)                                                       # key turns
    P(stamp(), 10.27, 0.8); P(thud(70), 10.27, 0.6)                           # SECRET seal
    for k in range(12): P(bp(noise(0.06), 3000, 8000) * expdec(int(0.06 * SR), 0.02), 11.3 + k * 0.24, 0.12)   # quill scratches
    P(shing(1.1, 3400), 14.55, 0.5); P(boom(), 14.75, 0.5)                    # hand to the hilt / KILL HIM
    for k in range(4): P(pop(500 + 80 * k, 0.1), 15.83 + k * 0.16, 0.3)       # forts 1-4
    P(whoosh(1.2, 300, 2000), 16.0, 0.25)
    P(whoosh(0.5, 200, 3000), 18.75, 0.3); P(bell(82, 4.0), 20.4, 0.35)      # the Bastille
    P(whoosh(0.18, 800, 6000), 21.7, 0.3); P(pop(500, 0.08), 22.4, 0.3); P(stamp(), 23.0, 0.5)   # 1703 / record / FAKE NAME
    P(lp(noise(2.2), 1800) * adsr(int(2.2 * SR), 0.3, 2.2, 1, 0.4), 23.95, 0.4); P(crackle(2.0), 24.0, 0.45); P(boom(), 24.0, 0.4)   # fire
    P(shing(1.2, 2200), 26.0, 0.3); P(whoosh(0.18, 800, 6000), 27.9, 0.3)    # the mirror line / TWIN?
    P(riser(0.8), 29.6, 0.3); P(whoosh(0.2, 800, 6000), 30.65, 0.3); P(crunch(), 31.86, 0.4)   # IRON / struck out
    P(whoosh(0.8, 400, 6000), 32.45, 0.45); P(sparkle(0.9, 10, 4), 32.9, 0.3)   # velvet sweep
    P(bell(98, 4.5), 33.5, 0.35)
    P(sparkle(1.2, 12, 7), 37.35, 0.22); P(ding(1568, 1.2), 38.95, 0.15)
    return reverb(s[:N], 1.6, 0.22)


if __name__ == '__main__':
    mus = build_music()
    sfx = build_sfx()
    mix = mus * 0.55 + sfx * 0.85
    mix = np.tanh(mix / max(1e-9, np.abs(mix).max()) * 1.4) * 0.75
    out = os.path.join(ROOT, 'remotion', 'public', 'score.wav')
    sf.write(out, mix.astype(np.float32), SR)
    sx = np.tanh(sfx / max(1e-9, np.abs(sfx).max()) * 1.2) * 0.7
    sf.write(os.path.join(ROOT, 'remotion', 'public', 'sfx.wav'), sx.astype(np.float32), SR)
    mu = np.tanh(mus / max(1e-9, np.abs(mus).max()) * 1.2) * 0.7
    sf.write(os.path.join(ROOT, 'remotion', 'public', 'music_only.wav'), mu.astype(np.float32), SR)
    print('wrote', out, round(N / SR, 2), 's')
