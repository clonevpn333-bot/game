# WHY WE WONDER ep.7: the man who put his head in a particle accelerator. ORIGINAL score "Cold Beam" — composed FIRST
# (MUSIC RULE), 120 bpm (beat 0.5 s, bar 2 s), E minor, dark Soviet analog synth. The narration and every shot sit on this grid.
#   0–2   HOOK     impact + sub on frame 1, arp already running
#   2–8   A        16th arp, four-on-floor, pulsing sub (Em C Am B)
#   8–14  B        + claps, open hats, octave arp, pad
#   14–16 RISE     riser; full drop-out 15.25 → the flash
#   16–24 DROP     the beam hits: saw bass, heavy kick, lead stabs (Em Em C B)
#   24–27 BREAK    pad + heart monitor (doctors waited)
#   27–32 LIFT     "He didn't." — C G D Em, brighter drive
#   32–40 OUTRO    half-time, bell, arp dissolves under the wordmark
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
BPM = 120.0
B = 60.0 / BPM          # 0.5 s
BAR = 4 * B             # 2 s
S16 = B / 4

# sections (seconds) — shared with the visuals (pf/src/timeline.js cues)
HOOK, A, BSEC, RISE, DROP, BREAK, LIFT, OUTRO = 0, 2, 8, 14, 16, 24, 27, 32

CH = {
    'Em': [52, 55, 59, 64, 67], 'C': [48, 55, 60, 64, 67], 'Am': [45, 52, 57, 60, 64], 'B': [47, 54, 59, 63, 66],
    'G': [43, 50, 55, 59, 62], 'D': [50, 54, 57, 62, 66],
}
ROOT_ = {'Em': 40, 'C': 36, 'Am': 33, 'B': 35, 'G': 31, 'D': 38}


