// Bundle Three.js (base64 blob) + game.js + CSS into one runnable index.html.
// All characters are built procedurally in-engine — no glTF/GLB loaders needed.
import fs from 'fs';
const b64 = f => Buffer.from(fs.readFileSync(f, 'utf8'), 'utf8').toString('base64');
const threeB64 = b64('vendor/three.module.js');
let game = fs.readFileSync('game.js', 'utf8');
game = game.replace(/^import \* as THREE from 'three';/m, "import * as THREE from '__THREE_URL__';");
const gameReadable = game.replace(/<\/script>/gi, '<\\/script>');
const css = fs.readFileSync('styles.css', 'utf8');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<title>NEON BAY</title>
<style>
${css}
</style>
</head>
<body>
<canvas id="gl"></canvas>
<div id="boot">Loading NEON BAY…</div>

<script id="three-src" type="text/plain">${threeB64}</script>
<script id="game-src" type="text/plain">
${gameReadable}
</script>
<script>
(function () {
  function decode(b64){ const bin=atob(b64.trim()); const a=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i); return new TextDecoder('utf-8').decode(a); }
  function blobOf(src){ return URL.createObjectURL(new Blob([src],{type:'text/javascript'})); }
  function fail(e){ var b=document.getElementById('boot'); if(b){b.style.display='block';b.style.color='#f88';b.textContent='Error: '+(e&&e.message?e.message:e);} console.error(e); }
  addEventListener('error', ev=>fail(ev.error||ev.message));
  try {
    var threeURL = blobOf(decode(document.getElementById('three-src').textContent));
    var game = document.getElementById('game-src').textContent.replace(/<\\\/script>/gi,'</scr'+'ipt>').replace('__THREE_URL__', threeURL);
    import(blobOf(game)).catch(fail);
  } catch(e){ fail(e); }
})();
</script>
</body>
</html>
`;
fs.writeFileSync('index.html', html);
console.log('wrote index.html', (fs.statSync('index.html').size / 1024 | 0) + 'KB');
