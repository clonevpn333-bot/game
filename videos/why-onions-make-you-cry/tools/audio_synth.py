# Synthesizes the music bed and the SFX track for "Why onions make you cry".
# Everything is procedural (numpy/scipy) and seeded, so re-running is deterministic.
import json, os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
T = json.load(open(f"{ROOT}/assets/timing.json"))
TOTAL = T["total"]
N = int(TOTAL * SR)
rng = np.random.default_rng(7)


def tt(d):
    return np.arange(int(d * SR)) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "lowpass", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "highpass", fs=SR, output="sos"), x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def adsr(n, a=0.005, d=0.1, s=0.0, r=0.05):
    e = np.zeros(n)
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    A = max(A, 1)
    e[:A] = np.linspace(0, 1, A)
    end_d = min(n, A + D)
    e[A:end_d] = np.linspace(1, s, end_d - A) if end_d > A else []
    e[end_d:] = s
    if s > 0 and R > 0:
        e[-R:] *= np.linspace(1, 0, R)
    return e


def expdec(n, tau):
    return np.exp(-np.arange(n) / SR / tau)


def sweep_sine(f0, f1, d, curve=1.0):
    t = tt(d)
    k = (t / d) ** curve
    f = f0 + (f1 - f0) * k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def place(buf, sig, at, gain=1.0):
    o = int(at * SR)
    if o >= len(buf):
        return
    sig = sig[: len(buf) - o]
    buf[o : o + len(sig)] += sig * gain


def norm(x, p=1.0):
    m = np.abs(x).max()
    return x / m * p if m > 0 else x


def reverb(x, secs=1.6, wet=0.25, bright=6000):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (secs / 5))
    ir = lp(ir, bright)
    ir /= np.abs(ir).sum() ** 0.5 * 4
    y = fftconvolve(x, ir)[: len(x)]
    return x * (1 - wet) + norm(y, np.abs(x).max()) * wet


# ---------------------------------------------------------------- SFX
def whoosh(d=0.45, lo=300, hi=3000, up=True):
    n = int(d * SR)
    x = noise(d)
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * t) ** 2
    # sweep a band by crossfading 6 static bands
    bands = np.geomspace(lo, hi, 6)
    out = np.zeros(n)
    for i, f in enumerate(bands):
        pos = i / 5
        c = t if up else 1 - t
        w = np.exp(-((c - pos) ** 2) / 0.03)
        out += bp(x, f * 0.7, min(f * 1.4, SR / 2 - 100)) * w
    return norm(out * env, 0.8)


def pop(f0=500, d=0.12):
    n = int(d * SR)
    f = f0 * (1 + 1.4 * np.exp(-np.arange(n) / SR / 0.012))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * expdec(n, 0.035)
    click = hp(noise(0.004), 2000)
    s[: len(click)] += click * 0.3
    return norm(s, 0.9)


def boing(d=0.5, f0=220):
    t = tt(d)
    f = f0 * (1 + 0.35 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 5)) * (1 + 0.6 * np.exp(-t * 18))
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * expdec(len(t), 0.18), 0.8)


def chop():
    d = 0.5
    n = int(d * SR)
    body = sweep_sine(160, 55, d, 0.3) * expdec(n, 0.09)
    crunch = lp(noise(d), 3500) * expdec(n, 0.05)
    grains = np.zeros(n)
    for k in range(9):
        o = int((0.004 + k * 0.012 + rng.random() * 0.01) * SR)
        g = bp(noise(0.02), 1500, 6000) * expdec(int(0.02 * SR), 0.004)
        grains[o : o + len(g)] += g * (1 - k / 10)
    return norm(body * 1.0 + crunch * 0.5 + grains * 0.6, 0.95)


def thud(f=90):
    d = 0.35
    return norm(sweep_sine(f * 1.6, f, d, 0.3) * expdec(int(d * SR), 0.07) + lp(noise(d), 800) * expdec(int(d * SR), 0.03) * 0.4, 0.8)


