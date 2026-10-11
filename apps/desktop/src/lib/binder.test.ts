import { readFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import {
  assembleBinder,
  assembleSingle,
  winAnsi,
  type BinderSection,
  type PageSource,
} from './binder';

async function sourcePdf(label: string, pages: number) {
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++)
    d.addPage([612, 792]).drawText(`${label} page ${String(i + 1)}`, {
      x: 72,
      y: 700,
      size: 14,
      font,
    });
  return d.save();
}

const fixtures = { jpg: await readFile(new URL('./fixtures/page.jpg', import.meta.url)) };
const pdfs: Record<string, Uint8Array> = {
  a: await sourcePdf('W-2', 1),
  b: await sourcePdf('K-1', 2),
};
const source: PageSource = {
  pdf: (id) => Promise.resolve(pdfs[id] ?? new Uint8Array()),
  jpeg: () => Promise.resolve(new Uint8Array(fixtures.jpg)),
};

const sections: BinderSection[] = [
  {
    title: 'Wages',
    documents: [
      {
        name: '2026 W-2 – Northwind Logistics – Sample',
        pages: [{ kind: 'pdf', sourceId: 'a', pageIndex: 0, rotation: 0 }],
      },
    ],
  },
  {
    title: 'Interest & dividends',
    documents: [
      {
        name: '2026 1099-INT – Sample Credit Union – Sample',
        pages: [{ kind: 'image', sourceId: 'p', pageIndex: 0, rotation: 90 }],
      },
      {
        name: '2026 1099-DIV – Sample Brokerage – Sample',
        pages: [{ kind: 'image', sourceId: 'q', pageIndex: 0, rotation: 0 }],
      },
    ],
  },
  {
    title: 'Pass-through',
    documents: [
      {
        name: '2026 K-1 (1065) – Sample Partners LP – Sample',
        pages: [0, 1].map((i) => ({
          kind: 'pdf' as const,
          sourceId: 'b',
          pageIndex: i,
          rotation: 0,
        })),
      },
    ],
  },
];

const options = {
  client: 'Jane Sample',
  taxYear: 2026,
  firmName: 'Sample Tax Co.',
  logoPng: null,
  includeCover: true,
  includeIndex: true,
  trial: true,
  productName: 'BinderReady',
  generatedOn: new Date('2026-03-01T12:00:00Z'),
};

interface OutlineItem {
  title: string;
  dest: unknown;
  items: OutlineItem[];
}

function firstDocument(section: BinderSection | undefined) {
  const doc = section?.documents[0];
  if (!doc) throw new Error('fixture section has no documents');
  return doc;
}

describe('assembleBinder', () => {
  it('lays out cover, index and documents in order', async () => {
    const result = await assembleBinder(sections, source, options);
    expect(result.pageCount).toBe(1 + 1 + 5);
    expect(result.startPages).toEqual([3, 4, 5, 6]);
    const pdf = await PDFDocument.load(result.bytes);
    expect(pdf.getTitle()).toBe('Jane Sample – 2026 Binder');
    expect(pdf.getPage(3).getRotation().angle).toBe(90);
  });

  it('has nested bookmarks and index links that land on each document’s first page', async () => {
    const result = await assembleBinder(sections, source, options);
    const pdf = await getDocument({ data: result.bytes.slice() }).promise;
    const pageOf = async (dest: unknown) => {
      const array = (typeof dest === 'string' ? await pdf.getDestination(dest) : dest) as [
        { num: number; gen: number },
      ];
      return (await pdf.getPageIndex(array[0])) + 1;
    };

    const outline = (await pdf.getOutline()) as OutlineItem[];
    expect(outline.map((o) => o.title)).toEqual([
      'Cover',
      'Contents',
      'Wages',
      'Interest & dividends',
      'Pass-through',
    ]);
    const docs = outline.slice(2).flatMap((o) => o.items);
    expect(docs.map((d) => d.title)).toEqual(
      sections.flatMap((s) => s.documents.map((d) => d.name)),
    );
    expect(await Promise.all(docs.map((d) => pageOf(d.dest)))).toEqual(result.startPages);

    const index = await pdf.getPage(2);
    const links = (await index.getAnnotations()).filter(
      (a: { subtype: string }) => a.subtype === 'Link',
    ) as { dest: unknown }[];
    expect(await Promise.all(links.map((l) => pageOf(l.dest)))).toEqual(result.startPages);

    const text = (await index.getTextContent()).items
      .map((i) => ('str' in i ? i.str : ''))
      .join(' ');
    expect(text).toContain('2026 W-2 – Northwind Logistics – Sample');
    const cover = (await (await pdf.getPage(1)).getTextContent()).items
      .map((i) => ('str' in i ? i.str : ''))
      .join(' ');
    expect(cover).toContain('Created with BinderReady trial');
  });

  it('keeps digital pages as text, not images', async () => {
    const result = await assembleBinder(sections, source, options);
    const pdf = await getDocument({ data: result.bytes.slice() }).promise;
    const w2 = await pdf.getPage(3);
    const text = (await w2.getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
    expect(text).toContain('W-2 page 1');
  });

  it('leaves out the cover, index and trial note when asked', async () => {
    const result = await assembleBinder(sections, source, {
      ...options,
      includeCover: false,
      includeIndex: false,
      trial: false,
    });
    expect(result.pageCount).toBe(5);
    expect(result.startPages).toEqual([1, 2, 3, 4]);
  });

  it('paginates a long index', async () => {
    const many: BinderSection[] = [
      {
        title: 'Other',
        documents: Array.from({ length: 80 }, (_, i) => ({
          name: `Document ${String(i + 1)}`,
          pages: [{ kind: 'image' as const, sourceId: 'x', pageIndex: 0, rotation: 0 }],
        })),
      },
    ];
    const result = await assembleBinder(many, source, options);
    const pdf = await getDocument({ data: result.bytes.slice() }).promise;
    const indexPages = (result.startPages[0] ?? 0) - 2;
    expect(indexPages).toBeGreaterThan(1);
    let links = 0;
    for (let p = 2; p < 2 + indexPages; p++)
      links += (await (await pdf.getPage(p)).getAnnotations()).length;
    expect(links).toBe(80);
  });

  it('exports a single document without bookmarks', async () => {
    const bytes = await assembleSingle(
      firstDocument(sections[2]),
      source,
      'BinderReady',
      options.generatedOn,
    );
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getTitle()).toBe('2026 K-1 (1065) – Sample Partners LP – Sample');
  });

  it('replaces characters the standard fonts cannot encode', () => {
    expect(winAnsi('Zoë – 李')).toBe('Zoë – ?');
  });
});
