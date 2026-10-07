#!/usr/bin/env node
// Inlines the production build (dist/) into one self-contained HTML file.
// Usage: npm run build && node scripts/make-single-file.mjs [out.html]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const out = path.resolve(process.argv[2] ?? 'the-last-procession.html');
let html = readFileSync(path.join(dist, 'index.html'), 'utf8');
const assets = readdirSync(path.join(dist, 'assets'));
const read = (f) => readFileSync(path.join(dist, 'assets', f), 'utf8');

for (const f of assets.filter((f) => f.endsWith('.css'))) {
  const re = new RegExp(`<link[^>]+href="/assets/${f.replace('.', '\\.')}"[^>]*>`);
  html = html.replace(re, () => `<style>\n${read(f)}\n</style>`);
}
for (const f of assets.filter((f) => f.endsWith('.js'))) {
  const re = new RegExp(`<script[^>]+src="/assets/${f.replace('.', '\\.')}"[^>]*></script>`);
  // escape closing tags so the inline module can't terminate early; drop the sourcemap hint
  const js = read(f).replace(/<\/script/gi, '<\\/script').replace(/\/\/# sourceMappingURL=.*$/m, '');
  html = html.replace(re, () => `<script type="module">\n${js}\n</script>`);
}
if (/(src|href)="\/assets\//.test(html)) throw new Error('an asset reference was not inlined');
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
