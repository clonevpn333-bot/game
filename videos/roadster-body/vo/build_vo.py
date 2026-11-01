# Lays the cast lines on the master timeline (STARTS), writes vo.wav + timing.json with estimated word timings.
import soundfile as sf, numpy as np, json, re, os
ROOT = os.path.dirname(os.path.abspath(__file__))
rows = [l.rstrip("\n").split("\t") for l in open(f"{ROOT}/script.tsv") if l.strip()]
GAP = {2: 0.3, 3: 0.35, 6: 0.45, 7: 0.3, 9: 0.45, 10: 0.4, 11: 0.45}
STARTS = None
TOTAL = 43.0
ALT = {}
def syl(w):
    w = re.sub(r"[^a-z]", "", w.lower()); n = len(re.findall(r"[aeiouy]+", w))
    if w.endswith("e") and n > 1 and not w.endswith("le"): n -= 1
    return max(1, n)
SR = 24000; mix = np.zeros(int(TOTAL * SR) + SR); out = []
for i, (sp, v, s, text) in enumerate(rows):
    a, sr = sf.read(f"{ROOT}/assets/vo/{ALT.get(i+1, f'l{i+1:02d}')}.wav"); assert sr == SR
    if a.ndim > 1: a = a.mean(1)
    hop = int(sr * 0.01); e = np.array([np.sqrt(np.mean(a[k:k+hop]**2)) for k in range(0, len(a)-hop, hop)])
    idx = np.where(e > e.max() * 0.05)[0]; s0, s1 = idx[0] * 0.01, idx[-1] * 0.01
    if i == 0: START = 0.12
    else: START = prev_end + GAP.get(i + 1, 0.2)
    st = START - s0
    p = int(st * SR); mix[p:p+len(a)] += a
    words = text.split(); ws = [syl(w) + 0.35 + (0.5 if re.search(r"[,.!?]$", w) else 0) for w in words]; tot = sum(ws); c = START; wt = []
    for w, x in zip(words, ws):
        d = (s1 - s0) * x / tot; wt.append({"w": w, "s": round(c, 3), "e": round(c + d, 3)}); c += d
    out.append({"i": i + 1, "who": sp, "text": text, "start": round(START, 3), "end": round(st + s1, 3), "words": wt})
    prev_end = st + s1
mix = mix[:int(TOTAL * SR)]; mix *= 0.89 / np.abs(mix).max()
sf.write(f"{ROOT}/vo.wav", mix, SR)
json.dump({"total": TOTAL, "lines": out}, open(f"{ROOT}/timing.json", "w"), indent=1)
for o in out: print(o["i"], o["who"], o["start"], o["end"], o["text"][:50])
