import type { DocumentResult } from '@binderready/engine';
import { describe, expect, it } from 'vitest';
import type { DesktopFile } from './backend';
import {
  accept,
  boardGroups,
  categoryForKey,
  changeForm,
  mergeWithPrevious,
  movePage,
  navigationOrder,
  reassignCategory,
  rename,
  rotate,
  splitAt,
  toReviewDocs,
  toggleExcluded,
} from './review';

const words = (rows: [string, number, number][]) =>
  rows.flatMap(([text, x0, y]) => {
    let x = x0;
    return text.split(' ').map((t) => {
      const w = { text: t, x, y, w: t.length * 0.009, h: 0.012, confidence: 1 };
      x += t.length * 0.009 + 0.006;
      return w;
    });
  });

const intPage = words([
  ['Form 1099-INT', 0.6, 0.05],
  ['Interest Income', 0.6, 0.08],
  ['For calendar year 2026', 0.6, 0.11],
  ["PAYER'S name", 0.05, 0.05],
  ['SAMPLE CREDIT UNION', 0.05, 0.07],
  ['1 Interest income', 0.5, 0.2],
  ['2 Early withdrawal penalty', 0.5, 0.25],
]);

const file: DesktopFile = {
  id: 'f1',
  name: 'scan.pdf',
  path: '/tmp/scan.pdf',
  sha256: 'x',
  pages: [0, 1, 2].map((index) => ({
    index,
    words: index === 2 ? intPage : [],
    source: 'ocr',
    phash: '0',
    image: '',
    imageWidth: 1,
    imageHeight: 1,
    rotation: 0,
    confidence: 1,
  })),
};
const files = { f1: file };
const naming = { template: '{year} {form} – {issuer} – {client}', clientName: 'Sample' };

const base = (over: Partial<DocumentResult>): DocumentResult => ({
  id: 'f1#1',
  fileId: 'f1',
  fileName: 'scan.pdf',
  pages: [0, 1, 2],
  formId: 'w-2',
  category: 'wages',
  confidence: 0.95,
  status: 'auto',
  alternatives: [],
  fields: { taxYear: 2026, issuer: 'Northwind', recipientLastName: 'Sample' },
  name: '2026 W-2 – Northwind – Sample',
  duplicateOf: null,
  duplicateKind: null,
  ...over,
});

describe('review edits', () => {
  it('puts unresolved review documents in their own group at the top', () => {
    const docs = toReviewDocs([
      base({}),
      base({ id: 'f1#2', status: 'review', formId: null, category: 'other' }),
    ]);
    expect(boardGroups(docs).map((g) => g.id)).toEqual(['needs-review', 'wages']);
    expect(navigationOrder(docs)).toEqual(['f1#2', 'f1#1']);
    expect(boardGroups(accept(docs, 'f1#2')).map((g) => g.id)).toEqual(['wages', 'other']);
  });

  it('starts duplicates excluded and lets them be restored', () => {
    const docs = toReviewDocs([
      base({}),
      base({ id: 'f1#2', duplicateOf: 'f1#1', duplicateKind: 'near' }),
    ]);
    expect(boardGroups(docs).at(-1)?.id).toBe('excluded');
    expect(toggleExcluded(docs, 'f1#2').find((d) => d.id === 'f1#2')?.excluded).toBe(false);
  });

  it('reassigns a category with the number keys', () => {
    const docs = toReviewDocs([base({})]);
    const category = categoryForKey(3);
    expect(category).toBe('interest-dividends');
    expect(reassignCategory(docs, 'f1#1', 'interest-dividends')[0]?.category).toBe(
      'interest-dividends',
    );
  });

  it('changes the form type and re-reads the issuer for it', () => {
    const docs = toReviewDocs([base({ pages: [2], formId: 'w-2' })]);
    const [doc] = changeForm(docs, files, 'f1#1', '1099-int', naming);
    expect(doc?.formId).toBe('1099-int');
    expect(doc?.category).toBe('interest-dividends');
    expect(doc?.fields.issuer).toBe('Sample Credit Union');
    expect(doc?.name).toBe('2026 1099-INT – Sample Credit Union – Sample');
  });

  it('keeps a hand-typed name and restores the generated one when cleared', () => {
    const docs = toReviewDocs([base({})]);
    const edited = rename(docs, 'f1#1', 'Jane W-2 from employer', naming);
    expect(edited[0]?.name).toBe('Jane W-2 from employer');
    expect(rename(edited, 'f1#1', '  ', naming)[0]?.name).toBe('2026 W-2 – Northwind – Sample');
  });

  it('splits at a page and classifies the new document', () => {
    const docs = toReviewDocs([base({})]);
    const next = splitAt(docs, files, 'f1#1', 2, naming);
    expect(next.map((d) => d.pages)).toEqual([[0, 1], [2]]);
    expect(next[1]?.formId).toBe('1099-int');
  });

  it('merges into the previous document of the same file', () => {
    const docs = toReviewDocs([base({ pages: [0] }), base({ id: 'f1#2', pages: [1, 2] })]);
    expect(mergeWithPrevious(docs, 'f1#2').docs.map((d) => d.pages)).toEqual([[0, 1, 2]]);
    expect(mergeWithPrevious(docs, 'f1#1').error).toMatch(/first document/);
  });

  it('reorders pages and rotates them in 90° steps', () => {
    const docs = toReviewDocs([base({})]);
    expect(movePage(docs, 'f1#1', 2, 0)[0]?.pages).toEqual([2, 0, 1]);
    expect(rotate(rotate({}, 'f1', 0), 'f1', 0, -180)).toEqual({ 'f1:0': 270 });
  });
});
