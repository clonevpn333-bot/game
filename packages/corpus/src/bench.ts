/**
 * Speed benchmark for the desktop pipeline: about 100 mixed pages, a third each
 * digital PDFs, scans and phone photos, timed end to end through binderready-ingest.
 *   node src/bench.ts [--pages 100] [--engine tesseract|native]
 */
import { execFileSync } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { cpus } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { DESKTOP_INGEST, type OcrEngineName } from './harness.ts';
import type { CorpusManifest } from './manifest.ts';

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

export interface BenchResult {
  pages: number;
  digital: number;
  scanned: number;
  photo: number;
  seconds: number;
  cores: number;
}

export async function benchmark(
  target = 100,
  engine: OcrEngineName = 'tesseract',
): Promise<BenchResult> {
  const third = Math.round(target / 3);
  const [digital, scanned, photo] = await Promise.all([
    pick('clean', third),
    pick('scanned', third),
    pick('photo', target - 2 * third),
  ]);
  const parts = [digital, scanned, photo];
  const cache = join(out, '.bench-cache');
  await rm(cache, { recursive: true, force: true });
  const started = performance.now();
  execFileSync(
    DESKTOP_INGEST,
    ['--cache', cache, '--engine', engine, ...parts.flatMap((p) => p.chosen)],
    {
      stdio: ['ignore', 'ignore', 'ignore'],
      maxBuffer: 1024 * 1024 * 1024,
    },
  );
  const seconds = (performance.now() - started) / 1000;
  await rm(cache, { recursive: true, force: true });
  return {
    pages: parts.reduce((n, p) => n + p.count, 0),
    digital: digital.count,
    scanned: scanned.count,
    photo: photo.count,
    seconds,
    cores: cpus().length,
  };
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  const { values } = parseArgs({
    options: { pages: { type: 'string' }, engine: { type: 'string' } },
  });
  const r = await benchmark(
    Number(values.pages ?? 100),
    values.engine === 'native' ? 'native' : 'tesseract',
  );
  console.log(
    `${String(r.pages)} pages (${String(r.digital)} digital / ${String(r.scanned)} scanned / ${String(r.photo)} photo) in ${r.seconds.toFixed(1)} s → ${(r.pages / r.seconds).toFixed(2)} pages/s on ${String(r.cores)} cores`,
  );
}
