"""
The Sleeping Kingdom: original soundtrack.

Every piece is written here as notes (no samples are copied, no external MIDI), then rendered
through FluidSynth with the FluidR3 General MIDI soundfont and encoded to MP3.
The whole score grows from one melody, the Hymn of Sleeping, a lullaby in D minor.

    python3 tools/compose_ost.py src/audio/music
"""
import os
import subprocess
import sys
import random
import mido

SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
TPB = 480  # ticks per beat

# General MIDI programs (0-based)
HARP, CELLO, VIOLIN, VIOLA, CONTRABASS, STRINGS, SLOW_STR, TREMOLO, PIZZ = 46, 42, 40, 41, 43, 48, 49, 44, 45
CHOIR, VOICE_OOH, FLUTE, OBOE, CLARINET, HORN, BRASS, TROMBONE, TUBA = 52, 53, 73, 68, 71, 60, 61, 57, 58
TIMPANI, TAIKO, BELLS, ORGAN, CELESTA, WARM_PAD = 47, 116, 14, 19, 8, 89

N = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n(name: str) -> int:
    """'D5' -> midi number."""
    pitch = name[:-1]
    octave = int(name[-1])
    return 12 * (octave + 1) + N[pitch]


# The Hymn of Sleeping (3/4). (note, beats)
HYMN = [
    ('D5', 1), ('F5', 1), ('A5', 1), ('G5', 1), ('F5', 1), ('E5', 1),
    ('F5', 1), ('D5', 1), ('E5', 1), ('C#5', 3),
    ('D5', 1), ('F5', 1), ('A5', 1), ('Bb5', 1), ('A5', 1), ('G5', 1),
    ('F5', 1), ('E5', 1), ('C#5', 1), ('D5', 3),
]
# Major-key resolution for the finale.
HYMN_MAJOR = [(p.replace('F5', 'F#5').replace('C#5', 'C#5').replace('Bb5', 'B5'), d) for p, d in HYMN]

# Chords per bar (root-position triads + bass), D minor.
PROG_HYMN = ['Dm', 'Gm', 'Dm', 'A', 'Dm', 'Bb', 'A', 'Dm']
CHORDS = {
    'Dm': ['D', 'F', 'A'], 'D': ['D', 'F#', 'A'], 'Gm': ['G', 'Bb', 'D'], 'G': ['G', 'B', 'D'], 'A': ['A', 'C#', 'E'],
    'Bb': ['Bb', 'D', 'F'], 'C': ['C', 'E', 'G'], 'F': ['F', 'A', 'C'], 'Em': ['E', 'G', 'B'], 'Bm': ['B', 'D', 'F#'],
    'Am': ['A', 'C', 'E'], 'Eb': ['Eb', 'G', 'Bb'], 'Cm': ['C', 'Eb', 'G'], 'Ddim': ['D', 'F', 'Ab'], 'C#dim': ['C#', 'E', 'G'],
}


def chord_notes(c: str, octave: int) -> list[int]:
    out = []
    prev = -1
    for p in CHORDS[c]:
        m = 12 * (octave + 1) + N[p]
        while m <= prev:
            m += 12
        out.append(m)
        prev = m
    return out


class Score:
    def __init__(self, bpm: float, beats_per_bar: int):
        self.bpm = bpm
        self.bpb = beats_per_bar
        self.tracks: list[dict] = []

    def track(self, program: int, vol: int = 100, pan: int = 64, reverb: int = 70, drums: bool = False) -> list:
        notes: list = []
        self.tracks.append({'program': program, 'vol': vol, 'pan': pan, 'reverb': reverb, 'notes': notes, 'drums': drums})
        return notes

    def write(self, path: str) -> None:
        mid = mido.MidiFile(ticks_per_beat=TPB)
        meta = mido.MidiTrack()
        meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(self.bpm), time=0))
        meta.append(mido.MetaMessage('time_signature', numerator=self.bpb, denominator=4, time=0))
        mid.tracks.append(meta)
        ch = 0
        for t in self.tracks:
            chan = 9 if t['drums'] else ch
            if not t['drums']:
                ch += 1
                if ch == 9:
                    ch += 1
            tr = mido.MidiTrack()
            tr.append(mido.Message('program_change', program=t['program'], channel=chan, time=0))
            tr.append(mido.Message('control_change', control=7, value=t['vol'], channel=chan, time=0))
            tr.append(mido.Message('control_change', control=10, value=t['pan'], channel=chan, time=0))
            tr.append(mido.Message('control_change', control=91, value=t['reverb'], channel=chan, time=0))
            tr.append(mido.Message('control_change', control=93, value=20, channel=chan, time=0))
            ev = []
            for beat, dur, note, vel in t['notes']:
                on = int(round(beat * TPB))
                off = int(round((beat + dur) * TPB)) - 2
                ev.append((on, 1, note, vel))
                ev.append((max(on + 1, off), 0, note, 0))
            ev.sort(key=lambda e: (e[0], e[1]))
            last = 0
            for tick, kind, note, vel in ev:
                msg = 'note_on' if kind else 'note_off'
                tr.append(mido.Message(msg, note=note, velocity=vel, channel=chan, time=tick - last))
                last = tick
            mid.tracks.append(tr)
        mid.save(path)

    def seconds(self, beats: float) -> float:
        return beats * 60.0 / self.bpm


