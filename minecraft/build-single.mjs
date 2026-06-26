// ============================================================================
//  Build a single self-contained voxelcraft.html from the modular sources.
//  Bundles: vendored Three.js + all src/*.js + styles.css + markup.
//  No bundler/deps — strips ES import/export and concatenates into one module,
//  Three.js shipped as a base64 blob so it works from file:// too.
//  Run:  node build-single.mjs
// ============================================================================
import fs from 'fs';

const ORDER = [
  'ids', 'constants', 'noise', 'input', 'blocks', 'items', 'textures', 'chunk', 'worldgen',
  'world', 'inventory', 'crafting', 'survival', 'player', 'viewmodel', 'mobs', 'particles',
  'audio', 'save', 'ui', 'shaders', 'main',
];

function strip(src, name) {
  // remove all import statements (single & multi-line)
  src = src.replace(/^[ \t]*import\b[^;]*;[ \t]*$/gm, '');
  // remove `export ` prefix from declarations
  src = src.replace(/^([ \t]*)export\s+(const|let|var|function|class|async|default)\b/gm, '$1$2');
  // remove `export { ... };` lists
  src = src.replace(/^[ \t]*export\s*\{[^}]*\}\s*;?[ \t]*$/gm, '');
  return `\n// ===== ${name}.js =====\n` + src;
}

let combined = `import * as THREE from '__THREE_URL__';\n`;
for (const name of ORDER) {
  const src = fs.readFileSync(`src/${name}.js`, 'utf8');
  combined += strip(src, name);
}

fs.writeFileSync('/tmp/_combined_game.js', combined); // for syntax checking

const three = fs.readFileSync('vendor/three.module.js', 'utf8');
const threeB64 = Buffer.from(three, 'utf8').toString('base64');
const gameB64 = Buffer.from(combined, 'utf8').toString('base64');
const css = fs.readFileSync('styles.css', 'utf8');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<title>VOXELCRAFT — a Minecraft-inspired survival sandbox</title>
<style>
${css}
</style>
</head>
<body>
<canvas id="gl"></canvas>
<div id="boot">Loading VOXELCRAFT…</div>

<script id="three-src" type="text/plain">${threeB64}</script>
<script id="game-src" type="text/plain">${gameB64}</script>
<script>
(async function () {
  function decode(b64) {
    const bin = atob(b64.trim());
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  function fail(e) {
    var b = document.getElementById('boot');
    if (b) { b.style.display = 'block'; b.style.color = '#f88'; b.textContent = 'Error: ' + (e && e.message ? e.message : e); }
    console.error(e);
  }
  window.addEventListener('error', (ev) => fail(ev.error || ev.message));
  try {
    const threeSrc = decode(document.getElementById('three-src').textContent);
    const threeURL = URL.createObjectURL(new Blob([threeSrc], { type: 'text/javascript' }));
    let gameSrc = decode(document.getElementById('game-src').textContent).replace('__THREE_URL__', threeURL);
    const gameURL = URL.createObjectURL(new Blob([gameSrc], { type: 'text/javascript' }));
    await import(gameURL);
    const b = document.getElementById('boot'); if (b) b.style.display = 'none';
  } catch (e) { fail(e); }
})();
</script>
</body>
</html>
`;

fs.writeFileSync('voxelcraft.html', html);
const kb = (fs.statSync('voxelcraft.html').size / 1024).toFixed(0);
console.log(`wrote voxelcraft.html (${kb} KB), combined game ${(combined.length/1024).toFixed(0)} KB`);
