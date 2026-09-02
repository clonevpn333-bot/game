#!/usr/bin/env node
/* Bundles src/ modules into a single self-contained HTML file. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const ORDER = fs.readFileSync(path.join(SRC, 'manifest.txt'), 'utf8')
  .split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));

let js = '';
for (const f of ORDER) {
  const p = path.join(SRC, f);
  if (!fs.existsSync(p)) { console.error('MISSING ' + f); process.exit(1); }
  js += '\n/* ==== ' + f + ' ==== */\n' + fs.readFileSync(p, 'utf8').replace(/\r/g, '');
}

const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8');
const shell = fs.readFileSync(path.join(SRC, 'shell.html'), 'utf8');

const out = shell
  .replace('/*{{CSS}}*/', () => css)
  .replace('/*{{JS}}*/', () => "(function(){'use strict';\n" + js + "\n})();");

const dests = process.argv.slice(2);
if (!dests.length) dests.push(path.join(ROOT, 'dist', 'index.html'));
for (const d of dests) {
  fs.mkdirSync(path.dirname(d), { recursive: true });
  fs.writeFileSync(d, out);
}
console.log('built ' + (out.length / 1024).toFixed(1) + ' KB -> ' + dests.join(', '));
