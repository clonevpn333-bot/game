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
// launcher: a tiny page that opens a blank tab (about:blank) and writes the whole game into it
const payload = JSON.stringify(html).replace(/</g, '\\u003c');
const launcher = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CITY.EXE</title>
<style>html,body{height:100%;margin:0;background:#0b0d10;color:#e8e6e0;font:16px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;text-align:center}
b{font:700 34px ui-monospace,monospace;letter-spacing:.04em}b i{color:#5ce0c8;font-style:normal}button{margin-top:22px;padding:14px 38px;font:600 17px system-ui;border:0;border-radius:10px;background:#5ce0c8;color:#0b0d10;cursor:pointer}
p{opacity:.6;font-size:13px;margin-top:14px}</style></head><body><div><b>CITY<i>.EXE</i></b><br><button id="go">Launch</button><p id="m">Opens the game in a blank tab.</p></div>
<script>const GAME=${payload};
function launch(){const w=window.open('about:blank','_blank');if(!w){document.getElementById('m').textContent='Pop-up blocked: allow pop-ups for this file and press Launch again.';return;}
w.document.open();w.document.write(GAME);w.document.close();}
document.getElementById('go').onclick=launch;</script></body></html>`;
import('node:fs').then(({ mkdirSync }) => {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html); console.log(out, (html.length / 1024).toFixed(0) + ' KB');
  const lout = out.replace(/\.html$/, '') + '-launcher.html';
  writeFileSync(lout, launcher); console.log(lout, (launcher.length / 1024).toFixed(0) + ' KB');
});