def add_melody(notes: list, start: float, melody, transpose: int = 0, vel: int = 80, legato: float = 0.98, swell: bool = True) -> float:
    b = start
    for i, (p, d) in enumerate(melody):
        v = vel + (6 if d >= 2 else 0) + (int(4 * ((i % 3) == 0)) if swell else 0)
        notes.append((b, d * legato, n(p) + transpose, min(127, v)))
        b += d
    return b


def pad(notes: list, start: float, prog: list[str], beats_per_chord: float, octave: int, vel: int, bass: list | None = None, bass_oct: int = 2) -> None:
    b = start
    for c in prog:
        for m in chord_notes(c, octave):
            notes.append((b, beats_per_chord, m, vel))
        if bass is not None:
            bass.append((b, beats_per_chord, 12 * (bass_oct + 1) + N[CHORDS[c][0]], vel + 8))
        b += beats_per_chord


def arpeggio(notes: list, start: float, prog: list[str], beats_per_chord: int, octave: int, vel: int, pattern=(0, 1, 2, 1), step: float = 1.0) -> None:
    b = start
    for c in prog:
        tones = chord_notes(c, octave) + [chord_notes(c, octave)[0] + 12]
        t = 0.0
        i = 0
        while t < beats_per_chord - 1e-6:
            notes.append((b + t, step * 1.6, tones[pattern[i % len(pattern)] % len(tones)], vel - (i % 2) * 8))
            t += step
            i += 1
        b += beats_per_chord


# ============================================================================ pieces

def title() -> tuple[Score, float]:
    """The Sleeping Kingdom: harp lullaby, cello hymn, choir answering."""
    s = Score(66, 3)
    harp = s.track(HARP, 96, 50, 90)
    cello = s.track(CELLO, 100, 70, 80)
    strings = s.track(SLOW_STR, 78, 64, 100)
    choir = s.track(CHOIR, 72, 64, 110)
    bass = s.track(CONTRABASS, 80, 60, 70)
    flute = s.track(FLUTE, 70, 80, 100)
    bells = s.track(BELLS, 52, 40, 120)
    bars = 8 * 3  # three passes of the eight-bar hymn
    arpeggio(harp, 0, PROG_HYMN * 3, 3, 4, 70, pattern=(0, 1, 2, 3, 2, 1), step=0.5)
    pad(strings, 24, PROG_HYMN * 2, 3, 3, 46, bass)
    add_melody(cello, 0, HYMN, -12, 84)
    add_melody(flute, 24, HYMN, 0, 70)
    pad(choir, 48, PROG_HYMN, 3, 4, 52)
    add_melody(cello, 48, HYMN, -12, 88)
    for bar in (0, 8, 16, 24, 40, 56):
        bells.append((bar * 1.0, 6, n('D6'), 54))
    return s, bars * 3


def explore() -> tuple[Score, float]:
    """The Pilgrim Road / the Witchwood: oboe over walking strings and harp."""
    s = Score(84, 4)
    harp = s.track(HARP, 86, 44, 80)
    oboe = s.track(OBOE, 92, 76, 80)
    strings = s.track(STRINGS, 74, 64, 90)
    pizz = s.track(PIZZ, 80, 40, 60)
    bass = s.track(CONTRABASS, 78, 60, 60)
    horn = s.track(HORN, 66, 84, 90)
    prog = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A']
    arpeggio(harp, 0, prog * 2, 4, 4, 64, pattern=(0, 2, 1, 2), step=0.5)
    pad(strings, 0, prog * 2, 4, 3, 40, bass)
    b = 0.0
    for c in prog * 2:
        root = 12 * 4 + N[CHORDS[c][0]]
        for k in range(4):
            pizz.append((b + k, 0.5, root + (0 if k % 2 == 0 else 7), 58))
        b += 4
    tune = [('A4', 2), ('D5', 1), ('E5', 1), ('F5', 3), ('E5', 1), ('D5', 2), ('C5', 2), ('A4', 4),
            ('Bb4', 2), ('D5', 1), ('F5', 1), ('E5', 2), ('D5', 1), ('C#5', 1), ('D5', 8)]
    add_melody(oboe, 0, tune, 0, 76)
    add_melody(horn, 32, [(p, d) for p, d in HYMN], -12, 64)
    return s, 64


