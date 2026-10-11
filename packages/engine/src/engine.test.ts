import { describe, expect, it } from 'vitest';
import raw from '../forms.json' with { type: 'json' };
import { classifyText } from './classify.ts';
import { hammingDistance } from './duplicates.ts';
import { extractFields } from './extract.ts';
import { parseFormsCatalog } from './forms.ts';
import { dedupeNames, renderName } from './naming.ts';
import { binderSections } from './order.ts';
import { processFiles } from './pipeline.ts';
import { buildLines, foldOcrConfusions, maskIdentifiers, pageText } from './text.ts';
import { file, instructionsRows, int1099Rows, page, w2Rows, words } from './test-helpers.ts';

const catalog = parseFormsCatalog(raw);
const formById = (id: string) => catalog.forms.find((f) => f.id === id) ?? null;

describe('text', () => {
  it('folds OCR confusions in designations only', () => {
    expect(foldOcrConfusions('Form 1O99-lNT Interest')).toBe('Form 1099-INT Interest');
    expect(foldOcrConfusions('Sample Brokerage, Ohio 0H')).toBe('Sample Brokerage, Ohio 0H');
  });

  it('groups words into reading-order lines', () => {
    const lines = buildLines(
      words([
        ['second line', 0.1, 0.5],
        ['first', 0.1, 0.1],
        ['line', 0.152, 0.101],
      ]),
    );
    expect(lines.map((l) => l.text)).toEqual(['first line', 'second line']);
  });

  it('keeps a slanted photographed line together', () => {
    // Each word sits a little lower than the last: the ends differ by more than a line height.
    const slanted = ['SAMPLE', '529', 'COLLEGE', 'SAVINGS', 'PLAN'].map((text, i) => ({
      text,
      x: 0.1 + i * 0.07,
      y: 0.3 + i * 0.005,
      w: 0.06,
      h: 0.012,
      confidence: 0.9,
    }));
    const lines = buildLines([...slanted, ...words([['next line', 0.1, 0.34]])]);
    expect(lines.map((l) => l.text)).toEqual(['SAMPLE 529 COLLEGE SAVINGS PLAN', 'next line']);
  });

  it('splits a row into separate lines at a column gap', () => {
    const lines = buildLines(
      words([
        ['PAYER NAME', 0.05, 0.1],
        ['Interest Income', 0.6, 0.1],
      ]),
    );
    expect(lines.map((l) => l.text)).toEqual(['PAYER NAME', 'Interest Income']);
  });

  it('masks anything shaped like an SSN, EIN or TIN', () => {
    expect(maskIdentifiers('SSN 000-00-0000 EIN 00-0000000 TIN 000000000')).toBe(
      'SSN ***-**-**** EIN **-******* TIN *********',
    );
  });
});

describe('classify', () => {
  it('auto-accepts a clean W-2', () => {
    const c = classifyText(catalog, pageText(words(w2Rows())), 'scan.pdf');
    expect(c.formId).toBe('w-2');
    expect(c.status).toBe('auto');
    expect(c.startsForm).toBe(true);
  });

  it('auto-accepts a clean 1099-INT', () => {
    const c = classifyText(catalog, pageText(words(int1099Rows())), 'IMG_5678.HEIC');
    expect(c.formId).toBe('1099-int');
    expect(c.status).toBe('auto');
  });

  it('never auto-accepts when two forms score close together', () => {
    const rows: [string, number, number][] = [
      ['Form 1099-INT Interest Income', 0.05, 0.05],
      ['Form 1099-DIV Dividends and Distributions', 0.05, 0.08],
    ];
    const c = classifyText(catalog, pageText(words(rows)), 'x.pdf');
    expect(c.status).not.toBe('auto');
    expect([c.formId, ...c.alternatives.map((a) => a.formId)]).toEqual(
      expect.arrayContaining(['1099-int', '1099-div']),
    );
  });

  it('sends unrelated text to review with no form', () => {
    const c = classifyText(
      catalog,
      pageText(words([['Grocery list: eggs, milk, bread', 0.1, 0.1]])),
      'notes.jpg',
    );
    expect(c.status).toBe('review');
    expect(c.formId).toBeNull();
  });

  it('uses the file name only as a weak hint', () => {
    const c = classifyText(catalog, pageText(words([['blurry', 0.1, 0.1]])), 'W2 maybe.jpg');
    expect(c.status).toBe('review');
  });

  it('marks instruction backs and "Page 2 of 3" as continuations', () => {
    expect(classifyText(catalog, pageText(words(instructionsRows)), 'x').continuation).toBe(true);
    expect(
      classifyText(catalog, pageText(words([['Page 2 of 3', 0.8, 0.02]])), 'x').continuation,
    ).toBe(true);
  });
});

