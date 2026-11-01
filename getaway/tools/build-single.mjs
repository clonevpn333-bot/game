// Build a single self-contained HTML file (game + Three.js + CSS inlined) that runs from file://.
// Usage: node tools/build-single.mjs [path/to/esbuild]   -> dist/getaway.html
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esbuild = process.argv[2] || 'esbuild';
const dist = path.join(root, 'dist'); fs.mkdirSync(dist, { recursive: true });
const tmp = path.join(dist, '_bundle.js');
execFileSync(esbuild, [
  path.join(root, 'src/main.js'), '--bundle', '--format=esm', '--minify', '--target=es2022',
  `--alias:three=${path.join(root, 'vendor/three/three.module.min.js')}`,
  `--alias:three/addons=${path.join(root, 'vendor/three/addons')}`,
  `--outfile=${tmp}`, '--log-level=warning',
], { stdio: 'inherit' });
const js = fs.readFileSync(tmp, 'utf8').replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(root, 'styles/main.css'), 'utf8');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="styles\/main.css">/, () => `<style>\n${css}\n</style>`);
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, '');
// built-in modelled cars (assets/cars/*.glb) ride along as base64 so the single file is self-contained
const carDir = path.join(root, 'assets/cars'); const cars = {};
if (fs.existsSync(carDir)) for (const f of fs.readdirSync(carDir)) if (f.endsWith('.glb')) cars[f.slice(0, -4)] = fs.readFileSync(path.join(carDir, f)).toString('base64');
const embed = `<script>window.__EMBED_CARS = ${JSON.stringify(cars)};</script>`;
html = html.replace(/<script type="module" src="src\/main.js"><\/script>/, () => `${embed}\n<script type="module">\n${js}\n</script>`);
fs.writeFileSync(path.join(dist, 'getaway.html'), html);
fs.unlinkSync(tmp);
console.log('wrote dist/getaway.html', (fs.statSync(path.join(dist, 'getaway.html')).size / 1e6).toFixed(2), 'MB');
