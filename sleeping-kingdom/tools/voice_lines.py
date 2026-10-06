"""
Voice every spoken line in the game with Piper (offline neural TTS, voices from rhasspy/piper).

Lines are pulled straight from the chapter scripts, cast to a voice per speaker, given a little
character (pitch, pace, room) with ffmpeg, and written as small MP3s plus a manifest the game
reads for timing and lookup.

    python3 tools/voice_lines.py /tmp/voices src/audio/voice src/audio/voices.json
"""
import glob
import hashlib
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

VOICE_DIR, OUT_DIR, MANIFEST = sys.argv[1], sys.argv[2], sys.argv[3]
SRC = 'src/game'
CONST = {'CALDER': 'Ser Calder', 'IVARR': 'Ser Ivarr', 'MORVANE': 'Archdeacon Morvane'}

STR = r"'((?:[^'\\]|\\.)*)'"


def unjs(s: str) -> str:
    s = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)
    return s.replace("\\'", "'").replace('\\"', '"').replace('\\\\', '\\')


def who(tok: str) -> str:
    tok = tok.strip()
    if tok in CONST:
        return CONST[tok]
    if tok.startswith("'"):
        return unjs(tok[1:-1])
    return ''


def extract() -> list[tuple[str, str]]:
    lines: list[tuple[str, str]] = []
    for path in sorted(glob.glob(f'{SRC}/*.ts')):
        src = open(path, encoding='utf-8').read()
        for m in re.finditer(r"(?:this|g\.hud|game\.hud)\.say\(\s*(CALDER|IVARR|MORVANE|'(?:[^'\\]|\\.)*')\s*,\s*" + STR, src):
            lines.append((who(m.group(1)), unjs(m.group(2))))
        for m in re.finditer(r"this\.think\(\s*" + STR, src):
            lines.append(('', unjs(m.group(1))))
        for m in re.finditer(r"\[\s*(CALDER|IVARR|MORVANE|'(?:[^'\\]|\\.)*')\s*,\s*" + STR + r"\s*(?:,\s*[\d.]+\s*)?\]", src):
            lines.append((who(m.group(1)), unjs(m.group(2))))
        for m in re.finditer(r"narr:\s*\[(.*?)\]", src, re.S):
            for s in re.finditer(STR, m.group(1)):
                lines.append(('Narrator', unjs(s.group(1))))
        # Townsfolk chatter table.
        tm = re.search(r"const TALK[^=]*=\s*\{(.*?)\n\};", src, re.S)
        if tm:
            for e in re.finditer(r"^\s*('?[\w ]+'?)\s*:\s*\[(.*?)\],?$", tm.group(1), re.M):
                name = e.group(1).strip("'")
                for s in re.finditer(STR, e.group(2)):
                    lines.append((name, unjs(s.group(1))))
    seen = set()
    out = []
    for sp, tx in lines:
        if '${' in tx or not tx.strip():
            continue
        k = (sp, tx)
        if k not in seen:
            seen.add(k)
            out.append(k)
    return out


# ---------------------------------------------------------------- casting
MODELS = {
    'alan': 'en-gb-alan-low.onnx',
    'ryan': 'en-us-ryan-high.onnx',
    'libri': 'en-us-libritts-high.onnx',
    'female': 'en-gb-southern_english_female-low.onnx',
}
_loaded: dict = {}


def model(name: str) -> PiperVoice:
    if name not in _loaded:
        _loaded[name] = PiperVoice.load(os.path.join(VOICE_DIR, MODELS[name]))
    return _loaded[name]


def synth(model_name: str, text: str, speaker: int | None, pace: float, path: str) -> None:
    cfg = SynthesisConfig(speaker_id=speaker, length_scale=pace, noise_scale=0.62, noise_w_scale=0.8)
    with wave.open(path, 'wb') as w:
        model(model_name).synthesize_wav(text, w, syn_config=cfg)


def f0_of(path: str) -> float:
    with wave.open(path) as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
    hop = int(sr * 0.04)
    f0s = []
    for i in range(0, len(a) - hop * 2, hop):
        seg = a[i:i + hop * 2]
        if np.sqrt(np.mean(seg ** 2)) < 600:
            continue
        seg = seg - seg.mean()
        ac = np.correlate(seg, seg, 'full')[len(seg) - 1:]
        lo, hi = int(sr / 320), int(sr / 70)
        lag = lo + int(np.argmax(ac[lo:hi]))
        if ac[lag] > 0.3 * ac[0]:
            f0s.append(sr / lag)
    return float(np.median(f0s)) if f0s else 0.0


def libri_cast() -> tuple[list[int], list[int]]:
    """Sort LibriTTS speakers by pitch to find deep male and bright female voices."""
    cache = '/tmp/libri_f0.json'
    if os.path.exists(cache):
        d = json.load(open(cache))
    else:
        d = {}
        for sid in range(0, 160, 2):
            p = f'/tmp/libri_probe_{sid}.wav'
            synth('libri', 'The bells were never for prayer, ser. Listen to me.', sid, 1.0, p)
            d[str(sid)] = f0_of(p)
        json.dump(d, open(cache, 'w'))
    males = sorted([int(k) for k, v in d.items() if 70 < v < 135], key=lambda k: d[str(k)])
    females = sorted([int(k) for k, v in d.items() if v > 175], key=lambda k: -d[str(k)])
    return males, females