describe('extract', () => {
  it('reads year, employer and employee last name from a W-2, nothing else', () => {
    const fields = extractFields(catalog, formById('w-2'), [pageText(words(w2Rows()))]);
    expect(fields).toEqual({
      taxYear: 2026,
      issuer: 'Northwind Logistics LLC',
      recipientLastName: 'Sample',
    });
  });

  it('reads the payer from a 1099-INT', () => {
    const fields = extractFields(catalog, formById('1099-int'), [
      pageText(words(int1099Rows('FIRST SAMPLE BANK, N.A.', 2025))),
    ]);
    expect(fields.issuer).toBe('First Sample Bank, N.A.');
    expect(fields.taxYear).toBe(2025);
  });

  it('uses the fixed issuer for SSA-1099', () => {
    const fields = extractFields(catalog, formById('ssa-1099'), [
      pageText(
        words([
          ['FORM SSA-1099 – SOCIAL SECURITY BENEFIT STATEMENT', 0.05, 0.05],
          ['2026', 0.8, 0.05],
        ]),
      ),
    ]);
    expect(fields.issuer).toBe('Social Security Administration');
    expect(fields.taxYear).toBe(2026);
  });

  it('never returns a value line that contains digits as a name', () => {
    const fields = extractFields(catalog, formById('w-2'), [
      pageText(
        words([
          ['c Employer’s name, address, and ZIP code', 0.05, 0.2],
          ['000-00-0000', 0.05, 0.22],
        ]),
      ),
    ]);
    expect(fields.issuer).toBeNull();
  });

  it('never takes an address line or an address label as the issuer', () => {
    const fields = extractFields(catalog, formById('1099-nec'), [
      pageText(
        words([
          ['PAYER’S name, street address,', 0.05, 0.2],
          ['city or town, state or province, country, ZIP', 0.05, 0.215],
          ['456 Example Ave, Suite 100', 0.05, 0.235],
        ]),
      ),
    ]);
    expect(fields.issuer).toBeNull();
  });
});

describe('naming', () => {
  it('renders the default template', () => {
    expect(
      renderName('{year} {form} – {issuer} – {client}', {
        year: 2026,
        form: '1099-DIV',
        issuer: 'Sample Brokerage',
        client: 'Sample',
      }),
    ).toBe('2026 1099-DIV – Sample Brokerage – Sample');
  });

  it('drops a missing token with its separator', () => {
    expect(
      renderName('{year} {form} – {issuer} – {client}', {
        year: 2026,
        form: 'W-2',
        issuer: null,
        client: 'Sample',
      }),
    ).toBe('2026 W-2 – Sample');
    expect(
      renderName('{year} {form} – {issuer} – {client}', {
        year: null,
        form: 'W-2',
        issuer: 'Acme',
        client: null,
      }),
    ).toBe('W-2 – Acme');
  });

  it('removes characters that are invalid in file names', () => {
    expect(renderName('{issuer}', { issuer: 'A/B: "C"?' })).toBe('A-B- -C');
  });

  it('makes names unique', () => {
    expect(dedupeNames(['a', 'b', 'A'])).toEqual(['a', 'b', 'A (2)']);
  });
});

