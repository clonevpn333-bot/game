/* Static dev server for site/ that mirrors the Netlify redirect rules.
 * Usage: node tools/devserver.js [port]   (default 4321) */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const PORT = Number(process.argv[2] || process.env.PORT || 4321);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm',
};

const server = http.createServer(async (req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url.startsWith('/h/')) url = '/hub.html';
  if (url.endsWith('/')) url += 'index.html';
  const file = path.join(ROOT, path.normalize(url).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('no'); return; }
  try {
    const s = await stat(file);
    const target = s.isDirectory() ? path.join(file, 'index.html') : file;
    const body = await readFile(target);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(target)] || 'application/octet-stream',
      'cache-control': 'no-store',
    }).end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/html' }).end('<h1>404</h1>');
  }
});
server.listen(PORT, () => console.log(`site  → http://localhost:${PORT}`));
