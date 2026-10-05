// Inline the production build into one self-contained HTML file (plays offline from disk).
import fs from 'node:fs';
import path from 'node:path';
const dist = 'dist';
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
html = html.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/, (_, f) => {
  const js = fs.readFileSync(path.join(dist, f), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/, (_, f) => `<style>${fs.readFileSync(path.join(dist, f), 'utf8')}</style>`);
const out = process.argv[2] ?? 'release/the-sleeping-kingdom.html';
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(0), 'KB', /src="\.\/assets/.test(html) ? 'WARNING: unresolved asset' : 'self-contained');