def shing(d=0.8, base=2400):
    t = tt(d)
    s = np.zeros(len(t))
    for r, a in [(1, 1), (1.53, 0.7), (2.11, 0.5), (2.79, 0.35), (3.6, 0.2)]:
        s += a * np.sin(2 * np.pi * base * r * t + rng.random() * 6) * np.exp(-t * (4 + r * 1.5))
    sw = whoosh(0.25, 2000, 9000) * 0.5
    s[: len(sw)] += sw
    return norm(s * adsr(len(t), 0.004, d, 0, 0), 0.7)


def hiss(d=1.2):
    n = int(d * SR)
    t = np.linspace(0, 1, n)
    return norm(hp(noise(d), 3000) * np.sin(np.pi * t) ** 1.5, 0.5)


def wahwah():
    out = []
    for i, f in enumerate([392, 370, 349, 311]):
        d = 0.22 if i < 3 else 0.55
        t = tt(d)
        ff = f * (1 + 0.025 * np.sin(2 * np.pi * 6 * t) * (i == 3))
        ph = np.cumsum(ff) / SR
        tri = 2 * np.abs(2 * (ph % 1) - 1) - 1
        sq = np.sign(np.sin(2 * np.pi * ph)) * 0.25
        out.append(lp(tri + sq, 1800) * adsr(len(t), 0.01, d * 0.8, 0.6, 0.06))
    return norm(np.concatenate(out), 0.6)


def stamp():
    d = 0.6
    n = int(d * SR)
    return norm(sweep_sine(120, 40, d, 0.25) * expdec(n, 0.15) + lp(noise(d), 1200) * expdec(n, 0.02) * 0.8, 0.95)


def riser(d=0.6):
    t = tt(d)
    env = (t / d) ** 2
    s = sweep_sine(200, 1600, d, 2) * 0.4 + whoosh(d, 500, 8000) * 0.8
    return norm(s * env, 0.8)


def bloop():
    d = 0.18
    return norm(sweep_sine(300, 900, d, 0.5) * adsr(int(d * SR), 0.005, 0.15, 0, 0), 0.7)


def tick():
    d = 0.02
    return bp(noise(d), 3000, 9000) * expdec(int(d * SR), 0.003)


def clunk():
    a = shing(0.25, 900) * 0.6 + thud(140) * 0.8
    b = np.zeros(int(0.12 * SR))
    return norm(np.concatenate([a[: int(0.08 * SR)], b]) + np.pad(a, (0, len(b)))[: len(a[: int(0.08 * SR)]) + len(b)] * 0, 0.9)


def lock():
    s = np.zeros(int(0.5 * SR))
    place(s, thud(160), 0, 0.9)
    place(s, shing(0.3, 1300), 0.0, 0.4)
    place(s, thud(220), 0.09, 0.7)
    place(s, shing(0.3, 1700), 0.09, 0.3)
    return norm(s, 0.9)


def boom():
    d = 1.4
    n = int(d * SR)
    s = sweep_sine(110, 38, d, 0.2) * expdec(n, 0.35) + lp(noise(d), 600) * expdec(n, 0.15) * 0.6
    return norm(s, 1.0)


def sparkle(d=0.8, k=10, seed=3):
    r = np.random.default_rng(seed)
    s = np.zeros(int(d * SR))
    for i in range(k):
        f = r.uniform(2500, 6500)
        dd = 0.12
        g = np.sin(2 * np.pi * f * tt(dd)) * expdec(int(dd * SR), 0.03)
        place(s, g, i * d / k * 0.8 + r.random() * 0.03, 0.5 + 0.5 * r.random())
    return norm(s, 0.5)


