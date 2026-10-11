/**
 * Verifies forms.json against the official source PDFs.
 *
 *   pnpm forms:verify                  download sources (cached in .cache/sources)
 *   pnpm forms:verify --pdf-dir <dir>  use PDFs you downloaded yourself (named like the URL)
 *   pnpm forms:verify --write          also record OMB numbers + verifiedOn for forms that pass
 *   pnpm forms:verify --only w-2,1098  limit to some form ids
 *
 * A form passes when every title, box-label and issuer-label pattern matches the
 * official text. Only then are its OMB numbers (read from that same text) and
 * today's date written back. Results go to forms-verification.md.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { format, resolveConfig } from 'prettier';
import { EnvHttpProxyAgent, fetch } from 'undici';
import { checkFormAgainstText, parseFormsCatalog, type FormCheck } from '../src/index.ts';
import { extractPdfText } from './pdf-text.ts';

const packageDir = resolve(import.meta.dirname, '..');
const catalogPath = join(packageDir, 'forms.json');
const reportPath = join(packageDir, 'forms-verification.md');
const cacheDir = join(packageDir, '.cache', 'sources');

const { values: args } = parseArgs({
  options: {
    'pdf-dir': { type: 'string' },
    write: { type: 'boolean', default: false },
    only: { type: 'string' },
  },
});

const catalog = parseFormsCatalog(JSON.parse(await readFile(catalogPath, 'utf8')));
const only = args.only ? new Set(args.only.split(',')) : null;
const today = new Date().toISOString().slice(0, 10);
const dispatcher = new EnvHttpProxyAgent();

async function loadSource(url: string): Promise<Uint8Array> {
  const file = basename(new URL(url).pathname);
  if (args['pdf-dir']) return readFile(join(resolve(args['pdf-dir']), file));

  const cached = join(cacheDir, file);
  try {
    return await readFile(cached);
  } catch {
    // Not cached yet; download below.
  }
  const response = await fetch(url, {
    dispatcher,
    headers: { 'user-agent': 'BinderReady forms:verify' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cached, bytes);
  return bytes;
}

/** Includes the network-level cause, which undici hides behind "fetch failed". */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.cause instanceof Error ? `${error.message} (${error.cause.message})` : error.message;
}

type Outcome =
  | { id: string; status: 'checked'; source: string; check: FormCheck }
  | { id: string; status: 'error'; source: string; error: string }
  | { id: string; status: 'no-source'; reason: string };

const outcomes: Outcome[] = [];

for (const form of catalog.forms) {
  if (only && !only.has(form.id)) continue;
  if (form.kind === 'heuristic') continue;
  if (!form.source) {
    outcomes.push({ id: form.id, status: 'no-source', reason: form.notes ?? 'No source URL.' });
    continue;
  }
  try {
    const text = await extractPdfText(await loadSource(form.source));
    const check = checkFormAgainstText(catalog, form, text);
    outcomes.push({ id: form.id, status: 'checked', source: form.source, check });
    if (args.write && check.verified) {
      form.ombNumbers = check.ombNumbers;
      form.verifiedOn = today;
    }
    console.log(
      `${check.verified ? 'PASS' : 'FAIL'}  ${form.id}  OMB ${check.ombNumbers.join(', ') || 'none found'}`,
    );
  } catch (error) {
    const message = describeError(error);
    outcomes.push({ id: form.id, status: 'error', source: form.source, error: message });
    console.log(`ERROR ${form.id}  ${message}`);
  }
}

const lines = [
  '# forms.json verification',
  '',
  `Run on ${today}${args['pdf-dir'] ? ` from local PDFs in \`${args['pdf-dir']}\`` : ' by downloading each source'}.`,
  '',
  '| Form | Result | OMB numbers in source | Unmatched patterns |',
  '|---|---|---|---|',
];
for (const o of outcomes) {
  if (o.status === 'checked') {
    const misses = [...o.check.titles, ...o.check.boxLabels, ...o.check.issuerLabels]
      .filter((c) => !c.matched)
      .map((c) => `\`${c.pattern.replaceAll('|', '\\|')}\``);
    lines.push(
      `| ${o.id} | ${o.check.verified ? 'Verified' : 'Patterns need fixing'} | ${o.check.ombNumbers.join(', ') || 'None printed'} | ${misses.join('<br>') || '—'} |`,
    );
  } else if (o.status === 'error') {
    lines.push(`| ${o.id} | Could not read source: ${o.error.replaceAll('|', '/')} | — | — |`);
  } else {
    lines.push(`| ${o.id} | No official source yet: ${o.reason} | — | — |`);
  }
}
await writeFile(reportPath, `${lines.join('\n')}\n`);
console.log(`\nReport: ${reportPath}`);

if (args.write) {
  const json = JSON.stringify(catalog, null, 2);
  const options = (await resolveConfig(catalogPath)) ?? {};
  await writeFile(catalogPath, await format(json, { ...options, filepath: catalogPath }));
  console.log(`Updated ${catalogPath}`);
}

const failed = outcomes.filter((o) => o.status !== 'checked' || !o.check.verified).length;
if (failed > 0) {
  console.log(`${failed} form(s) not verified.`);
  process.exitCode = 1;
}
