# Usage: python3 timing.py <project>. Builds the master timeline: VO line placement + estimated word timings.
import soundfile as sf, numpy as np, json, re, os
import sys
ROOT = os.path.abspath(sys.argv[1])
lines = [l.strip() for l in open(f"{ROOT}/script.txt") if l.strip()]
# gap BEFORE each line (scene changes get more air), from gaps.json
cfg = json.load(open(f"{ROOT}/gaps.json"))
gap_before = cfg["gaps"]
TAIL = cfg.get("tail", 1.6)
assert len(gap_before) == len(lines), (len(gap_before), len(lines))

def analyze(path):
    a, sr = sf.read(path)
    if a.ndim > 1: a = a.mean(1)
    hop = int(sr * 0.01)
    e = np.array([np.sqrt(np.mean(a[i:i+hop]**2)) for i in range(0, len(a)-hop, hop)])
    idx = np.where(e > e.max()*0.04)[0]
    gaps, prev = [], idx[0]
    for i in idx[1:]:
        if i - prev > 8: gaps.append((prev*0.01, i*0.01))
        prev = i
    return a, sr, idx[0]*0.01, idx[-1]*0.01, gaps

def syl(w):
    w = re.sub(r"[^a-z]", "", w.lower())
    n = len(re.findall(r"[aeiouy]+", w))
    if w.endswith("e") and n > 1 and not w.endswith("le"): n -= 1
    return max(1, n)

t = 0.0; out = []; mix = []
for i, text in enumerate(lines):
    a, sr, s0, s1, gaps = analyze(f"{ROOT}/assets/vo/l{i+1:02d}.wav")
    t += gap_before[i]
    start = t
    words = text.split()
    # phrase breaks after words ending in punctuation (not the last word)
    breaks = [k for k, w in enumerate(words[:-1]) if re.search(r"[,?.!]$", w)]
    big = [g for g in gaps if g[1]-g[0] >= 0.2]
    spans = []
    if len(big) == len(breaks):
        edges = [s0] + [x for g in big for x in g] + [s1]
        spans = [(edges[2*j], edges[2*j+1]) for j in range(len(breaks)+1)]
    else:
        spans = None
    groups, cur = [], []
    for k, w in enumerate(words):
        cur.append(w)
        if k in breaks: groups.append(cur); cur = []
    groups.append(cur)
    if spans is None:
        # one span, weights across all words
        groups = [words]; spans = [(s0, s1)]
    wt = []
    for g, (a0, a1) in zip(groups, spans):
        ws = [syl(w) + 0.35 for w in g]; tot = sum(ws); c = a0
        for w, x in zip(g, ws):
            d = (a1 - a0) * x / tot
            wt.append({"w": w, "s": round(start + c, 3), "e": round(start + c + d, 3)}); c += d
    out.append({"i": i+1, "text": text, "start": round(start, 3), "dur": round(len(a)/sr, 3),
                "speechEnd": round(start + s1, 3), "words": wt})
    mix.append((start, a, sr))
    t = start + s1
total = round(t + TAIL, 2)
sr = mix[0][2]
buf = np.zeros(int((total + 1) * sr))
for st, a, _ in mix:
    o = int(st * sr); buf[o:o+len(a)] += a
buf = buf[:int(total*sr)]
peak = np.abs(buf).max(); buf = buf / peak * 0.89
sf.write(f"{ROOT}/assets/audio/vo.wav", buf, sr)
json.dump({"total": total, "lines": out}, open(f"{ROOT}/assets/timing.json", "w"), indent=1)
open(f"{ROOT}/assets/timing.js", "w").write("window.TIMING = " + json.dumps({"total": total, "lines": out}) + ";\n")
for l in out: print(l["i"], l["start"], l["speechEnd"], l["text"])
print("total", total)