def zap(d=0.5):
    t = tt(d)
    f = 90 + 40 * np.sin(2 * np.pi * 23 * t)
    ph = np.cumsum(f) / SR
    saw = 2 * (ph % 1) - 1
    crack = np.zeros(len(t))
    for i in range(40):
        o = int(rng.random() * (len(t) - 400))
        crack[o : o + 300] += hp(noise(300 / SR), 2500) * np.exp(-np.arange(300) / 60)
    env = adsr(len(t), 0.005, d, 0.8, 0.1) * (0.6 + 0.4 * (np.sin(2 * np.pi * 31 * t) > 0))
    return norm((lp(saw, 2500) + crack * 0.7) * env, 0.7)


def siren(d=1.6):
    t = tt(d)
    f = 750 + 300 * np.sin(2 * np.pi * (t / 0.8) - np.pi / 2)
    ph = np.cumsum(f) / SR
    s = np.sin(2 * np.pi * ph) + 0.4 * np.sin(4 * np.pi * ph)
    s = np.tanh(s * 1.6)
    return norm(lp(s, 3000) * adsr(len(t), 0.03, d, 1, 0.15), 0.55)


def spray(d=2.6):
    n = int(d * SR)
    x = bp(noise(d), 900, 7000)
    am = 0.6 + 0.4 * lp(np.abs(noise(d)), 25) * 3
    t = np.linspace(0, 1, n)
    env = np.minimum(1, t * 8) * np.minimum(1, (1 - t) * 4)
    return norm(x * am * env, 0.45)


def ding(f=1320, d=1.2):
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * (2.2 + r)) for r, a in [(1, 1), (2.76, 0.4), (5.4, 0.2)])
    return norm(s * adsr(len(t), 0.002, d, 1, 0.05), 0.6)


def clink(f=2600):
    d = 0.35
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * (14 + 6 * r)) for r, a in [(1, 1), (1.47, 0.6), (2.31, 0.4), (3.2, 0.2)])
    return norm(s, 0.55)


def crackle(d=0.9):
    s = np.zeros(int(d * SR))
    for i in range(70):
        o = rng.random() * d * 0.95
        g = bp(noise(0.01), 2000, 9000) * expdec(int(0.01 * SR), 0.0015)
        place(s, g, o, rng.random() * (1 - o / d))
    return norm(s, 0.5)


def crunch():
    d = 0.6
    s = np.zeros(int(d * SR))
    for k in range(18):
        g = bp(noise(0.03), 400, 3000) * expdec(int(0.03 * SR), 0.008)
        place(s, g, k * 0.025 + rng.random() * 0.01, 1 - k / 20)
    place(s, thud(70), 0, 0.8)
    return norm(s, 0.9)


def buzz():
    d = 0.35
    t = tt(d)
    s = np.sign(np.sin(2 * np.pi * 140 * t)) * 0.6 + np.sign(np.sin(2 * np.pi * 147 * t)) * 0.4
    return norm(lp(s, 1600) * adsr(len(t), 0.005, d, 1, 0.04), 0.5)


def squish():
    d = 0.3
    x = lp(noise(d), 1500) * expdec(int(d * SR), 0.06)
    return norm(x + sweep_sine(400, 120, d, 0.5) * expdec(int(d * SR), 0.05) * 0.6, 0.7)


