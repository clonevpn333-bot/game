// Bundles CITY.EXE (all modules, Three.js, CSS) into one self-contained HTML file.
// Usage: node tools/build-single.mjs [out.html]   (needs esbuild: npm i -D esbuild)
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || resolve(root, 'dist/cityexe.html'));

const vendor = {
  name: 'vendor-three',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: resolve(root, 'vendor/three.module.js') }));
    b.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: resolve(root, 'vendor/addons', a.path.slice('three/addons/'.length)) }));
  },
};

const res = await build({
  entryPoints: [resolve(root, 'js/main.js')],
  bundle: true, format: 'esm', minify: true, write: false, target: 'es2022',
  plugins: [vendor], legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(resolve(root, 'css/style.css'), 'utf8');
let html = readFileSync(resolve(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]*>/, () => `<style>\n${css}\n</style>`);
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '');
html = html.replace(/<script type="module" src="js\/main.js"><\/script>/, () => `<script type="module">\n${js}\n</script>`);
const license = readFileSync(resolve(root, 'vendor/THREE-LICENSE'), 'utf8').split('\n').find((l) => l.includes('Copyright')) || 'three.js authors';
html = html.replace('<head>', () => `<head>\n<!-- CITY.EXE single-file build. Includes three.js (${license.trim()}, MIT). -->`);
import('node:fs').then(({ mkdirSync }) => { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, html); console.log(out, (html.length / 1024).toFixed(0) + ' KB'); });
