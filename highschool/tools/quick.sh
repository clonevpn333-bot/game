#!/bin/bash
# Quick check (~2 min): build, every scene once, 2 autoplay days, normal + safe.
# Full run (~25 min, for milestones): node tools/test.mjs
cd "$(dirname "$0")/.." || exit 1
python3 tools/build.py >/dev/null || exit 1
echo "== normal ==";  node tools/test.mjs 1 2 2>&1 | grep -v dbus | grep -E "hook runs|ERRORS|No errors|TypeError|ReferenceError" -A3 | head -20
echo "== safe ==";    HS_URL="file://$PWD/dist/highschool-safe.html" node tools/test.mjs 1 2 2>&1 | grep -v dbus | grep -E "safe version|ERRORS|No errors|TypeError|ReferenceError" -A3 | head -20