def chord_at(t):
    bi = int(t // BAR)
    if t < BSEC + 6: prog = ['Em', 'C', 'Am', 'B']
    elif t < BREAK: prog = ['Em', 'Em', 'C', 'B']
    elif t < LIFT: prog = ['Em', 'C']
    elif t < OUTRO: prog = ['C', 'G', 'D', 'Em']
    else: prog = ['Em', 'C', 'Em', 'Em']
    return prog[bi % len(prog)]


def saw(f, d, det=(0,), cutoff=3000):
    t = tt(d)
    s = sum(2 * ((f * (1 + c / 1200) * t + k * 0.13) % 1) - 1 for k, c in enumerate(det)) / len(det)
    return lp(s, cutoff)


def arp_note(f, d, bright=2400):
    s = saw(f, d, (-7, 0, 7), bright) * 0.7 + np.sign(np.sin(2 * np.pi * f * tt(d))) * 0.25
    return s * adsr(len(s), 0.002, d * 0.6, 0.3, 0.03)


def kick(d=0.42, g=1.0):
    x = sweep_sine(150, 40, d, 0.18) * expdec(int(d * SR), 0.17)
    c = bp(noise(0.008), 2000, 8000) * 0.35
    x[:len(c)] += c
    return x * g


def clap(d=0.25):
    x = np.zeros(int(d * SR))
    for o in (0, 0.011, 0.022):
        place(x, bp(noise(d - o), 900, 5000) * expdec(int((d - o) * SR), 0.05 if o == 0.022 else 0.008), o, 0.6)
    return x


def hat(open_=False):
    d = 0.2 if open_ else 0.05
    return hp(noise(d), 7500) * expdec(int(d * SR), 0.06 if open_ else 0.012)


def sub(f, d):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * adsr(len(t), 0.004, d, 0.9, 0.04)


def reese(f, d):
    # drop bass: detuned saws, filter opening on each hit, saturated
    t = tt(d)
    s = saw(f, d, (-14, -5, 5, 14), 900 + 0 * t[0])
    env = np.exp(-t * 6)
    s = lp(s, 1400) * (0.55 + 0.45 * env)
    return np.tanh(s * 2.2) * adsr(len(t), 0.003, d, 0.9, 0.03) + sub(f, d) * 0.7


def padv(notes, d, cutoff=1800):
    t = tt(d)
    s = sum(saw(mtof(m), d, (-9, 0, 9), cutoff) for m in notes) / len(notes)
    a = min(int(0.4 * SR), len(t) // 3)
    env = np.ones(len(t)); env[:a] = np.linspace(0, 1, a); env[-a:] = np.linspace(1, 0, a)
    return s * env * (1 + 0.1 * np.sin(2 * np.pi * 0.5 * t))


def lead(m, d):
    t = tt(d)
    f = mtof(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 4 - 0.4, 0, 1))
    ph = np.cumsum(f) / SR
    s = (2 * (ph % 1) - 1) * 0.6 + np.sign(np.sin(2 * np.pi * ph)) * 0.3
    return lp(s, 3800) * adsr(len(t), 0.005, d * 0.5, 0.6, 0.08)


def bell(f=110, d=4.0):
    t = tt(d)
    s = sum(a * np.sin(2 * np.pi * f * m_ * t) * np.exp(-t * dec) for m_, a, dec in [(0.5, 0.6, 0.6), (1, 1, 0.8), (1.19, 0.5, 1.1), (1.5, 0.45, 1.3), (2, 0.4, 1.6), (2.74, 0.3, 2.2), (3.76, 0.2, 3)])
    return s * adsr(len(t), 0.003, d, 1, 0.3)


def build_music():
    m = np.zeros(N + 4 * SR)
    P = lambda s, at, g=1.0: place(m, s, at, g)
    nb = int(TOTAL / BAR)
    for bi in range(nb):
        t0 = bi * BAR
        ch = chord_at(t0)
        notes = CH[ch]
        r = ROOT_[ch]
        sec_drop = DROP <= t0 < BREAK
        sec_lift = LIFT - 1 <= t0 < OUTRO
        # --- arp: 16ths, pattern climbs through the chord, octave up from B on
        if t0 < BREAK or t0 >= LIFT - 1:
            pat = [0, 2, 3, 1, 2, 4, 3, 2]
            for k in range(16):
                at = t0 + k * S16
                if at >= TOTAL - 1.5: break
                if 15.25 <= at < 16.0: continue                    # drop-out before the flash
                if BREAK <= at < LIFT: continue
                mm = notes[pat[k % 8] % len(notes)] + (12 if t0 >= BSEC else 0) + (12 if (sec_drop and k % 4 == 3) else 0)
                bright = 1400 + 2600 * min(1, max(0, (at - A) / 13)) if at < DROP else (4200 if sec_drop else 3200)
                if at >= OUTRO: bright = max(700, 3000 - (at - OUTRO) * 330)
                g = 0.17 if (at < A or sec_drop) else 0.12
                if at >= OUTRO: g *= max(0.0, 1 - (at - OUTRO) / 7.5)
                P(arp_note(mtof(mm), S16 * 0.95, bright), at, g)
        # --- drums
        if t0 < BREAK or t0 >= LIFT - 1:
            for k in range(4):
                at = t0 + k * B
                if 15.25 <= at < 16.0 or BREAK <= at < LIFT: continue
                if at >= OUTRO:  # half time
                    if k in (0,) and at < TOTAL - 4: P(kick(0.6), at, 0.7)
                    continue
                P(kick(), at, 1.0 if sec_drop else (0.8 if t0 < A else 0.55))
                if (t0 >= BSEC or sec_lift) and k in (1, 3): P(clap(), at, 0.5 if sec_drop else 0.38)
            for k in range(8):
                at = t0 + k * B / 2 + B / 4 * 0
                if 15.25 <= at < 16.0 or BREAK <= at < LIFT or at >= OUTRO: continue
                if k % 2 == 1: P(hat(open_=(t0 >= BSEC)), at, 0.16)
                elif sec_drop or sec_lift: P(hat(), at, 0.1)
            if sec_drop:
                for k in range(16):
                    if k % 2: P(hat(), t0 + k * S16, 0.06)
        # --- bass
        if t0 < BREAK or t0 >= LIFT - 1:
            if sec_drop:
                for k, (o, d) in enumerate(((0, 0.36), (0.75, 0.2), (1.0, 0.36), (1.5, 0.2), (1.75, 0.2))):
                    P(reese(mtof(r + 12), d), t0 + o * (BAR / 2), 0.42)
                    P(reese(mtof(r + 12), d), t0 + BAR / 2 + o * (BAR / 2), 0.42)
            elif t0 < OUTRO:
                for k in range(8):
                    at = t0 + k * B / 2
                    if 15.25 <= at < 16.0: continue
                    P(sub(mtof(r + 12), B / 2 * 0.9) + 0.25 * saw(mtof(r + 12), B / 2 * 0.9, (0,), 500), at, 0.42 if t0 >= A else 0.6)
            else:
                P(sub(mtof(r + 12), BAR * 0.95), t0, 0.4)
        # --- pads
        if t0 >= BSEC:
            cut = 2600 if (sec_drop or sec_lift) else 1500
            if BREAK - 1 <= t0 < LIFT - 1: cut = 900
            P(padv([n + 12 for n in notes[1:4]], BAR + 0.3, cut), t0, 0.16)
        # --- drop lead stabs (the beam motif: E — B — G — F#)
        if sec_drop:
            motif = [(0, 76, 0.75), (0.75, 71, 0.25), (1.0, 79, 0.5), (1.5, 78, 0.5)]
            if bi % 2 == 1: motif = [(0, 76, 0.5), (0.5, 74, 0.5), (1.0, 71, 0.75), (1.75, 71, 0.25)]
            for o, mm, d in motif: P(lead(mm, d * B * 2 * 0.95), t0 + o * B * 2, 0.11)
        if sec_lift and t0 >= LIFT:
            for o, mm, d in [(0, 72, 1.0), (1.0, 74, 0.5), (1.5, 76, 0.5)] if bi % 2 == 0 else [(0, 79, 1.0), (1.0, 78, 1.0)]:
                P(lead(mm, d * B * 2 * 0.95), t0 + o * B * 2, 0.08)
    # BREAK: heartbeat + low pad (doctors wait)
    for k in range(6):
        at = BREAK + k * B
        if at >= LIFT - 0.25: break
        P(kick(0.3), at, 0.5); P(kick(0.25), at + 0.17, 0.3)
    # rise into the drop: noise riser + snare roll 14–15.25
    t = tt(1.25)
    P(bp(noise(1.25), 500, 7000) * (t / 1.25) ** 2, 14.0, 0.35)
    for k in range(20):
        at = 14.0 + k * 1.25 / 20
        P(clap(0.12), at, 0.08 + 0.25 * k / 20)
    P(lp(noise(0.75), 3000)[::-1] * np.linspace(0, 1, int(0.75 * SR)) ** 3, 15.25, 0.3)   # reverse swell into 16.0
    # LIFT re-entry: build 26.75 → 27.0
    P(bp(noise(0.5), 2000, 9000) * np.linspace(0, 1, int(0.5 * SR)) ** 2, 26.5, 0.2)
    # OUTRO bells
    P(bell(82.4, 6.0), OUTRO, 0.32); P(bell(164.8, 4.0), 35.5, 0.14)
    P(padv([64, 67, 71, 76], 7.6, 1400), OUTRO, 0.17)
    m = m[:N]
    m = reverb(m, 1.8, 0.18)
    tm = np.arange(N) / SR
    duck = np.ones(N)
    for line in VO['lines']:
        for w in line['words']:
            a, b = int((w['s'] - 0.05) * SR), int((w['e'] + 0.08) * SR)
            duck[max(0, a):min(N, b)] = 0.62
    k = int(0.08 * SR)
    duck = np.convolve(duck, np.ones(k) / k, mode='same')
    ride = np.interp(tm, [0, 32.0, 34.0, 38.0, 40.0], [1, 1, 0.8, 0.55, 0])
    return m * duck * ride


def hum(d, f=50):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * f * k * t) / k for k in (1, 2, 3, 5, 7))
    return lp(s, 900) * (1 + 0.15 * np.sin(2 * np.pi * 7 * t))


