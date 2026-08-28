/* Builds dist/nova-arcade.html — the entire arcade and Summit in ONE file.
 * Upload it anywhere that takes an HTML file and the whole thing works,
 * multiplayer included (it is peer-to-peer, so no server travels with it). */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const read = (p) => readFile(path.join(SITE, p), 'utf8');

async function js(entry) {
  const r = await build({
    entryPoints: [path.join(SITE, entry)],
    bundle: true, format: 'iife', write: false, minify: true,
    target: 'es2020', legalComments: 'none', logLevel: 'error',
  });
  return r.outputFiles[0].text;
}

/** Pulls <link>/<script src> out of a game's HTML and inlines them. */
async function inlineGame(dir, file = 'index.html') {
  const base = path.posix.join('games', dir);
  let html = await read(path.posix.join(base, file));
  for (const m of [...html.matchAll(/<link[^>]+href="([^"]+\.css)"[^>]*>/g)]) {
    const css = await read(path.posix.join(base, m[1])).catch(() => '');
    html = html.replace(m[0], `<style>${css}</style>`);
  }
  for (const m of [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
    const src = m[1];
    if (/^https?:/.test(src)) continue;
    const code = await read(path.posix.join(base, src)).catch(() => '');
    html = html.replace(m[0], `<script>${code}</script>`);
  }
  return html;
}

async function summitHtml() {
  const css = await read('games/summit/client/ui/game.css');
  const peer = await read('vendor/peerjs/peerjs.min.js');
  const code = await js('games/summit/client/boot.js');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Summit</title><style>${css}</style></head>
<body><canvas id="view"></canvas><div id="ui"></div>
<script>${peer}</script>
<script>${code}</script>
</body></html>`;
}

/** Inlined HTML contains </script>; escape it so the host page survives. */
const safeJson = (v) => JSON.stringify(v).replace(/<\/(script)/gi, '<\\/$1');

const games = {};
const manifest = JSON.parse(await read('games/games.json'));

console.log('bundling games…');
games.summit = await summitHtml();
for (const id of ['neon-drift', 'vector-siege', 'lumen', 'schedule-one', 'voxel-sandbox', 'bonecrown', 'night-city']) {
  games[id] = await inlineGame(id);
  console.log('  ', id, (games[id].length / 1024 | 0) + ' KB');
}

console.log('bundling the hub…');
const hubCss = (await Promise.all(['css/tokens.css', 'css/base.css', 'css/ui.css', 'css/hub.css'].map(read))).join('\n');
const hubJs = await js('js/main.js');

const out = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="dark">
<title>Nova Arcade</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23060709'/%3E%3Cpath d='M9 23V9l14 14V9' stroke='%23E9C68C' stroke-width='2.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<style>${hubCss}</style>
</head>
<body>
<main id="app"></main>
<script id="nova-manifest" type="application/json">${safeJson(manifest)}</script>
<script>window.__NOVA_GAMES = ${safeJson(games)};</script>
<script>${hubJs}</script>
</body>
</html>
`;

await mkdir(path.join(ROOT, 'dist'), { recursive: true });
const dest = path.join(ROOT, 'dist', 'nova-arcade.html');
await writeFile(dest, out);
console.log(`\n${dest}  —  ${(out.length / 1024 / 1024).toFixed(2)} MB, one file, no dependencies`);
