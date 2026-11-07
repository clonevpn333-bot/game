// Builds one self-contained HTML file: all code bundled and inlined, every
// texture / HDRI / model embedded as base64 and served to three.js through a
// URL modifier. Usage: node tools/build-single.mjs [out.html]
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist', 'the-last-version.html'));

// esbuild is only needed at build time; install it into a temp dir, not the project
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tlv-build-'));
execSync('npm install --no-save --no-package-lock --silent esbuild@0.24.0', { cwd: tmp, stdio: 'inherit' });
const esbuild = await import(pathToFileURL(path.join(tmp, 'node_modules', 'esbuild', 'lib', 'main.js')).href);

// entry: the virtual file system module must evaluate before the game boots,
// so it lives in its own module imported first (an entry's own body runs last)
const vfsMod = path.join(tmp, 'vfs.js'), entry = path.join(tmp, 'entry.js');
await fs.writeFile(vfsMod, `
import * as THREE from 'three';
const VFS = window.__VFS || {}, blobs = new Map();
THREE.DefaultLoadingManager.setURLModifier((url) => {
  const i = url.indexOf('assets/');
  if (i < 0) return url;
  const key = decodeURIComponent(url.slice(i).split('?')[0]);
  const rec = VFS[key];
  if (!rec) return url;
  if (!blobs.has(key)) {
    const bin = atob(rec[1]), bytes = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    blobs.set(key, URL.createObjectURL(new Blob([bytes], { type: rec[0] })));
  }
  return blobs.get(key);
});
`);
await fs.writeFile(entry, `import ${JSON.stringify(vfsMod)};\nimport ${JSON.stringify(path.join(root, 'src', 'main.js'))};\n`);

const threePlugin = {
  name: 'three-vendor',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: path.join(root, 'vendor/three/build/three.module.js') }));
    b.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: path.join(root, 'vendor/three/addons', a.path.slice('three/addons/'.length)) }));
  },
};
const res = await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', target: 'es2020', minify: true, write: false, plugins: [threePlugin], legalComments: 'inline', logLevel: 'warning' });
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

// assets → base64 records
const MIME = { '.jpg': 'image/jpeg', '.png': 'image/png', '.hdr': 'application/octet-stream', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream' };
const vfs = {};
async function walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (MIME[path.extname(e.name).toLowerCase()]) vfs[path.relative(root, p).split(path.sep).join('/')] = [MIME[path.extname(e.name).toLowerCase()], (await fs.readFile(p)).toString('base64')];
  }
}
await walk(path.join(root, 'assets'));

const css = await fs.readFile(path.join(root, 'css/main.css'), 'utf8');
let html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
html = html
  .replace('<link rel="stylesheet" href="css/main.css">', () => `<style>\n${css}\n</style>`)
  .replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '')
  .replace('<script type="module" src="src/main.js"></script>', () => `<script>window.__VFS=${JSON.stringify(vfs)};</script>\n<script type="module">\n${js}\n</script>`);
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, html);
await fs.rm(tmp, { recursive: true, force: true });
console.log(`wrote ${out} (${(html.length / 1e6).toFixed(1)} MB, ${Object.keys(vfs).length} embedded files)`);
