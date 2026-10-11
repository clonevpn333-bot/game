/**
 * Accuracy harness: runs the full engine over a generated corpus and writes a
 * Markdown report.
 *
 *   pnpm --filter @binderready/corpus test:accuracy [--tier clean] [--corpus out/clean] [--report path]
 *
 * Fails (exit 1) when a tier misses its target. Tune rules and thresholds,
 * never the labels.
 */
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parseFormsCatalog, processFiles, type FileInput } from '@binderready/engine';
import formsJson from '@binderready/engine/forms.json' with { type: 'json' };
import { evaluate, type FileOutcome, type Metrics } from './evaluate.ts';
import { fileInput, OpenError } from './extract.ts';
import type { CorpusManifest } from './manifest.ts';

export const targets = {
  clean: { metric: 'correct', min: 0.99 },
  scanned: { metric: 'correctOrFlagged', min: 0.97 },
  photo: { metric: 'correctOrFlagged', min: 0.95 },
  misfiledWhileAuto: 0.005,
} as const;

const pct = (n: number, d: number) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`);

export interface RunResult {
  manifest: CorpusManifest;
  metrics: Metrics;
  extractSeconds: number;
  engineSeconds: number;
}

/** The desktop app's own ingest pipeline (Rust: PDFium, preprocessing, Tesseract) as a CLI. */
export const DESKTOP_INGEST = resolve(
  import.meta.dirname,
  '../../../apps/desktop/src-tauri/target/release/binderready-ingest',
);

interface CliLine {
  ok?: FileInput & { path: string };
  path?: string;
  error?: 'password' | 'corrupt' | 'unsupported' | 'unreadable';
}

/** Runs the desktop pipeline over every file once; results keyed by path. */
function desktopInputs(corpusDir: string, manifest: CorpusManifest) {
  const started = performance.now();
  const paths = manifest.files.map((f) => join(corpusDir, f.path));
  // OCR output only changes when the binary or the corpus does: reuse it for engine-only tuning runs.
  const key = `${String(statSync(DESKTOP_INGEST).mtimeMs)}-${String(statSync(join(corpusDir, 'manifest.json')).mtimeMs)}`;
  const cacheFile = join(corpusDir, '.cache', `ingest-${key}.jsonl`);
  const cached = existsSync(cacheFile)
    ? (JSON.parse(readFileSync(cacheFile, 'utf8')) as { out: string; seconds: number })
    : null;
  const out =
    cached?.out ??
    execFileSync(DESKTOP_INGEST, ['--cache', join(corpusDir, '.cache'), ...paths], {
      maxBuffer: 1024 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
  const seconds = cached?.seconds ?? (performance.now() - started) / 1000;
  if (!cached) writeFileSync(cacheFile, JSON.stringify({ out, seconds }));
  const byPath = new Map<string, CliLine>();
  for (const line of out.split('\n').filter(Boolean)) {
    const parsed = JSON.parse(line) as CliLine;
    byPath.set(parsed.ok?.path ?? parsed.path ?? '', parsed);
  }
  return { byPath, seconds };
}

export async function run(
  corpusDir: string,
  source: 'text-layer' | 'desktop' = 'text-layer',
): Promise<RunResult> {
  const manifest = JSON.parse(
    await readFile(join(corpusDir, 'manifest.json'), 'utf8'),
  ) as CorpusManifest;
  const desktop = source === 'desktop' ? desktopInputs(corpusDir, manifest) : null;
  const catalog = parseFormsCatalog(formsJson);
  const byClient = new Map<
    string,
    {
      file: (typeof manifest.files)[number];
      input: FileInput | { error: 'password' | 'corrupt' };
    }[]
  >();
  let extractMs = 0;

  for (const [i, file] of manifest.files.entries()) {
    const path = join(corpusDir, file.path);
    const started = performance.now();
    let input: FileInput | { error: 'password' | 'corrupt' };
    if (desktop) {
      const line = desktop.byPath.get(path);
      if (line?.ok) input = { ...line.ok, id: `f${String(i)}`, name: file.name };
      else input = { error: line?.error === 'password' ? 'password' : 'corrupt' };
    } else {
      try {
        input = await fileInput(
          `f${String(i)}`,
          file.name,
          path,
          new Uint8Array(await readFile(path)),
          file.sha256,
        );
      } catch (error) {
        if (!(error instanceof OpenError)) throw error;
        input = { error: error.kind };
      }
    }
    extractMs += performance.now() - started;
    const list = byClient.get(file.client) ?? [];
    list.push({ file, input });
    byClient.set(file.client, list);
  }

  const outcomes: FileOutcome[] = [];
  let engineMs = 0;
  for (const [client, entries] of byClient) {
    const inputs = entries.map((e) => e.input).filter((x): x is FileInput => !('error' in x));
    const started = performance.now();
    const docs = processFiles(catalog, inputs, { clientName: client.split(' ').at(-1) ?? client });
    engineMs += performance.now() - started;
    for (const e of entries) {
      outcomes.push({
        file: e.file,
        result:
          'error' in e.input
            ? { error: e.input.error }
            : docs.filter((d) => d.fileId === (e.input as FileInput).id),
      });
    }
  }
  return {
    manifest,
    metrics: evaluate(outcomes),
    extractSeconds: desktop ? desktop.seconds : extractMs / 1000,
    engineSeconds: engineMs / 1000,
  };
}

export function report(
  { manifest, metrics: m, extractSeconds, engineSeconds }: RunResult,
  engineLabel: string,
): { markdown: string; pass: boolean } {
  const tier = manifest.tier;
  const target = targets[tier];
  const headline = target.metric === 'correct' ? m.correct : m.correctOrFlagged;
  const tierPass = headline / m.documents >= target.min;
  const misfiledRate = m.autoAccepted === 0 ? 0 : m.misfiledWhileAuto / m.autoAccepted;
  const autoPass = misfiledRate <= targets.misfiledWhileAuto;
  const pass = tierPass && autoPass && m.errorFilesHandled === m.errorFilesExpected;
  const lines = [
    `# Accuracy: ${tier} tier`,
    '',
    `Corpus: ${String(manifest.files.length)} files, ${String(m.documents)} documents, ${String(m.pages)} pages (seed ${String(manifest.seed)}, ${manifest.generatedBy}). Engine input: ${engineLabel}.`,
    '',
    manifest.generatedBy === 'synthetic-templates'
      ? '> These documents come from built-in synthetic layouts, not the official IRS PDFs (irs.gov was unreachable when this corpus was built). The numbers show the pipeline works end to end; they are not evidence of accuracy on real client documents. Regenerate with `generate --irs-dir` once the official PDFs are available.'
      : '> Documents are official IRS fillable PDFs filled with fake data.',
    '',
    '| Metric | Result | Target |',
    '|---|---|---|',
    `| ${target.metric === 'correct' ? 'Correct (right split and form)' : 'Correct or flagged for review'} | **${pct(headline, m.documents)}** (${String(headline)}/${String(m.documents)}) | ≥ ${String(target.min * 100)}% ${tierPass ? '✅' : '❌'} |`,
    ...(target.metric === 'correct'
      ? []
      : [`| Correct (right split and form) | ${pct(m.correct, m.documents)} | |`]),
    `| Split accuracy | ${pct(m.splitCorrect, m.documents)} | |`,
    `| Auto-accepted | ${pct(m.autoAccepted, m.documents)} (${String(m.autoAccepted)}) | |`,
    `| **Misfiled while auto-accepted** | **${pct(m.misfiledWhileAuto, m.autoAccepted)}** (${String(m.misfiledWhileAuto)}/${String(m.autoAccepted)}) | ≤ 0.5% ${autoPass ? '✅' : '❌'} |`,
    `| Duplicate detection | ${pct(m.duplicatesCaught, m.duplicatesExpected)} (${String(m.duplicatesCaught)}/${String(m.duplicatesExpected)}), ${String(m.falseDuplicates)} false | |`,
    `| Password-protected / corrupt files reported | ${String(m.errorFilesHandled)}/${String(m.errorFilesExpected)} | all |`,
    `| Tax year read correctly | ${pct(m.fields.year, m.splitCorrect)} | |`,
    `| Issuer read correctly | ${pct(m.fields.issuer, m.splitCorrect)} | |`,
    `| Recipient last name read correctly | ${pct(m.fields.recipient, m.splitCorrect)} | |`,
    `| Pages per second (extraction + engine) | ${(m.pages / (extractSeconds + engineSeconds)).toFixed(1)} | |`,
    `| Pages per second (engine only) | ${(m.pages / engineSeconds).toFixed(0)} | |`,
    '',
    '## Per form',
    '',
    '| Form | Documents | Precision | Recall |',
    '|---|---|---|---|',
    ...m.perForm.map(
      (s) =>
        `| ${s.formId} | ${String(s.truthCount)} | ${pct(s.tp, s.tp + s.fp)} | ${pct(s.tp, s.tp + s.fn)} |`,
    ),
    '',
  ];
  const misses = m.verdicts.filter((v) => !v.correct);
  if (misses.length) {
    lines.push(
      '## Documents not correct',
      '',
      '| Truth | Pages | Predicted | Status |',
      '|---|---|---|---|',
    );
    for (const v of misses.slice(0, 40)) {
      lines.push(
        `| ${v.truth.formId} | ${v.truth.pages.join(',')} | ${v.predicted ? `${v.predicted.formId ?? 'none'} (${v.predicted.pages.join(',')})` : 'split differently'} | ${v.flagged ? 'flagged' : 'auto'} |`,
      );
    }
    lines.push('');
  }
  return { markdown: lines.join('\n'), pass };
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  const { values } = parseArgs({
    options: { tier: { type: 'string' }, corpus: { type: 'string' }, report: { type: 'string' } },
  });
  const tier = values.tier ?? 'clean';
  const corpus = resolve(values.corpus ?? resolve(import.meta.dirname, `../out/${tier}`));
  const source = tier === 'clean' ? 'text-layer' : 'desktop';
  const result = await run(corpus, source);
  const { markdown, pass } = report(
    result,
    source === 'desktop'
      ? 'desktop ingest pipeline (PDFium, preprocessing, Tesseract 5 OCR) via binderready-ingest'
      : 'PDF text layer (pdfjs) + page dHash (pdftoppm)',
  );
  const out = resolve(
    values.report ?? resolve(import.meta.dirname, `../../../docs/accuracy/${tier}.md`),
  );
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, markdown);
  console.log(markdown.split('\n').slice(0, 22).join('\n'));
  console.log(`\nReport: ${out}`);
  if (!pass) process.exitCode = 1;
}
