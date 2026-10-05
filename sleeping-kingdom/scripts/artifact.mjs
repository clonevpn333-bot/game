// Turn the single-file release into an artifact page body (host supplies doctype/head/body).
import fs from 'node:fs';
let h = fs.readFileSync('release/the-sleeping-kingdom.html', 'utf8');
h = h.replace(/<!doctype html>/i, '').replace(/<\/?html[^>]*>/gi, '').replace(/<\/?head>/gi, '').replace(/<\/?body>/gi, '')
  .replace(/<meta[^>]*>/gi, '').replace(/<link rel="icon"[^>]*>/gi, '');
const title = h.match(/<title>[^<]*<\/title>/)[0];
h = title + '\n<style>:root{color-scheme:dark;background:#05060c}body{background:#05060c}</style>\n' + h.replace(title, '');
fs.writeFileSync('release/play.html', h);
console.log((h.length / 1024).toFixed(0), 'KB');
