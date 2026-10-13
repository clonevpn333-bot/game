#!/usr/bin/env bash
# Export recipe/mesh data from the game's Luau modules and render preview PNGs.
# Usage: tools/preview/run.sh <luau binary> <work dir with node_modules (three, playwright-core)> <out dir>
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
luau="$1"; work="$2"; out="$3"
SPEC_DIR="$here" node "$root/tools/test.js" "$luau" > "$work/raw.txt" 2>&1 || true
python3 - "$work" <<'PY'
import sys, json
work = sys.argv[1]
s = open(work + "/raw.txt").read()
if "@@JSON@@" not in s:
    print(s[-2000:]); sys.exit(1)
j = s.split("@@JSON@@")[1].split("@@END@@")[0]
json.loads(j)
open(work + "/data.json", "w").write(j)
print("exported", len(j) // 1024, "KB")
PY
node "$here/render.js" "$work" "$out"