def build_sfx():
    s = np.zeros(N + SR)
    P = lambda sig, at, g=1.0: place(s, sig, at, g)
    # SH1 hook
    P(whoosh(0.5, 200, 2500), 0.05, 0.35)
    P(boing(0.45, 260), 0.45, 0.35)
    P(shing(0.7, 2600), 0.75, 0.25)
    P(whoosh(0.18, 800, 6000), 1.12, 0.4)
    P(chop(), 1.27, 0.85)
    P(thud(80), 1.62, 0.5)
    P(hiss(1.6), 1.9, 0.18)
    P(wahwah(), 2.95, 0.3)
    # SH2
    P(whoosh(0.35, 400, 4000), 3.5, 0.3)
    P(stamp(), 4.9, 0.75)
    P(riser(0.65), 5.55, 0.55)
    # SH3 cells
    P(bloop(), 6.22, 0.4)
    P(whoosh(0.6, 200, 1500, up=False), 6.2, 0.35)
    for i in range(22):
        P(tick(), 7.62 + i * 0.045, 0.35)
    P(ding(1760, 0.6), 8.62, 0.18)
    # SH4 single cell
    P(whoosh(0.4, 300, 3000), 9.1, 0.3)
    P(pop(520), 9.76, 0.45)
    P(pop(380), 11.14, 0.45)
    P(lock(), 12.08, 0.6)
    # SH5 slice
    P(whoosh(0.4, 300, 3000), 13.1, 0.3)
    P(shing(1.0, 2200), 14.05, 0.45)
    P(whoosh(0.5, 1200, 8000), 14.25, 0.45)
    for i in range(7):
        P(pop(300 + 90 * (i % 4), 0.1), 15.3 + i * 0.075, 0.45)
    P(riser(0.6), 16.35, 0.35)
    P(boom(), 16.95, 0.85)
    P(sparkle(0.7, 10, 4), 17.0, 0.4)
    # SH6 gas
    P(hiss(2.6), 17.6, 0.2)
    P(pop(700, 0.08), 18.97, 0.35)
    P(squish(), 19.43, 0.3)
    # SH7 eye
    P(whoosh(0.45, 300, 3000), 20.6, 0.3)
    P(squish(), 21.98, 0.6)
    P(zap(0.55), 22.66, 0.45)
    P(zap(0.4), 23.18, 0.35)
    # SH8 brain
    P(whoosh(0.35, 400, 4000), 23.85, 0.3)
    P(zap(0.35), 24.38, 0.4)
    P(siren(1.6), 24.65, 0.35)
    P(stamp(), 24.78, 0.5)
    # SH9 crying
    P(whoosh(0.4, 300, 3000), 25.75, 0.3)
    P(boing(0.4, 180), 26.0, 0.25)
    P(spray(2.7), 26.2, 0.45)
    P(whoosh(0.9, 150, 1500), 27.6, 0.6)
    # SH10 tips
    P(whoosh(0.4, 300, 3000), 28.85, 0.3)
    P(ding(1568, 1.0), 29.62, 0.35)
    P(whoosh(0.3, 600, 5000), 30.02, 0.25)
    for i, at in enumerate([30.2, 30.34, 30.47, 30.62, 30.8]):
        P(clink(2300 + 300 * (i % 3)), at, 0.45)
    P(crackle(0.9), 30.35, 0.3)
    P(whoosh(0.35, 1200, 8000), 31.45, 0.4)
    P(shing(0.9, 3000), 31.98, 0.35)
    P(sparkle(0.5, 6, 9), 32.0, 0.4)
    # SH11
    P(whoosh(0.4, 300, 3000), 32.65, 0.3)
    P(crackle(1.1), 33.05, 0.35)
    P(whoosh(0.4, 300, 3000), 34.3, 0.3)
    P(crunch(), 34.92, 0.7)
    P(whoosh(0.18, 1500, 9000), 35.42, 0.4)
    P(shing(0.6, 3200), 35.48, 0.3)
    P(pop(600, 0.08), 35.62, 0.4)
    P(buzz(), 36.18, 0.3)
    P(ding(1760, 0.8), 36.3, 0.35)
    # SH12 outro
    P(whoosh(0.45, 300, 3000), 36.75, 0.3)
    P(pop(440), 37.02, 0.5)
    P(sparkle(0.9, 12, 11), 37.05, 0.45)
    for at in [37.45, 37.85, 38.25]:
        P(chop(), at, 0.3)
    P(ding(2093, 1.0), 38.7, 0.35)
    s = reverb(s[:N], 0.9, 0.12)
    return norm(s, 0.9)


# ---------------------------------------------------------------- MUSIC
BPM = 112
BEAT = 60 / BPM


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


def marimba(f, d=0.6, vel=1.0):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 6) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 22) + 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 45)
    s *= adsr(len(t), 0.002, d, 1, 0.02)
    return s * vel


