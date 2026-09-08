#!/usr/bin/env node
/* A single file with nothing left to fetch.
 *
 * The shipped dist/index.html pulls three.js and PeerJS from cdnjs, which is
 * fine on the open web and useless anywhere offline - inside an arcade page
 * that decodes its games from base64, on a school laptop with no network.
 * This inlines the two vendored copies so the result needs nothing at all.
 *
 *   node tools/fetch-vendor.sh          # once, to populate vendor/
 *   node tools/build.js dist/index.html
 *   node tools/offline.js dist/index.html dist/crux-offline.html
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const src = process.argv[2] || path.join(ROOT, 'dist', 'index.html');
const out = process.argv[3] || path.join(ROOT, 'dist', 'crux-offline.html');

const PAIRS = [
  ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'three.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js', 'peerjs.min.js'],
];

let html = fs.readFileSync(src, 'utf8');
for (const [url, file] of PAIRS) {
  const tag = '<script src="' + url + '"></script>';
  if (html.indexOf(tag) < 0) throw new Error('no script tag for ' + file);
  const lib = fs.readFileSync(path.join(ROOT, 'vendor', file), 'utf8');
  html = html.replace(tag, '<script>' + lib + '</script>');
}
if (html.indexOf('cdnjs.cloudflare.com') >= 0) throw new Error('a CDN reference survived');
fs.writeFileSync(out, html);
console.log('offline ' + (html.length / 1024).toFixed(0) + ' KB -> ' + out);
