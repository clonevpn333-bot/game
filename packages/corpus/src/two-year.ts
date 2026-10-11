/**
 * Two-year client scenario for the missing-documents check: what one client sent
 * for 2024, and their 2025 pile with three of those missing and one new form.
 *
 *   node src/two-year.ts [--out out/two-year]
 *
 * Writes <out>/<year>/*.pdf and <out>/manifest.json with the expected missing items.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pdfFromPages } from './generate.ts';
import { Random } from './random.ts';
import { templateById } from './templates.ts';

export const TWO_YEAR_CLIENT = { first: 'Robin', last: 'Sample' } as const;

type Doc = readonly [formType: string, issuer: string];

const LAST_YEAR: readonly Doc[] = [
  ['w-2', 'Northwind Logistics LLC'],
  ['w-2', 'Testville Unified Schools'],
  ['1099-int', 'First Sample Bank, N.A.'],
  ['1099-div', 'Example Index Funds'],
  ['1098', 'Sample Mortgage Co.'],
  ['k-1-1065', 'Sample Real Estate Partners LP'],
];

/** The second W-2, the 1099-DIV and the K-1 haven't arrived; a 1099-NEC is new. */
const THIS_YEAR: readonly Doc[] = [
  ['w-2', 'Northwind Logistics LLC'],
  ['1099-int', 'First Sample Bank, N.A.'],
  ['1098', 'Sample Mortgage Co.'],
  ['1099-nec', 'Example Design Studio LLC'],
];

export interface TwoYearManifest {
  client: string;
  years: { taxYear: number; files: string[] }[];
  /** Last year's documents with nothing matching this year, as {form type, issuer}. */
  expectedMissing: { formType: string; issuerName: string }[];
}

export async function generateTwoYear(outDir: string, seed = 2026): Promise<TwoYearManifest> {
  await rm(outDir, { recursive: true, force: true });
  const rng = new Random(seed);
  const years: TwoYearManifest['years'] = [];
  for (const [taxYear, docs] of [
    [2024, LAST_YEAR],
    [2025, THIS_YEAR],
  ] as const) {
    const dir = join(outDir, String(taxYear));
    await mkdir(dir, { recursive: true });
    const files: string[] = [];
    for (const [i, [formType, issuer]] of docs.entries()) {
      const template = templateById.get(formType);
      if (!template) throw new Error(`No template for ${formType}`);
      const rendered = template.render(
        {
          year: taxYear,
          issuer,
          recipientFirst: TWO_YEAR_CLIENT.first,
          recipientLast: TWO_YEAR_CLIENT.last,
        },
        rng,
        {},
      );
      const name = `${String(i + 1).padStart(2, '0')}-${formType}.pdf`;
      await writeFile(join(dir, name), await pdfFromPages(rendered.pages, name));
      files.push(join(String(taxYear), name));
    }
    years.push({ taxYear, files });
  }
  const now = new Set(THIS_YEAR.map(([f, i]) => `${f}|${i}`));
  const manifest: TwoYearManifest = {
    client: `${TWO_YEAR_CLIENT.first} ${TWO_YEAR_CLIENT.last}`,
    years,
    expectedMissing: LAST_YEAR.filter(([f, i]) => !now.has(`${f}|${i}`)).map(
      ([formType, issuerName]) => ({ formType, issuerName }),
    ),
  };
  await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { out: { type: 'string' } } });
  const out = resolve(values.out ?? resolve(import.meta.dirname, '../out/two-year'));
  const manifest = await generateTwoYear(out);
  console.log(
    `${manifest.client}: ${manifest.years.map((y) => `${String(y.taxYear)} ${String(y.files.length)} files`).join(', ')}, ${String(manifest.expectedMissing.length)} expected missing → ${out}`,
  );
}
