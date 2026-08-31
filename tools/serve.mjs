#!/usr/bin/env node
/**
 * Minimal static server for local play and CI. Zero dependencies on purpose:
 * the portal has no build step, and its test rig should not need one either.
 *
 *   node tools/serve.mjs [port]
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = Number(process.argv[2] || process.env.PORT || 8765);
const ROOT = resolve(process.cwd());

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith('/')) path += 'index.html';

  const file = join(ROOT, normalize(path));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

  let stat;
  try { stat = statSync(file); } catch { res.writeHead(404).end('Not found'); return; }
  if (stat.isDirectory()) { res.writeHead(404).end('Not found'); return; }

  const type = TYPES[extname(file)] || 'application/octet-stream';
  const headers = { 'content-type': type, 'content-length': stat.size };
  // Mirror the production caching policy so local timings are not a fiction.
  if (path.startsWith('/games/') && url.searchParams.has('v')) headers['cache-control'] = 'public, max-age=31536000, immutable';
  else if (path === '/sw.js') { headers['cache-control'] = 'no-cache'; headers['service-worker-allowed'] = '/'; }
  else headers['cache-control'] = 'no-cache';

  res.writeHead(200, headers);
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}`));
