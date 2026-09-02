#!/bin/sh
# Local copies of the two CDN libraries, used only by the test harness so it
# can run offline.  The shipped dist/index.html always points at cdnjs.
set -e
cd "$(dirname "$0")/.."
mkdir -p vendor
tmp=$(mktemp -d)
( cd "$tmp" && npm pack three@0.128.0 peerjs@1.5.4 >/dev/null )
tar xzf "$tmp"/three-0.128.0.tgz -C "$tmp" package/build/three.min.js
cp "$tmp/package/build/three.min.js" vendor/three.min.js
tar xzf "$tmp"/peerjs-1.5.4.tgz -C "$tmp"
cp "$tmp/package/dist/peerjs.min.js" vendor/peerjs.min.js
rm -rf "$tmp"
echo "vendored three r128 + peerjs 1.5.4 into vendor/"
