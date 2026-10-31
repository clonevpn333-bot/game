# Per-speaker mouth-open envelopes at 30 fps from each placed line (for lip-sync).
import soundfile as sf, numpy as np, json, os
ROOT = os.path.dirname(os.path.abspath(__file__)); FPS = 30
tm = json.load(open(f"{ROOT}/timing.json")); N = int(tm["total"] * FPS) + 1
ALT = {5: "l05z", 6: "l06k", 18: "l18g"}
env = {}
for L in tm["lines"]:
    a, sr = sf.read(f"{ROOT}/assets/vo/{ALT.get(L['i'], 'l%02d' % L['i'])}.wav")
    hop = sr // 100; e = np.array([np.sqrt(np.mean(a[k:k+hop]**2)) for k in range(0, len(a)-hop, hop)])
    on = np.where(e > e.max() * 0.05)[0][0] * 0.01; st = L["start"] - on
    arr = env.setdefault(L["who"], [0.0] * N)
    for f in range(N):
        t = f / FPS - st
        k = int(t * 100)
        if 0 <= k < len(e): arr[f] = max(arr[f], float(min(1, (e[k] / (e.max() * 0.55)) ** 0.8)))
for k in env: env[k] = [round(x, 2) for x in env[k]]
json.dump(env, open(f"{ROOT}/../remotion/src/three/lips.json", "w"))
print({k: sum(1 for x in v if x > 0.2) for k, v in env.items()})