def pluck_bass(f, d=0.45):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) * np.exp(-t * 8)
    return s * np.exp(-t * 4.5) * adsr(len(t), 0.004, d, 1, 0.03)


def pad(fs, d):
    t = tt(d)
    s = np.zeros(len(t))
    for f in fs:
        for det in (-0.12, 0.12):
            ph = (f * (1 + det / 100 * 6)) * t
            s += 2 * (ph % 1) - 1
    s = lp(s, 1400)
    a = int(0.3 * SR)
    env = np.ones(len(t))
    env[:a] = np.linspace(0, 1, a)
    env[-a:] = np.linspace(1, 0, a)
    return s * env / len(fs)


def shaker(vel=1.0):
    d = 0.06
    return hp(noise(d), 6000) * adsr(int(d * SR), 0.008, 0.05, 0, 0) * vel


def snap():
    d = 0.12
    return (bp(noise(d), 1200, 5000) * expdec(int(d * SR), 0.02) + np.sin(2 * np.pi * 1800 * tt(d)) * expdec(int(d * SR), 0.01) * 0.3)


# F major: F  Am  Bb  C   (midi roots)
PROG = [(53, [65, 69, 72]), (57, [64, 69, 72]), (58, [65, 70, 74]), (60, [64, 67, 72])]
ARP = [0, 1, 2, 1, 0, 2, 1, 2]


def build_music():
    m = np.zeros(N + 4 * SR)
    bars = int(TOTAL / (4 * BEAT)) + 2
    end_t = 37.0  # final chord lands with "No more tears"
    for b in range(bars):
        root, chord = PROG[b % 4]
        t0 = b * 4 * BEAT
        if t0 > end_t:
            break
        place(m, pad([mtof(n - 12) for n in chord], 4 * BEAT + 0.3), t0, 0.10)
        for i in range(8):
            at = t0 + i * BEAT / 2
            if at >= end_t - 0.05:
                break
            note = chord[ARP[(i + b) % 8]] + (12 if (b % 2 and i in (3, 7)) else 0)
            place(m, marimba(mtof(note), 0.5, 0.55 if i % 2 else 0.8), at, 0.32)
            place(m, shaker(1.0 if i % 2 else 0.5), at, 0.12)
        for i, off in enumerate([0, 1.5, 2, 3]):
            at = t0 + off * BEAT
            if at < end_t - 0.05:
                place(m, pluck_bass(mtof(root - 12 + (7 if i == 2 else 0))), at, 0.45)
        for off in (1, 3):
            at = t0 + off * BEAT
            if at < end_t - 0.05:
                place(m, snap(), at, 0.18)
    # final flourish + ringing chord
    for i, n in enumerate([65, 69, 72, 77, 81]):
        place(m, marimba(mtof(n), 1.6, 0.8), end_t + i * 0.06, 0.32)
    place(m, pad([mtof(n - 12) for n in (65, 69, 72)], 2.6), end_t, 0.14)
    place(m, pluck_bass(mtof(41), 1.6), end_t, 0.5)
    m = reverb(m[:N], 1.8, 0.22)
    # automation: tense dip under the alarm, swell at the payoff, fade at the end
    tl = np.arange(N) / SR
    g = np.ones(N)
    g *= np.interp(tl, [0, 0.25], [0, 1])
    g *= np.interp(tl, [23.7, 24.0, 25.7, 26.0], [1, 0.35, 0.35, 1])
    g *= np.interp(tl, [TOTAL - 1.0, TOTAL], [1, 0])
    return norm(m * g, 0.8)


if __name__ == "__main__":
    os.makedirs(f"{ROOT}/assets/audio", exist_ok=True)
    sf.write(f"{ROOT}/assets/audio/sfx.wav", build_sfx(), SR)
    sf.write(f"{ROOT}/assets/audio/music.wav", build_music(), SR)
    print("ok", TOTAL)
