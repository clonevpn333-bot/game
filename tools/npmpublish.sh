#!/bin/sh
# Publishes the arcade to npm so it can be served from CDN domains that are not
# GitHub. Needs NPM_TOKEN in the environment (an npm "Automation" token).
#   NPM_TOKEN=npm_xxx sh tools/npmpublish.sh
set -e
[ -n "$NPM_TOKEN" ] || { echo "NPM_TOKEN is not set"; exit 1; }
node tools/bundle.js
cp dist/nova-arcade.html dist/npm/index.html
cd dist/npm
node -e "const p=require('./package.json');p.version=p.version.replace(/(\d+)$/,(m)=>(+m+1));require('fs').writeFileSync('package.json',JSON.stringify(p,null,2))"
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
npm publish --access public
V=$(node -p "require('./package.json').version")
N=$(node -p "require('./package.json').name")
rm -f .npmrc
echo ""
echo "Published $N@$V. Links:"
echo "  https://unpkg.com/$N@$V/index.html"
echo "  https://cdn.jsdelivr.net/npm/$N@$V/index.html"
echo "  https://esm.sh/$N@$V/index.html"
