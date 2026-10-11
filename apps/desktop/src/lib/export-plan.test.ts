import type { DocumentResult } from '@binderready/engine';
import { describe, expect, it } from 'vitest';
import type { DesktopFile, DesktopPage } from './backend';
import { memorySource, planBinder, requiredInputs } from './export-plan';
import { applyTemplate, rotate, toReviewDocs } from './review';

const page = (index: number, source: DesktopPage['source']): DesktopPage => ({
  index,
  words: [],
  source,
  phash: '0',
  image: `/cache/pages/x/${String(index)}.jpg`,
  imageWidth: 1275,
  imageHeight: 1650,
  rotation: 0,
  confidence: 1,
});

const files: Record<string, DesktopFile> = {
  digital: {
    id: 'digital',
    name: 'W2.pdf',
    path: '/in/W2.pdf',
    sha256: 'a',
    pages: [page(0, 'text-layer')],
  },
  scan: {
    id: 'scan',
    name: 'scan.pdf',
    path: '/in/scan.pdf',
    sha256: 'b',
    pages: [page(0, 'ocr'), page(1, 'ocr'), page(2, 'ocr')],
  },
};

const doc = (over: Partial<DocumentResult>): DocumentResult => ({
  id: 'x',
  fileId: 'scan',
  fileName: 'scan.pdf',
  pages: [0],
  formId: '1099-int',
  category: 'interest-dividends',
  confidence: 0.95,
  status: 'auto',
  alternatives: [],
  fields: { taxYear: 2026, issuer: 'Sample Credit Union', recipientLastName: 'Sample' },
  name: '2026 1099-INT – Sample Credit Union – Sample',
  duplicateOf: null,
  duplicateKind: null,
  ...over,
});

const reviewDocs = () =>
  toReviewDocs([
    doc({ id: 'int', pages: [0, 1] }),
    doc({
      id: 'w2',
      fileId: 'digital',
      fileName: 'W2.pdf',
      formId: 'w-2',
      category: 'wages',
      name: '2026 W-2 – Northwind Logistics LLC – Sample',
      fields: { taxYear: 2026, issuer: 'Northwind Logistics LLC', recipientLastName: 'Sample' },
    }),
    doc({ id: 'dup', pages: [2], duplicateOf: 'int', duplicateKind: 'near' }),
  ]);

describe('planBinder', () => {
  it('orders categories, copies digital pages and leaves duplicates out', () => {
    const sections = planBinder(reviewDocs(), files, {}, []);
    expect(sections.map((s) => s.title)).toEqual(['Wages', 'Interest & dividends']);
    expect(sections[0]?.documents[0]?.pages).toEqual([
      { kind: 'pdf', sourceId: 'digital', pageIndex: 0, rotation: 0 },
    ]);
    expect(sections[1]?.documents.map((d) => d.pages.map((p) => p.kind))).toEqual([
      ['image', 'image'],
    ]);
  });

  it('follows a custom category order and includes a restored duplicate', () => {
    const docs = reviewDocs().map((d) => (d.id === 'dup' ? { ...d, excluded: false } : d));
    const sections = planBinder(docs, files, {}, ['interest-dividends']);
    expect(sections.map((s) => s.title)).toEqual(['Interest & dividends', 'Wages']);
    expect(sections[0]?.documents).toHaveLength(2);
  });

  it('applies rotations from review', () => {
    const rotations = rotate(rotate({}, 'scan', 1), 'scan', 1);
    const pages = planBinder(reviewDocs(), files, rotations, [])[1]?.documents[0]?.pages;
    expect(pages?.map((p) => p.rotation)).toEqual([0, 180]);
  });

  it('lists exactly the inputs to fetch', () => {
    const { pdfs, images } = requiredInputs(planBinder(reviewDocs(), files, {}, []), files);
    expect([...pdfs]).toEqual([['digital', '/in/W2.pdf']]);
    expect([...images.values()]).toEqual(['/cache/pages/x/0.jpg', '/cache/pages/x/1.jpg']);
  });

  it('serves fetched bytes and rejects anything missing', async () => {
    const source = memorySource(new Map([['digital', new Uint8Array([1])]]), new Map());
    await expect(source.pdf('digital')).resolves.toEqual(new Uint8Array([1]));
    await expect(source.jpeg('scan', 0)).rejects.toThrow('Missing page scan:0');
  });
});

describe('applyTemplate', () => {
  it('renames generated names and keeps typed ones', () => {
    const docs = reviewDocs().map((d) =>
      d.id === 'w2' ? { ...d, name: 'Typed by hand', nameEdited: true } : d,
    );
    const renamed = applyTemplate(docs, {
      template: '{client} {form} {year}',
      clientName: 'Sample',
    });
    expect(renamed.map((d) => d.name)).toEqual([
      'Sample 1099-INT 2026',
      'Typed by hand',
      'Sample 1099-INT 2026',
    ]);
  });
});