def flatline(d=0.9, f=1000):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * adsr(len(t), 0.004, d, 1, 0.02) * 0.35


def build_sfx():
    s = np.zeros(N + 4 * SR)
    P = lambda x, at, g=1.0: place(s, x, at, g)
    # HOOK: beam tears through on frame 1
    P(boom(), 0.0, 0.7); P(zap(0.6), 0.0, 0.5); P(whoosh(0.3, 800, 7000), 0.0, 0.4)
    P(hum(2.0, 50) * np.linspace(1, 0, int(2.0 * SR)), 0.0, 0.18)
    for a in (1.0, 2.0): P(whoosh(0.14, 900, 6000), a - 0.05, 0.28); P(thud(70), a, 0.35)
    P(whoosh(0.4, 3000, 300, up=False), 2.75, 0.35)
    # USSR 1978: stamp + teletype
    P(stamp(), 3.5, 0.6); P(thud(60), 3.5, 0.4)
    for k in range(4): P(tick(), 4.3 + k * 0.125, 0.3)                 # 1978 digits
    P(pop(520, 0.12), 4.95, 0.35)                                        # pin drops on Protvino
    # accelerator: power-up hum under the ring sequence
    hd = 15.25 - 6.5
    P(hum(hd, 50) * np.linspace(0.3, 1, int(hd * SR)) ** 2, 6.5, 0.2)
    P(whoosh(0.5, 300, 4000), 6.0, 0.3)
    for a in (8.0, 10.0): P(whoosh(0.2, 800, 6000), a - 0.1, 0.25)
    P(lock(), 10.9, 0.4)                                               # the broken part
    # safety failure: alarm buzz on the beats 12–15
    for k in range(6): P(buzz(), 12.0 + k * 0.5, 0.18)
    P(siren(1.5), 13.5, 0.12)
    P(stamp(), 13.39, 0.7); P(thud(60), 13.39, 0.5)                    # FAILED
    # THE FLASH (16.0)
    P(boom(), 16.0, 1.0); P(sweep_sine(120, 30, 1.6, 0.5) * adsr(int(1.6 * SR), 0.005, 1.6, 1, 0.4), 16.0, 0.6)
    P(hp(noise(1.2), 2500) * expdec(int(1.2 * SR), 0.35), 16.0, 0.35); P(shing(1.6, 3200), 16.0, 0.35)
    P(sparkle(1.0, 12, 5), 17.0, 0.18)
    # dose counter ticks + slam
    for k in range(14): P(tick(), 19.5 + k * 0.1, 0.12 + 0.01 * k)
    P(thud(60), 21.0, 0.6); P(stamp(), 21.0, 0.4)
    # face splits / swells
    P(whoosh(0.35, 300, 3000), 23.0, 0.3); P(crunch(), 23.6, 0.25)
    # heart monitor beeps on the beat, flat-line held into "to die", then silence
    for k in range(4): P(ding(1000, 0.16), 24.52 + k * 0.5, 0.14)
    P(flatline(0.6), 26.35, 0.1)
    # "He didn't." — hit
    P(boom(), 27.0, 0.75); P(whoosh(0.2, 800, 7000), 26.9, 0.3)
    for a in (28.5, 30.0, 31.0): P(whoosh(0.16, 900, 6000), a - 0.05, 0.25)
    P(stamp(), 28.75, 0.35)                                            # PhD seal
    # outro
    P(whoosh(0.8, 300, 5000), 31.8, 0.3)
    P(sparkle(1.4, 14, 7), 36.95, 0.22); P(ding(1568, 1.2), 38.4, 0.13)
    return reverb(s[:N], 1.4, 0.2)


if __name__ == '__main__':
    mus = build_music()
    sfx = build_sfx()
    mix = mus * 0.62 + sfx * 0.8
    mix = np.tanh(mix / max(1e-9, np.abs(mix).max()) * 1.4) * 0.75
    out = os.path.join(ROOT, 'remotion', 'public', 'score.wav')
    sf.write(out, mix.astype(np.float32), SR)
    sx = np.tanh(sfx / max(1e-9, np.abs(sfx).max()) * 1.2) * 0.7
    sf.write(os.path.join(ROOT, 'remotion', 'public', 'sfx.wav'), sx.astype(np.float32), SR)
    mu = np.tanh(mus / max(1e-9, np.abs(mus).max()) * 1.2) * 0.7
    sf.write(os.path.join(ROOT, 'remotion', 'public', 'music_only.wav'), mu.astype(np.float32), SR)
    print('wrote', out, round(N / SR, 2), 's')
