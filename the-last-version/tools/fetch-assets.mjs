// Downloads the CC0 assets listed in assets.manifest.json from Poly Haven and
// writes ASSETS.md with full provenance. Usage: node tools/fetch-assets.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'tools/assets.manifest.json'), 'utf8'));
const RES = '1k';
const api = (p) => fetch('https://api.polyhaven.com' + p).then((r) => { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); });

async function download(url, dest) {
  try { await fs.access(dest); return 'cached'; } catch {}
  await fs.mkdir(path.dirname(dest), { recursive: true });
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status + ' ' + url);
      await fs.writeFile(dest, Buffer.from(await r.arrayBuffer()));
      return 'ok';
    } catch (e) { if (i === 3) throw e; await new Promise((s) => setTimeout(s, 1000 * 2 ** i)); }
  }
}

const credits = [];
async function info(id) { const d = await api('/info/' + id); return { name: d.name, authors: Object.keys(d.authors || {}).join(', ') }; }

// Textures: diffuse, OpenGL normal, packed AO/rough/metal
for (const [key, id] of Object.entries(manifest.textures)) {
  const files = await api('/files/' + id);
  const pick = (k) => files[k]?.[RES]?.jpg?.url;
  const maps = { diff: pick('Diffuse'), nor: pick('nor_gl'), arm: pick('arm'), rough: pick('Rough') };
  for (const [m, url] of Object.entries(maps)) if (url) await download(url, path.join(root, 'assets/textures', key, m + '.jpg'));
  const i = await info(id);
  credits.push(`| texture | \`${key}\` | ${i.name} (\`${id}\`) | ${i.authors} | https://polyhaven.com/a/${id} |`);
  console.log('tex', key, Object.keys(maps).filter((k) => maps[k]).join(','));
}
for (const [key, id] of Object.entries(manifest.hdris)) {
  const files = await api('/files/' + id);
  await download(files.hdri[RES].hdr.url, path.join(root, 'assets/hdri', key + '.hdr'));
  const i = await info(id);
  credits.push(`| hdri | \`${key}\` | ${i.name} (\`${id}\`) | ${i.authors} | https://polyhaven.com/a/${id} |`);
  console.log('hdri', key);
}
for (const id of manifest.models) {
  const files = await api('/files/' + id);
  const g = files.gltf[RES].gltf;
  const dir = path.join(root, 'assets/models', id);
  await download(g.url, path.join(dir, id + '.gltf'));
  for (const [rel, f] of Object.entries(g.include)) await download(f.url, path.join(dir, rel));
  const i = await info(id);
  credits.push(`| model | \`${id}\` | ${i.name} | ${i.authors} | https://polyhaven.com/a/${id} |`);
  console.log('model', id);
}

await fs.writeFile(path.join(root, 'ASSETS.md'), `# Asset provenance

Every third-party asset bundled with THE LAST VERSION is listed here.

## Poly Haven (CC0 1.0 Universal — public domain dedication)

Downloaded at ${RES} resolution by \`tools/fetch-assets.mjs\` from https://polyhaven.com.
CC0 requires no attribution; authors are credited anyway.

| kind | local key | asset | author(s) | source |
|---|---|---|---|---|
${credits.join('\n')}

## Libraries

| library | version | license | location |
|---|---|---|---|
| three.js | 0.178.0 | MIT | \`vendor/three\` |

## Original work (this project)

All characters, vehicles (cars, boats, ships, helicopters), city architecture, the hotel
architecture, ocean/sky/weather shaders, music and sound effects are authored in code in
\`src/\` for this project. Music and SFX are synthesised at runtime with the Web Audio API.
`);
console.log('done');