def cast_table(males: list[int], females: list[int]) -> dict:
    m = lambda i: males[i % len(males)]
    f = lambda i: females[i % len(females)]
    # name: (model, speaker, pace, pitch, room)  room: 0 dry, 1 hall, 2 cathedral, 3 ghost, 4 inner thought
    return {
        'Ser Calder': ('alan', None, 1.02, 0.92, 0),
        '': ('alan', None, 1.08, 0.92, 4),
        'Narrator': ('ryan', None, 1.12, 0.94, 1),
        'Ser Ivarr': ('ryan', None, 1.02, 0.86, 0),
        'Ser Ivarr the Hollow': ('ryan', None, 1.02, 0.86, 0),
        'Ivarr’s letter': ('ryan', None, 1.1, 0.9, 4),
        'Archdeacon Morvane': ('libri', m(0), 1.18, 0.9, 2),
        'Brother Ives': ('libri', m(3), 1.1, 1.02, 0),
        'Brother Aldo': ('libri', m(5), 1.05, 1.06, 3),
        'Choirmaster Oswin': ('ryan', None, 1.15, 0.76, 2),
        'Choir Zealot': ('libri', m(7), 0.95, 1.0, 1),
        'Gatewarden': ('libri', m(1), 1.0, 0.95, 0),
        'Watchman': ('libri', m(2), 1.0, 1.0, 0),
        'Porter': ('libri', m(4), 0.95, 1.0, 0),
        'Tanner': ('libri', m(6), 1.0, 1.0, 0),
        'Old Bram': ('libri', m(8), 1.15, 0.97, 0),
        'Spice Merchant': ('libri', m(9), 0.95, 1.02, 0),
        'Lamplighter': ('libri', m(10), 1.05, 1.0, 0),
        'Pilgrim': ('libri', m(11), 1.1, 1.0, 0),
        'Mendicant': ('libri', m(12), 1.2, 0.92, 0),
        'Washerwoman': ('libri', f(2), 1.0, 1.0, 0),
        'Goodwife Ama': ('libri', f(3), 0.98, 1.0, 0),
        'Boy': ('libri', f(0), 0.95, 1.12, 0),
        'Old Tamsin': ('female', None, 1.12, 0.88, 0),
        'Mother Sallow': ('female', None, 1.2, 0.84, 1),
        'Wren': ('female', None, 0.95, 1.1, 0),
        'Thornwife': ('female', None, 1.0, 0.9, 1),
    }


ROOMS = {
    0: '',
    1: ',aecho=0.8:0.6:40|70:0.18|0.1',
    2: ',aecho=0.8:0.7:90|160|240:0.3|0.2|0.12',
    3: ',aecho=0.8:0.8:120|240:0.35|0.25,highpass=f=220',
    4: ',lowpass=f=5200,volume=0.82,aecho=0.8:0.5:30:0.15',
}


def fx(src: str, dst: str, pitch: float, room: int) -> float:
    with wave.open(src) as w:
        sr = w.getframerate()
    # Pitch shift without changing pace: resample, then restore the tempo.
    chain = f'asetrate={int(sr * pitch)},aresample=22050,atempo={1 / pitch:.4f},highpass=f=70{ROOMS[room]},loudnorm=I=-17:TP=-2'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af', chain, '-ac', '1', '-ar', '22050', '-b:a', '40k', dst], check=True)
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst], capture_output=True, text=True)
    return float(out.stdout.strip())


def spoken(text: str) -> str:
    t = text.replace('…', ', ').replace('—', ', ').replace('–', ', ')
    return re.sub(r'\s+', ' ', t).strip()


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    males, females = libri_cast()
    cast = cast_table(males, females)
    # The array pattern also matches colour/name and title pairs; only cast speakers are dialogue.
    lines = [(sp, tx) for sp, tx in extract() if sp in cast]
    manifest = {}
    if os.path.exists(MANIFEST):
        manifest = json.load(open(MANIFEST))
    missing = set()
    for sp, tx in lines:
        key = f'{sp}|{tx}'
        h = hashlib.sha1(key.encode()).hexdigest()[:12]
        name = f'{h}.mp3'
        dst = os.path.join(OUT_DIR, name)
        if key in manifest and os.path.exists(dst):
            continue
        c = cast.get(sp)
        if not c:
            missing.add(sp)
            c = ('libri', males[len(sp) % len(males)], 1.0, 1.0, 0)
        mdl, spk, pace, pitch, room = c
        raw = f'/tmp/vl_{h}.wav'
        synth(mdl, spoken(tx), spk, pace, raw)
        dur = fx(raw, dst, pitch, room)
        manifest[key] = {'f': name, 'd': round(dur, 2)}
        os.remove(raw)
    keep = {f'{sp}|{tx}' for sp, tx in lines}
    manifest = {k: v for k, v in manifest.items() if k in keep}
    json.dump(manifest, open(MANIFEST, 'w'), indent=0, ensure_ascii=False)
    used = {v['f'] for v in manifest.values()}
    for f in os.listdir(OUT_DIR):
        if f not in used:
            os.remove(os.path.join(OUT_DIR, f))
    total = sum(os.path.getsize(os.path.join(OUT_DIR, v['f'])) for v in manifest.values())
    print(f'{len(manifest)} lines, {total // 1024} KB; uncast speakers: {sorted(missing)}')


if __name__ == '__main__':
    main()