def dread() -> tuple[Score, float]:
    """Marsh, crypt, frozen camp: tremolo low strings, a pizzicato heartbeat, distant bells."""
    s = Score(60, 4)
    trem = s.track(TREMOLO, 90, 64, 100)
    pizz = s.track(PIZZ, 84, 50, 80)
    choir = s.track(VOICE_OOH, 66, 64, 120)
    bass = s.track(CONTRABASS, 96, 60, 70)
    bells = s.track(BELLS, 48, 30, 127)
    cello = s.track(CELLO, 80, 76, 90)
    prog = ['Dm', 'Eb', 'Dm', 'C#dim', 'Dm', 'Bb', 'Gm', 'A']
    pad(trem, 0, prog, 4, 3, 50, bass, 1)
    b = 0.0
    for _ in range(8):
        pizz.append((b, 0.4, n('D3'), 70))
        pizz.append((b + 0.75, 0.4, n('D3'), 52))
        b += 4
    pad(choir, 16, ['Dm', 'Eb', 'Gm', 'A'], 4, 4, 40)
    # The hymn's first phrase, slowed and broken, low in the cello.
    add_melody(cello, 8, [('D4', 3), ('F4', 3), ('A4', 6), ('G4', 3), ('F4', 3), ('E4', 6)], -12, 66)
    for at, note in ((0, 'A5'), (11, 'Eb6'), (22, 'D6'), (29, 'A5')):
        bells.append((at, 4, n(note), 44))
    return s, 32


def boss() -> tuple[Score, float]:
    """Bosses: war drums, driving strings, brass carrying the hymn as a battle cry."""
    s = Score(138, 4)
    taiko = s.track(TAIKO, 110, 64, 50)
    timp = s.track(TIMPANI, 110, 64, 60)
    strings = s.track(STRINGS, 104, 54, 60)
    low = s.track(CONTRABASS, 104, 64, 50)
    brass = s.track(BRASS, 100, 74, 70)
    trom = s.track(TROMBONE, 96, 84, 70)
    choir = s.track(CHOIR, 92, 64, 90)
    prog = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A'] * 2
    b = 0.0
    rng = random.Random(7)
    for i, c in enumerate(prog):
        tones = chord_notes(c, 3)
        for k in range(8):  # eighth-note ostinato
            strings.append((b + k * 0.5, 0.42, tones[(0, 0, 1, 0, 2, 0, 1, 0)[k]], 82 + (8 if k % 2 == 0 else 0)))
        low.append((b, 2, 12 * 3 + N[CHORDS[c][0]], 96))
        low.append((b + 2, 2, 12 * 3 + N[CHORDS[c][0]], 88))
        for k, v in ((0, 118), (1.5, 96), (2, 110), (3, 100), (3.5, 90)):
            taiko.append((b + k, 0.4, n('C3') if k in (0, 2) else n('D3'), v - rng.randint(0, 8)))
        if i % 2 == 0:
            timp.append((b, 1, 12 * 3 + N[CHORDS[c][0]], 110))
        b += 4
    pad(choir, 0, prog[:8], 4, 4, 70)
    # Hymn as a battle cry: doubled in brass and trombone, twice as fast and an octave down.
    battle = [(p, d * 2) for p, d in HYMN]
    add_melody(brass, 32, battle, -12, 100, legato=0.9)
    add_melody(trom, 32, battle, -24, 92, legato=0.9)
    pad(choir, 32, prog[8:], 4, 4, 82)
    return s, 64


def eye() -> tuple[Score, float]:
    """The Founder's eye: organ, choir, a world tilting."""
    s = Score(52, 4)
    organ = s.track(ORGAN, 96, 64, 110)
    choir = s.track(CHOIR, 92, 64, 120)
    bass = s.track(CONTRABASS, 100, 64, 80)
    timp = s.track(TIMPANI, 100, 64, 80)
    prog = ['Dm', 'Eb', 'Bb', 'A', 'Dm', 'Cm', 'Ddim', 'A']
    pad(organ, 0, prog, 4, 3, 76, bass, 1)
    pad(choir, 0, prog, 4, 4, 66)
    for b in range(0, 32, 4):
        timp.append((b, 2, n('D2'), 70 + (b % 8) * 3))
    return s, 32


