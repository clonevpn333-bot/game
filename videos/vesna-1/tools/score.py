# WHY WE WONDER ep.8 PART 1 "The Fall": ORIGINAL score "Freefall" — composed FIRST (MUSIC RULE), 120 bpm, E minor.
#   0–3      HOOK    wind roar + impact on frame 1, low drone
#   3.0      HIT     the second hook ("never supposed to be on that plane"); pulse starts
#   3–7 RISE · 7–10.75 ALARM (urgent build, riser) · 10.75–11 drop-out
#   11–17    DROP    the blast (11.0) and the fall: heavy beat, falling motif
#   17       CRASH   impact, then QUIET snow + wind (17–20.25) · 20.25–22 heartbeat · 22–26.5 LIFT (alive, record)
#   26.5–27  silence · 27–30.25 CLIFF dark drone, ticking (gap 29.75–30.25) · STINGER on "lie" (30.25)
#   30.25–35.5 OUTRO suspense pulse under SUBSCRIBE FOR PART 2
import json, os, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, '..', '_shared', 'tools'))
from sfxlib import *  # noqa

TOTAL = 35.5
N = int(TOTAL * SR)
VO = json.load(open(os.path.join(ROOT, 'vo', 'assets', 'timing.json')))
BPM = 120.0
B = 60.0 / BPM          # 0.5 s
BAR = 4 * B             # 2 s
S16 = B / 4

# sections (seconds) — shared with the visuals (pf/src/timeline.js cues)
HOOK, A, BSEC, RISE, DROP, BREAK, LIFT, OUTRO = 0, 3.0, 7.0, 10.75, 11.0, 20.25, 22.0, 30.25
QUIET = 17.0
QUIET_D = 3.2
SIL0, SIL1 = 26.5, 27.0
CLIFF = 27.0
GAP0, GAP1 = 29.75, 30.25
OFF0, OFF1 = 10.75, 11.0

CH = {
    'Em': [52, 55, 59, 64, 67], 'C': [48, 55, 60, 64, 67], 'Am': [45, 52, 57, 60, 64], 'B': [47, 54, 59, 63, 66],
    'G': [43, 50, 55, 59, 62], 'D': [50, 54, 57, 62, 66],
}
ROOT_ = {'Em': 40, 'C': 36, 'Am': 33, 'B': 35, 'G': 31, 'D': 38}


def section(t):
    if t < A: return 'hook'
    if t < BSEC: return 'rise'
    if t < OFF0: return 'alarm'
    if t < OFF1: return 'off'
    if t < QUIET: return 'drop'
    if t < BREAK: return 'quiet'
    if t < LIFT: return 'break'
    if t < SIL0: return 'lift'
    if t < SIL1: return 'sil'
    if t < OUTRO: return 'cliff'
    return 'outro'


SEC_START = {'hook': 0, 'rise': A, 'alarm': BSEC, 'off': OFF0, 'drop': DROP, 'quiet': QUIET, 'break': BREAK, 'lift': LIFT, 'sil': SIL0, 'cliff': CLIFF, 'outro': OUTRO}
PROGS = {'hook': ['Em'], 'rise': ['Em', 'C', 'Am', 'B'], 'alarm': ['Em', 'C', 'Am', 'B'], 'off': ['B'], 'drop': ['Em', 'C', 'Am', 'B'],
         'quiet': ['Em'], 'break': ['Em', 'C'], 'lift': ['C', 'G', 'D', 'Em'], 'sil': ['Em'], 'cliff': ['Em', 'C'], 'outro': ['Em', 'C', 'Am', 'B']}


