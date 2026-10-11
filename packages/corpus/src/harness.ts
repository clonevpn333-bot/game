/**
 * Accuracy harness: runs the full engine over a generated corpus and writes a
 * Markdown report.
 *
 *   pnpm --filter @binderready/corpus test:accuracy [--tier clean] [--corpus out/clean] [--report path]
 *
 * Fails (exit 1) when a tier misses its target. Tune rules and thresholds,
 * never the labels.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
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

export async function run(
  corpusDir: string,
  pageSource?: (path: string, file: FileInput) => Promise<FileInput>,
): Promise<RunResult> {
  const manifest = JSON.parse(
    await readFile(join(corpusDir, 'manifest.json'), 'utf8'),
  ) as CorpusManifest;
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
    const bytes = new Uint8Array(await readFile(path));
    const started = performance.now();
    let input: FileInput | { error: 'password' | 'corrupt' };
    try {
      input = await fileInput(`f${String(i)}`, file.name, path, bytes, file.sha256);
      if (pageSource) input = await pageSource(path, input);
    } catch (error) {
      if (!(error instanceof OpenError)) throw error;
      input = { error: error.kind };
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
    extractSeconds: extractMs / 1000,
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
  const result = await run(corpus);
  const { markdown, pass } = report(result, 'PDF text layer (pdfjs) + page dHash (pdftoppm)');
  const out = resolve(
    values.report ?? resolve(import.meta.dirname, `../../../docs/accuracy/${tier}.md`),
  );
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, markdown);
  console.log(markdown.split('\n').slice(0, 22).join('\n'));
  console.log(`\nReport: ${out}`);
  if (!pass) process.exitCode = 1;
}
