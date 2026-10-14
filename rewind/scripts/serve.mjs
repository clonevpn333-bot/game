#!/usr/bin/env node
// Zero-dependency static server: npm start -> http://localhost:5173
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
export function start(port = Number(process.env.PORT) || 5173) {
  const server = createServer(async (req, res) => {
    let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (p.endsWith('/')) p += 'index.html';
    if (p.includes('..') || /^\/(scripts|test|node_modules)\//.test(p)) { res.writeHead(404).end('Not found'); return; }
    try { const buf = await readFile(join(root, p)); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream', 'cache-control': 'no-cache' }).end(buf); }
    catch { res.writeHead(404).end('Not found'); }
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}
if (import.meta.url === `file://${process.argv[1]}`) { const s = await start(); console.log(`rewind. running at http://localhost:${s.address().port}`); }