def sorrow() -> tuple[Score, float]:
    """Endings and losses: solo violin over hushed strings."""
    s = Score(58, 3)
    violin = s.track(VIOLIN, 96, 70, 100)
    strings = s.track(SLOW_STR, 70, 60, 110)
    harp = s.track(HARP, 70, 44, 100)
    bass = s.track(CONTRABASS, 70, 60, 80)
    pad(strings, 0, PROG_HYMN * 2, 3, 3, 40, bass)
    arpeggio(harp, 24, PROG_HYMN, 3, 4, 50, pattern=(0, 1, 2), step=1)
    add_melody(violin, 0, HYMN, 0, 74)
    add_melody(violin, 24, HYMN, 12, 70)
    return s, 48


def dawn() -> tuple[Score, float]:
    """The finale: the hymn in D major, everyone together, bells at sunrise."""
    s = Score(70, 3)
    strings = s.track(STRINGS, 96, 64, 100)
    choir = s.track(CHOIR, 92, 64, 110)
    harp = s.track(HARP, 86, 40, 90)
    horn = s.track(HORN, 90, 84, 90)
    flute = s.track(FLUTE, 80, 76, 100)
    bass = s.track(CONTRABASS, 86, 60, 70)
    bells = s.track(BELLS, 66, 30, 120)
    timp = s.track(TIMPANI, 80, 64, 80)
    prog = ['D', 'G', 'D', 'A', 'D', 'G', 'A', 'D']
    major = [(p.replace('F5', 'F#5').replace('Bb5', 'B5'), d) for p, d in HYMN]
    arpeggio(harp, 0, prog * 2, 3, 4, 62, pattern=(0, 1, 2, 3, 2, 1), step=0.5)
    pad(strings, 0, prog * 2, 3, 3, 56, bass)
    pad(choir, 24, prog, 3, 4, 62)
    add_melody(horn, 0, major, -12, 80)
    add_melody(flute, 24, major, 0, 78)
    for bar in range(0, 16, 2):
        bells.append((bar * 3.0, 3, n('D6') if bar % 4 == 0 else n('A5'), 58))
    timp.append((24, 3, n('D2'), 80))
    timp.append((45, 3, n('A1'), 84))
    return s, 48


PIECES = {'title': title, 'explore': explore, 'dread': dread, 'boss': boss, 'eye': eye, 'sorrow': sorrow, 'dawn': dawn}


def render(name: str, fn, out_dir: str) -> None:
    score, beats = fn()
    loop_s = score.seconds(beats)
    # Render the piece twice back to back and keep the second pass: the reverb tail of the
    # first pass rings into its start, so the loop point is seamless.
    doubled = Score(score.bpm, score.bpb)
    for t in score.tracks:
        tr = doubled.track(t['program'], t['vol'], t['pan'], t['reverb'], t['drums'])
        for (b, d, note, v) in t['notes']:
            tr.append((b, d, note, v))
            tr.append((b + beats, d, note, v))
    mid = f'/tmp/ost_{name}.mid'
    wav = f'/tmp/ost_{name}.wav'
    doubled.write(mid)
    subprocess.run(['fluidsynth', '-ni', '-q', '-g', '0.7', '-r', '44100', '-o', 'synth.reverb.room-size=0.82', '-o', 'synth.reverb.width=0.9',
                    '-o', 'synth.reverb.level=0.75', '-F', wav, SF2, mid], check=True)
    out = os.path.join(out_dir, f'{name}.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{loop_s:.4f}', '-t', f'{loop_s:.4f}', '-i', wav,
                    '-af', 'loudnorm=I=-20:TP=-2:LRA=11', '-ac', '2', '-ar', '44100', '-b:a', '96k', out], check=True)
    print(f'{name}: {loop_s:.1f}s -> {out} ({os.path.getsize(out) // 1024} KB)')


if __name__ == '__main__':
    out_dir = sys.argv[1] if len(sys.argv) > 1 else 'src/audio/music'
    os.makedirs(out_dir, exist_ok=True)
    only = sys.argv[2:]
    for name, fn in PIECES.items():
        if only and name not in only:
            continue
        render(name, fn, out_dir)
