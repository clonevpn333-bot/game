// Builds dist/floor99.html: the entire game (three.js, code, CSS, fonts) in ONE html file
// that runs by double-clicking — no server needed.
// Requires esbuild:  npm i -D esbuild   (or set ESBUILD_PATH to an esbuild package directory)
// Usage: node tools/build-single.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let esbuild;
try { esbuild = require(process.env.ESBUILD_PATH || 'esbuild'); } catch (e) {
  console.error('esbuild is required: npm i -D esbuild  (or set ESBUILD_PATH)'); process.exit(1);
}

// Two flavours from one source: Performance (no shadows/bloom, lower res, smaller pools) and Cinematic.
const FLAVOURS = [
  { fast: true, file: 'floor99-performance.html' },
  { fast: false, file: 'floor99-cinematic.html' },
];
const only = process.argv[2]; // optional: 'performance' | 'cinematic'

// CSS with fonts inlined as data URIs
let css = fs.readFileSync(path.join(root, 'css/main.css'), 'utf8');
css = css.replace(/url\('\.\.\/vendor\/fonts\/([^']+)'\)/g, (m, f) => {
  const b64 = fs.readFileSync(path.join(root, 'vendor/fonts', f)).toString('base64');
  return `url(data:font/woff2;base64,${b64})`;
});
const blobButton = fs.readFileSync(path.join(root, 'tools/blob-link.html'), 'utf8');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });

for (const fl of FLAVOURS) {
  if (only && !fl.file.includes(only)) continue;
  const result = await esbuild.build({
    entryPoints: [path.join(root, 'src/main.js')],
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    target: 'es2022',
    alias: { three: path.join(root, 'vendor/three/three.module.min.js') },
    define: { __FLOOR99_FAST__: String(fl.fast) },
    legalComments: 'none',
  });
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  html = html.replace(/<link rel="stylesheet" href="css\/main.css">/, () => `<style>\n${css}\n</style>`);
  html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '');
  html = html.replace(/<script type="module" src="src\/main.js"><\/script>/, () => `<script type="module">\n${js}\n</script>`);
  // the blob-link button snapshots the finished page, so it goes last (after the module script)
  html = html.replace('</body>', () => blobButton + '</body>');
  html = html.replace('<!doctype html>', '<!doctype html>\n<!-- FLOOR 99 — single-file build. Three.js r170 (MIT). Fonts: Anton, Chakra Petch (SIL OFL 1.1). -->');
  const out = path.join(root, 'dist', fl.file);
  fs.writeFileSync(out, html);
  console.log(`wrote ${path.relative(root, out)} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
}
