import type { FileInput, PageInput, Word } from './types.ts';

/** [text, x, y] rows → positioned words, roughly 0.009 page widths per character. */
export function words(rows: [string, number, number][]): Word[] {
  const out: Word[] = [];
  for (const [text, x0, y] of rows) {
    let x = x0;
    for (const token of text.split(/\s+/).filter(Boolean)) {
      const w = token.length * 0.009;
      out.push({ text: token, x, y, w, h: 0.012, confidence: 1 });
      x += w + 0.006;
    }
  }
  return out;
}

export function page(index: number, rows: [string, number, number][], phash?: string): PageInput {
  return { index, words: words(rows), source: 'text-layer', ...(phash ? { phash } : {}) };
}

export function file(id: string, name: string, pages: PageInput[], sha256 = id): FileInput {
  return { id, name, sha256, pages };
}

// Synthetic page layouts. Fake names only; identifiers are deliberately invalid.
export const w2Rows = (
  employer = 'NORTHWIND LOGISTICS LLC',
  year = 2026,
): [string, number, number][] => [
  ['Form W-2 Wage and Tax Statement', 0.05, 0.04],
  [String(year), 0.7, 0.04],
  ['Copy B—To Be Filed With Employee’s FEDERAL Tax Return', 0.05, 0.08],
  ['b Employer identification number (EIN)', 0.05, 0.14],
  ['00-0000000', 0.05, 0.16],
  ['c Employer’s name, address, and ZIP code', 0.05, 0.2],
  [employer, 0.05, 0.22],
  ['123 Sample St, Testville', 0.05, 0.24],
  ['e Employee’s first name and initial Last name', 0.05, 0.34],
  ['JANE SAMPLE', 0.05, 0.36],
  ['1 Wages, tips, other compensation', 0.55, 0.14],
  ['2 Federal income tax withheld', 0.55, 0.18],
  ['3 Social security wages', 0.55, 0.22],
  ['5 Medicare wages and tips', 0.55, 0.26],
  ['52,345.67', 0.56, 0.16],
  ['6,120.00', 0.78, 0.16],
];

export const int1099Rows = (
  payer = 'SAMPLE CREDIT UNION',
  year = 2026,
): [string, number, number][] => [
  ['PAYER’S name, street address, city or town, state or province, country, ZIP', 0.05, 0.05],
  [payer, 0.05, 0.07],
  ['456 Sample Ave, Testville', 0.05, 0.09],
  ['Form 1099-INT', 0.62, 0.05],
  ['Interest Income', 0.78, 0.07],
  [`For calendar year ${String(year)}`, 0.62, 0.1],
  ['RECIPIENT’S name', 0.05, 0.2],
  ['JANE SAMPLE', 0.05, 0.22],
  ['1 Interest income', 0.5, 0.15],
  ['2 Early withdrawal penalty', 0.5, 0.19],
  ['3 Interest on U.S. Savings Bonds and Treasury obligations', 0.5, 0.23],
  ['8 Tax-exempt interest', 0.5, 0.27],
  ['11 Bond premium', 0.5, 0.31],
];

export const instructionsRows: [string, number, number][] = [
  ['Instructions for Recipient', 0.05, 0.05],
  [
    'Recipient’s taxpayer identification number (TIN). For your protection, this form may show only the last four digits of your TIN.',
    0.05,
    0.1,
  ],
  ['Box 1. Shows taxable interest paid to you during the calendar year by the payer.', 0.05, 0.16],
];