def chord_at(t):
    sec = section(t)
    k = int((t - SEC_START[sec] + 1e-6) // BAR)
    pr = PROGS[sec]
    return pr[k % len(pr)]


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
    nbeats = int(TOTAL / B)
    for bi in range(nbeats):
        t0 = bi * B
        sec = section(t0)
        if sec in ('off', 'sil', 'quiet'): continue
        ch = chord_at(t0); notes = CH[ch]; r = ROOT_[ch]
        kb = int(round((t0 - SEC_START[sec]) / B))           # beat index inside the section
        # --- arp (16ths): creeps in during the rise, full in the drop, absent in the break
        if sec not in ('hook', 'break', 'cliff'):
            pat = [0, 2, 3, 1, 2, 4, 3, 2]
            for k in range(4):
                at = t0 + k * S16
                if at >= TOTAL - 1.0: break
                mm = notes[pat[(bi * 4 + k) % 8] % len(notes)] + (12 if sec in ('alarm', 'drop', 'lift') else 0) + (12 if sec == 'drop' and k == 3 else 0)
                if sec == 'rise': bright, g = 700 + 2200 * (t0 - A) / (BSEC - A), 0.05 + 0.08 * (t0 - A) / (BSEC - A)
                elif sec == 'alarm': bright, g = 3400, 0.13
                elif sec == 'drop': bright, g = 4400, 0.17
                elif sec == 'lift': bright, g = 3600, 0.14
                else: bright, g = 1500, 0.08 * max(0.0, 1 - max(0.0, at - 33.5) / 2.0)
                P(arp_note(mtof(mm), S16 * 0.95, bright), at, g)
        # --- drums
        if sec == 'hook':
            if kb in (0, 2): P(kick(0.6), t0, 0.7)
        elif sec == 'rise':
            if t0 < 4.25: P(kick(), t0, 0.5) if kb % 2 == 0 else None
            else: P(kick(), t0, 0.6)
            if t0 >= 6.5 and kb % 2 == 1: P(clap(), t0, 0.3)
            if t0 >= 4.25: P(hat(), t0 + B / 2, 0.12)
        elif sec in ('alarm', 'drop', 'lift'):
            P(kick(), t0, 1.0 if sec == 'drop' else 0.75)
            if kb % 2 == 1: P(clap(), t0, 0.5 if sec == 'drop' else 0.38)
            P(hat(open_=True), t0 + B / 2, 0.15)
            if sec == 'drop':
                P(hat(), t0 + S16, 0.06); P(hat(), t0 + 3 * S16, 0.06)
        elif sec == 'outro':
            if kb % 2 == 0 and t0 < TOTAL - 1.5: P(kick(0.5), t0, 0.55)
        elif sec == 'cliff':
            P(hat(), t0, 0.08); P(hat(), t0 + B / 2, 0.05)
        # --- bass
        if sec == 'hook':
            for k in range(2): P(sub(mtof(r + 12), B / 2 * 0.9), t0 + k * B / 2, 0.35)
        elif sec in ('rise', 'alarm', 'lift'):
            for k in range(2): P(sub(mtof(r + 12), B / 2 * 0.9) + 0.25 * saw(mtof(r + 12), B / 2 * 0.9, (0,), 500), t0 + k * B / 2, 0.42)
        elif sec == 'drop':
            for o, d in ((0, 0.2), (0.375, 0.1)):
                P(reese(mtof(r + 12), d), t0 + o, 0.45)
        elif sec in ('outro', 'cliff') and kb % 4 == 0:
            P(sub(mtof(r + 12), BAR * 0.95), t0, 0.35)
        # --- pads (one per bar from the alarm on)
        if kb % 4 == 0 and sec in ('rise', 'alarm', 'drop', 'break', 'lift', 'cliff', 'outro'):
            cut = {'rise': 1100, 'alarm': 1700, 'drop': 2600, 'break': 900, 'lift': 2400, 'cliff': 700, 'outro': 900}[sec]
            P(padv([n + 12 for n in notes[1:4]], BAR + 0.3, cut), t0, 0.15 if sec != 'rise' else 0.1)
        # --- drop lead (the beam motif) and lift lead
        if sec == 'drop' and kb % 4 == 0:
            motif = [(0, 76, 0.75), (0.75, 71, 0.25), (1.0, 79, 0.5), (1.5, 78, 0.5)] if (kb // 4) % 2 == 0 else [(0, 76, 0.5), (0.5, 74, 0.5), (1.0, 71, 0.75), (1.75, 71, 0.25)]
            for o, mm, d in motif: P(lead(mm, d * BAR * 0.95), t0 + o * BAR, 0.11)
        if sec == 'lift' and kb % 4 == 0 and t0 >= 23.0:
            for o, mm, d in ([(0, 72, 1.0), (1.0, 74, 0.5), (1.5, 76, 0.5)] if (kb // 4) % 2 == 0 else [(0, 79, 1.0), (1.0, 78, 1.0)]):
                P(lead(mm, d * BAR * 0.95), t0 + o * BAR, 0.08)
    # HOOK: low drone under the wind
    P(lp(saw(mtof(28), 3.2, (-12, 0, 12), 200), 160) * adsr(int(3.2 * SR), 0.01, 3.2, 1, 0.3), 0.0, 0.5)
    # falling motif in the drop: a descending lead line, one note per beat (the fall)
    for k, mm in enumerate([83, 81, 79, 78, 76, 74, 72, 71, 69, 67, 66, 64]):
        P(lead(mm, B * 0.9), DROP + 0.5 + k * B, 0.07)
    # ALARM: riser, reverse swell into the blast
    tr = tt(1.0); P(bp(noise(1.0), 500, 7000) * (tr / 1.0) ** 2, 9.75, 0.35)
    for k in range(16): P(clap(0.12), 9.75 + k / 16, 0.08 + 0.25 * k / 16)
    P(lp(noise(0.25), 3000)[::-1] * np.linspace(0, 1, int(0.25 * SR)) ** 3, OFF0, 0.3)
    # QUIET: a cold low pad under the snow
    P(padv([52, 59, 64], QUIET_D, 600), QUIET + 0.6, 0.12)
    # BREAK: heartbeat returns (alive)
    for k in range(4): P(kick(0.3), BREAK + k * B, 0.5); P(kick(0.25), BREAK + k * B + 0.17, 0.3)
    # CLIFF: a low drone; swell into the stinger
    P(lp(saw(mtof(28), GAP0 - CLIFF, (-10, 0, 10), 220), 180) * adsr(int((GAP0 - CLIFF) * SR), 0.3, 1, 1, 0.2), CLIFF, 0.45)
    P(lp(noise(0.4), 4000)[::-1] * np.linspace(0, 1, int(0.4 * SR)) ** 4, GAP1 - 0.4, 0.25)
    P(bell(82.4, 4.0), GAP1, 0.32); P(sweep_sine(90, 30, 1.6, 0.5) * adsr(int(1.6 * SR), 0.005, 1.6, 1, 0.5), GAP1, 0.5)
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
    # hard silences: the drop-out before the flash, the half-beat before "He didn't" (reverb tails cut too)
    gate = np.interp(tm, [0, OFF0, OFF0 + 0.05, OFF1 - 0.02, OFF1, QUIET - 0.01, QUIET + 0.08, SIL0, SIL0 + 0.06, SIL1 - 0.02, SIL1, GAP0, GAP0 + 0.06, GAP1 - 0.42, GAP1, 34.5, TOTAL], [1, 1, 0.25, 0.4, 1, 1, 0.6, 0.6, 0.0, 0.0, 1, 1, 0.0, 0.0, 1, 1, 0])
    energy = np.interp(tm, [0, 0.4, 2.9, 3.0, 7.0, 10.75, 11.0, 16.9, 17.0, 20.25, 22.0, 26.4, 27.0, 30.2, 30.25, TOTAL], [1.0, 0.75, 0.65, 0.8, 0.9, 1.0, 1.35, 1.25, 0.6, 0.9, 1.5, 1.45, 0.9, 0.9, 0.85, 0.7])
    return m * duck * gate * energy


def hum(d, f=50):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * f * k * t) / k for k in (1, 2, 3, 5, 7))
    return lp(s, 900) * (1 + 0.15 * np.sin(2 * np.pi * 7 * t))


def flatline(d=0.9, f=1000):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * adsr(len(t), 0.004, d, 1, 0.02) * 0.35


def wind(d, lo=200, hi=2500):
    t = tt(d)
    return bp(noise(d), lo, hi) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t) ** 2)