describe('pipeline', () => {
  it('splits a multi-document scan and keeps instruction backs with their form', () => {
    const scan = file('f1', 'scan0003.pdf', [
      page(0, w2Rows()),
      page(1, int1099Rows()),
      page(2, instructionsRows),
      page(3, w2Rows('TESTVILLE UNIFIED SCHOOLS')),
    ]);
    const docs = processFiles(catalog, [scan], { clientName: 'Sample' });
    expect(docs.map((d) => [d.formId, d.pages])).toEqual([
      ['w-2', [0]],
      ['1099-int', [1, 2]],
      ['w-2', [3]],
    ]);
    expect(docs.map((d) => d.name)).toEqual([
      '2026 W-2 – Northwind Logistics LLC – Sample',
      '2026 1099-INT – Sample Credit Union – Sample',
      '2026 W-2 – Testville Unified Schools – Sample',
    ]);
  });

  it('flags a byte-identical file as an exact duplicate', () => {
    const a = file('a', 'W2.jpg', [page(0, w2Rows())], 'same');
    const b = file('b', 'W2 again.jpg', [page(0, w2Rows())], 'same');
    const docs = processFiles(catalog, [a, b]);
    expect(docs[1]?.duplicateOf).toBe('a#1');
    expect(docs[1]?.duplicateKind).toBe('exact');
  });

  it('flags a rescanned copy as a near duplicate only when the images also match', () => {
    const a = file('a', 'W2.jpg', [page(0, w2Rows(), 'ffff0000ffff0000')], 'h1');
    const b = file('b', 'W2 copy C.jpg', [page(0, w2Rows(), 'ffff0000ffff0001')], 'h2');
    const c = file('c', 'other W2.jpg', [page(0, w2Rows(), '0000ffff0000ffff')], 'h3');
    const docs = processFiles(catalog, [a, b, c]);
    expect(docs.map((d) => d.duplicateKind)).toEqual([null, 'near', null]);
  });

  it('matches a photographed copy by its figures despite a different image and OCR slips', () => {
    const amounts = (values: string[]): [string, number, number][] =>
      values.map((v, i) => [v, 0.56, 0.4 + i * 0.03]);
    const scan = [...w2Rows(), ...amounts(['12,001.02', '16,814.52', '10,495.16', '644.37'])];
    // The photo lost a leading digit and the employer line; framing changed the dHash.
    const photo = [
      ...w2Rows('').filter(([t]) => t !== ''),
      ...amounts(['2,001.02', '16,814.52', '10,495.16', '644.37']),
    ];
    const other = [...w2Rows(), ...amounts(['9,100.00', '1,204.11', '3,333.33', '77.10'])];
    const docs = processFiles(catalog, [
      file('a', 'W2.pdf', [page(0, scan, 'ffff0000ffff0000')], 'h1'),
      file('b', 'IMG_1.HEIC', [page(0, photo, '0f0f0f0f0f0f0f0f')], 'h2'),
      file('c', 'second job W2.pdf', [page(0, other, 'ffff0000ffff0000')], 'h3'),
    ]);
    expect(docs.map((d) => d.duplicateKind)).toEqual([null, 'near', null]);
  });

  it('orders the binder by category, then form', () => {
    const docs = processFiles(catalog, [
      file('a', 'a.pdf', [page(0, int1099Rows())]),
      file('b', 'b.pdf', [page(0, w2Rows())]),
    ]);
    expect(binderSections(catalog, docs).map((s) => s.category)).toEqual([
      'wages',
      'interest-dividends',
    ]);
    expect(
      binderSections(catalog, docs, ['interest-dividends', 'wages']).map((s) => s.category),
    ).toEqual(['interest-dividends', 'wages']);
  });

  it('is deterministic', () => {
    const input = [file('f1', 'scan.pdf', [page(0, w2Rows()), page(1, int1099Rows())])];
    expect(processFiles(catalog, input)).toEqual(processFiles(catalog, input));
  });
});

describe('duplicates', () => {
  it('counts differing bits', () => {
    expect(hammingDistance('0000000000000000', '000000000000000f')).toBe(4);
  });
});
