#!/usr/bin/env bash
# Fetch the CC0 MakeHuman base mesh + morph targets used by build_characters.py.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)/mhdata"
mkdir -p "$DIR"
curl -sSfL -o "$DIR/base.obj" https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/3dobjs/base.obj
TMP="$(mktemp -d)"
pip download makehuman==1.3.2 --no-deps -d "$TMP" -q
python3 -c "import zipfile,sys,glob; z=zipfile.ZipFile(glob.glob(sys.argv[1]+'/*.whl')[0]); open(sys.argv[2],'wb').write(z.read('makehuman/data/targets.npz'))" "$TMP" "$DIR/targets.npz"
rm -rf "$TMP"
echo "MakeHuman data ready in $DIR (CC0, makehumancommunity.org)"
