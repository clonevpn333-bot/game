#!/usr/bin/env node
// Builds self-contained single-file HTML pages (no server needed):
//   dist/framebreak.html      – the full game with menu
//   dist/chapterN.html        – boots straight into chapter N
// Usage: ESBUILD=/path/to/node_modules/esbuild node tools/build.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const esbuild = createRequire(import.meta.url)(process.env.ESBUILD || 'esbuild');
const missing = { name: 'missing', setup(b) { b.onResolve({ filter: /^\.\.?\// }, (a) => { const p = resolve(a.resolveDir, a.path); return existsSync(p) ? null : { path: a.path, external: true }; }); } };
const out = await esbuild.build({ entryPoints: [resolve(root, 'src/main.js')], bundle: true, format: 'esm', minify: true, write: false, alias: { three: resolve(root, 'vendor/three.module.min.js'), 'cannon-es': resolve(root, 'vendor/cannon-es.js') }, plugins: [missing], logLevel: 'warning' });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script').replace(/<!--/g, '<\\!--'), css = readFileSync(resolve(root, 'style.css'), 'utf8');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const page = (chapter) => html
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>${css}</style>`)
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, () => (chapter ? `<script>window.__FB_CHAPTER=${chapter}</script>` : ''))
  .replace('<script type="module" src="src/main.js"></script>', () => `<script type="module">${js}</script>`);
mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/framebreak.html'), page(0));
const built = [];
for (let i = 1; i <= 18; i++) if (existsSync(resolve(root, `src/ch${i}/chapter${i}.js`))) { writeFileSync(resolve(root, `dist/chapter${i}.html`), page(i)); built.push(i); }
console.log('built chapters', built.join(','), '·', Math.round(js.length / 1024) + ' KB js');
