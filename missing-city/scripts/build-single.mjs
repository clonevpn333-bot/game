// Packs the production build into one self-contained HTML file: JS, CSS, fonts and characters inlined.
// Usage: npx vite build && node scripts/build-single.mjs [out.html]
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const out = process.argv[2] || 'dist/TheMissingCity.html';
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const b64 = (f) => readFileSync(join(dist, f)).toString('base64');

// stylesheet: inline woff2 fonts, drop the woff fallbacks
const cssLink = /<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/;
const cssFile = html.match(cssLink)[1];
let css = readFileSync(join(dist, cssFile), 'utf8');
// font urls are relative to the stylesheet's folder
const cssDir = cssFile.slice(0, cssFile.lastIndexOf('/') + 1);
css = css.replace(/,\s*url\([^)]+\.woff\)\s*format\(["']?woff["']?\)/g, '');
css = css.replace(/url\(["']?(?:\.\/)?([^)"']+\.woff2)["']?\)/g, (_, a) => `url(data:font/woff2;base64,${b64(cssDir + a.split('/').pop())})`);
if (/url\((?!data:)/.test(css)) throw new Error('unresolved url() left in CSS');
html = html.replace(cssLink, () => `<style>${css}</style>`);

// characters as data URLs, read by loadCharacter()
const dir = join(dist, 'assets/characters');
const glb = {};
for (const f of readdirSync(dir).filter((n) => n.endsWith('.glb'))) {
  glb[f.slice(0, -4)] = `data:model/gltf-binary;base64,${readFileSync(join(dir, f)).toString('base64')}`;
}
const glbScript = `<script>window.__GLB=${JSON.stringify(glb)};</script>`;

// app module, after the character table
const jsTag = /<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/;
const jsFile = html.match(jsTag)[1];
const js = readFileSync(join(dist, jsFile), 'utf8')
  .replace(/\/\/# sourceMappingURL=\S+\s*$/, '')
  .replace(/<\/script/gi, '<\\/script');
html = html.replace(jsTag, () => `${glbScript}\n<script type="module">${js}</script>`);

if (/(src|href)="\.\/assets\//.test(html)) throw new Error('unresolved asset reference left in HTML');
writeFileSync(out, html);
console.log(`${out}: ${(statSync(out).size / 1048576).toFixed(1)} MB`);
