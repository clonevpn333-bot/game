/**
 * Serves the static export in out/ the way a static host does: /path/ → path/index.html,
 * unknown paths → 404.html, text assets compressed with brotli or gzip (as Netlify and
 * Vercel do; Lighthouse numbers are meaningless against uncompressed JavaScript). Used for previews, screenshots, Lighthouse and e2e tests.
 *   node scripts/serve.ts [port]
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { constants, createBrotliCompress, createGzip } from 'node:zlib';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'out');

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json',
};

async function resolveFile(urlPath: string): Promise<string | null> {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0] ?? '/')).replace(
    /^(\.\.[/\\])+/,
    '',
  );
  const candidates = [
    join(root, clean),
    join(root, clean, 'index.html'),
    join(root, `${clean}.html`),
  ];
  for (const file of candidates) {
    if (!file.startsWith(root)) continue;
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

export function serveStatic(port: number): Promise<Server> {
  const server = createServer((req, res) => {
    void (async () => {
      const file = await resolveFile(req.url ?? '/');
      const status = file ? 200 : 404;
      const target = file ?? join(root, '404.html');
      const type = types[extname(target)] ?? 'application/octet-stream';
      const compressible = /text|javascript|json|xml|svg/.test(type);
      const accept = req.headers['accept-encoding'] ?? '';
      const encoding = !compressible
        ? null
        : accept.includes('br')
          ? 'br'
          : accept.includes('gzip')
            ? 'gzip'
            : null;
      res.writeHead(status, {
        'content-type': type,
        'cache-control': target.includes('/_next/static/')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
        vary: 'accept-encoding',
        ...(encoding ? { 'content-encoding': encoding } : {}),
      });
      const stream = createReadStream(target);
      if (encoding === 'br') {
        stream
          .pipe(createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }))
          .pipe(res);
      } else if (encoding === 'gzip') {
        stream.pipe(createGzip()).pipe(res);
      } else {
        stream.pipe(res);
      }
    })();
  });
  return new Promise((done) =>
    server.listen(port, () => {
      done(server);
    }),
  );
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  const port = Number(process.argv[2] ?? 4400);
  await serveStatic(port);
  console.log(`Serving ${root} at http://localhost:${port}`);
}
