// Builds dist/marchlight.html: the whole game in one self-contained file that runs by
// double-clicking (no server). Bundles the sources, three.js, Rapier and the sculpt worker.
// Needs esbuild at build time only:  node tools/build-single.mjs [path/to/esbuild/package]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esbuildDir = process.argv[2] || process.env.ESBUILD_DIR;
const require = createRequire(esbuildDir ? path.join(esbuildDir, 'noop.js') : import.meta.url);
const esbuild = require('esbuild');
const alias = {
  three: path.join(root, 'vendor/three/three.module.js'),
  rapier: path.join(root, 'vendor/rapier/rapier.es.js'),
};
// three/addons/... -> vendor/three/addons/...
const addons = { name: 'addons', setup(b) { b.onResolve({ filter: /^three\/addons\// }, a => ({ path: path.join(root, 'vendor/three/addons', a.path.slice('three/addons/'.length)) })); } };
const common = { bundle: true, minify: true, write: false, alias, plugins: [addons], target: 'es2020', logLevel: 'warning', legalComments: 'none' };
const worker = await esbuild.build({ ...common, entryPoints: [path.join(root, 'src/characters/sculpt.worker.js')], format: 'iife' });
const main = await esbuild.build({ ...common, entryPoints: [path.join(root, 'src/main.js')], format: 'esm', supported: { 'top-level-await': true } });
const workerSrc = worker.outputFiles[0].text, mainSrc = main.outputFiles[0].text;
// cache key for the anatomy pieces: hash of the sculpting sources
let h = 2166136261;
for (const f of ['src/characters/anatomy.js', 'src/characters/sculpt.js']) { const t = fs.readFileSync(path.join(root, f), 'utf8'); for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); }
const css = fs.readFileSync(path.join(root, 'css/game.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script type="module"'));
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const out = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MARCHLIGHT</title>
<style>${css}</style>
</head>
<body>${body}<script>window.__SCULPT_HASH = ${JSON.stringify((h >>> 0).toString(36))}; window.__SCULPT_WORKER_SRC = ${safe(JSON.stringify(workerSrc))};</script>
<script type="module">${safe(mainSrc)}</script>
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const file = path.join(root, 'dist/marchlight.html');
fs.writeFileSync(file, out);
console.log('wrote', file, (out.length / 1048576).toFixed(2) + ' MB');