def build_sfx():
    s = np.zeros(N + 4 * SR)
    P = lambda x, at, g=1.0: place(s, x, at, g)
    # HOOK: freefall — roaring wind on frame 1, impact
    P(boom(), 0.0, 0.6); P(wind(3.0, 300, 4000) * np.linspace(1, 0.7, int(3.0 * SR)), 0.0, 0.5)
    P(whoosh(0.14, 900, 6000), 1.45, 0.3); P(stamp(), 2.16, 0.5)                # NO PARACHUTE stamp
    # 3.0 SECOND HOOK: the fall rewinds — tape-stop + hit
    P(sweep_sine(600, 60, 0.35, 1.5) * expdec(int(0.35 * SR), 0.2), 2.75, 0.35); P(boom(), 3.0, 0.7); P(thud(60), 3.0, 0.5)
    P(stamp(), 4.0, 0.45)                                                        # card stamped
    for a in (5.5, 6.14, 7.05, 7.6): P(whoosh(0.2, 800, 6000), a - 0.03, 0.25)   # cards slide / shuffle
    P(stamp(), 8.2, 0.6); P(thud(70), 8.2, 0.4)                                  # ASSIGNED
    P(whoosh(0.5, 300, 4000), 8.6, 0.3); P(sparkle(0.6, 8, 3), 8.95, 0.15)       # card → point of light → jet
    P(hum(2.0, 90) * np.linspace(0.2, 1, int(2.0 * SR)), 9.0, 0.12)            # engines
    # 11.0 THE BLAST
    P(boom(), DROP, 1.0); P(sweep_sine(120, 30, 1.6, 0.5) * adsr(int(1.6 * SR), 0.005, 1.6, 1, 0.4), DROP, 0.6)
    P(crunch(), DROP + 0.05, 0.5); P(hp(noise(1.2), 2500) * expdec(int(1.2 * SR), 0.35), DROP, 0.35)
    P(wind(5.7, 200, 3000), DROP + 0.3, 0.35)                                   # the fall
    # 17.0 THE CRASH into snow
    P(boom(), QUIET, 1.0); P(crunch(), QUIET, 0.7); P(thud(50), QUIET, 0.8); P(lp(noise(1.5), 1500) * expdec(int(1.5 * SR), 0.4), QUIET + 0.05, 0.5)
    P(wind(3.2, 150, 900), QUIET + 0.4, 0.22)                                   # cold wind
    for k in range(3): P(bp(noise(0.25), 900, 3000) * expdec(int(0.25 * SR), 0.1), 19.6 + k * 0.22, 0.08)   # distant screams (filtered)
    # X-ray: crack + snap
    P(crunch(), 21.0, 0.35); P(snap(), 21.35, 0.4)
    for k in range(3): P(ding(1000, 0.16), BREAK + 0.02 + k * 0.5, 0.12)
    P(boom(), 22.16, 0.55)                                                       # ALIVE.
    P(stamp(), 24.0, 0.45); P(sparkle(1.0, 12, 5), 24.0, 0.18)                  # record certificate
    # CLIFF: newspaper, then the stinger + rip on "lie"
    P(whoosh(0.4, 300, 3000), 27.0, 0.3)
    for k in range(12): P(tick(), 27.25 + k * 0.25, 0.1)
    P(bp(noise(0.5), 1500, 7000) * expdec(int(0.5 * SR), 0.15), GAP1, 0.45)     # the certificate rips
    P(boom(), GAP1, 0.7)
    P(whoosh(0.3, 800, 6000), 30.95, 0.3); P(ding(1568, 1.0), 31.0, 0.12)        # SUBSCRIBE
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
