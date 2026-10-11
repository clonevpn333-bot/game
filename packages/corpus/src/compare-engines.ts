/**
 * OCR engine comparison on this computer: Tesseract against the operating system's
 * engine (Windows.Media.Ocr or Apple Vision), on the scanned and photo tiers and the
 * 100-page benchmark. Writes docs/ocr-engines-<platform>.md, the data the desktop
 * app's "Automatic" engine choice is set from.
 *
 *   node src/compare-engines.ts
 *
 * Needs the release binderready-ingest and the scanned and photo tiers in out/.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, release } from 'node:os';
import { dirname, resolve } from 'node:path';
import { benchmark } from './bench.ts';
import { DESKTOP_INGEST, run, type OcrEngineName } from './harness.ts';

function nativeAvailable(): boolean {
  try {
    execFileSync(DESKTOP_INGEST, ['--engine', 'native'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');
const engines: OcrEngineName[] = nativeAvailable() ? ['tesseract', 'native'] : ['tesseract'];
const nativeName =
  platform() === 'win32' ? 'Windows.Media.Ocr' : platform() === 'darwin' ? 'Apple Vision' : 'none';

const rows: string[] = [];
for (const engine of engines) {
  const label = engine === 'native' ? nativeName : 'Tesseract 5';
  const tiers = await Promise.all(
    (['scanned', 'photo'] as const).map(async (tier) => ({
      tier,
      result: await run(resolve(import.meta.dirname, `../out/${tier}`), 'desktop', engine),
    })),
  );
  const speed = await benchmark(100, engine);
  for (const { tier, result } of tiers) {
    const m = result.metrics;
    rows.push(
      `| ${label} | ${tier} | ${pct(m.correct, m.documents)} | ${pct(m.correctOrFlagged, m.documents)} | ${pct(m.misfiledWhileAuto, m.autoAccepted)} | ${pct(m.autoAccepted, m.documents)} | ${pct(m.fields.issuer, m.splitCorrect)} | ${pct(m.fields.recipient, m.splitCorrect)} | ${(m.pages / result.extractSeconds).toFixed(2)} |`,
    );
  }
  rows.push(
    `| ${label} | 100 mixed pages | | | | | | | ${(speed.pages / speed.seconds).toFixed(2)} (${speed.seconds.toFixed(1)} s) |`,
  );
}

const report = [
  `# OCR engines on ${platform()} ${release()} (${arch()}, ${String(cpus().length)} cores)`,
  '',
  'Synthetic corpus (see docs/accuracy). Orientation for engines without word confidences (Windows OCR) is decided by Tesseract, then the native engine reads the page; that cost is included.',
  '',
  '| Engine | Tier | Correct | Correct or flagged | Misfiled while auto | Auto-accepted | Issuer | Recipient | Pages/s |',
  '|---|---|---|---|---|---|---|---|---|',
  ...rows,
  '',
  engines.length === 1
    ? 'No native engine is available on this system: Automatic uses Tesseract.'
    : 'Automatic should prefer the native engine only if it is at least as accurate (correct, misfiled while auto) and faster. Set `AUTOMATIC_PREFERS_NATIVE` in `apps/desktop/src-tauri/src/ocr.rs` from this table.',
  '',
].join('\n');
const out = resolve(import.meta.dirname, `../../../docs/ocr-engines-${platform()}.md`);
await mkdir(dirname(out), { recursive: true });
await writeFile(out, report);
console.log(report);
