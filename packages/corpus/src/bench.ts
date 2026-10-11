/**
 * Speed benchmark for the desktop pipeline: about 100 mixed pages, a third each
 * digital PDFs, scans and phone photos, timed end to end through binderready-ingest.
 *   node src/bench.ts [--pages 100]
 */
import { execFileSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { DESKTOP_INGEST } from './harness.ts';
import type { CorpusManifest } from './manifest.ts';

const { values } = parseArgs({ options: { pages: { type: 'string' } } });
const target = Number(values.pages ?? 100);
const out = resolve(import.meta.dirname, '../out');

async function pick(tier: string, pages: number) {
  const manifest = JSON.parse(
    await readFile(join(out, tier, 'manifest.json'), 'utf8'),
  ) as CorpusManifest;
  const chosen: string[] = [];
  let count = 0;
  for (const f of manifest.files.filter((x) => x.expect === 'ok')) {
    if (count >= pages) break;
    const n = Math.max(...f.documents.flatMap((d) => d.pages)) + 1;
    chosen.push(join(out, tier, f.path));
    count += n;
  }
  return { chosen, count };
}

const parts = await Promise.all([
  pick('clean', Math.round(target / 3)),
  pick('scanned', Math.round(target / 3)),
  pick('photo', target - 2 * Math.round(target / 3)),
]);
const files = parts.flatMap((p) => p.chosen);
const pages = parts.reduce((n, p) => n + p.count, 0);
const cache = join(out, '.bench-cache');
await rm(cache, { recursive: true, force: true });
const started = performance.now();
execFileSync(DESKTOP_INGEST, ['--cache', cache, ...files], {
  stdio: ['ignore', 'ignore', 'ignore'],
  maxBuffer: 1024 * 1024 * 1024,
});
const seconds = (performance.now() - started) / 1000;
await rm(cache, { recursive: true, force: true });
const [digital, scanned, photo] = parts.map((p) => String(p.count));
console.log(
  `${String(pages)} pages (${digital ?? '0'} digital / ${scanned ?? '0'} scanned / ${photo ?? '0'} photo) in ${seconds.toFixed(1)} s → ${(pages / seconds).toFixed(2)} pages/s on ${String((await import('node:os')).cpus().length)} cores`,
);
