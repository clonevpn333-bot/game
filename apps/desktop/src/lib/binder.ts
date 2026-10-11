/**
 * Binder assembly with pdf-lib: cover page, clickable index, nested bookmarks
 * (Category → Document), then every document's pages in binder order.
 *
 * Pages that came from a digital PDF are copied from the source file (vector,
 * searchable); scanned and photographed pages are embedded as JPEG. Pure apart
 * from the `PageSource` callbacks, so it runs and is tested in Node.
 */
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFPage,
  PDFRef,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
} from 'pdf-lib';

export interface BinderPage {
  /** A page copied from a digital PDF, or an image page. */
  kind: 'pdf' | 'image';
  /** Source PDF (for "pdf") and 0-based page index within it. */
  sourceId: string;
  pageIndex: number;
  /** Extra clockwise rotation chosen during review. */
  rotation: number;
}

export interface BinderDocument {
  name: string;
  pages: BinderPage[];
}

export interface BinderSection {
  title: string;
  documents: BinderDocument[];
}

export interface PageSource {
  /** Bytes of a source PDF, for copying digital pages. */
  pdf: (sourceId: string) => Promise<Uint8Array>;
  /** JPEG bytes of an image page at the export quality. */
  jpeg: (sourceId: string, pageIndex: number) => Promise<Uint8Array>;
}

export interface BinderOptions {
  client: string;
  taxYear: number;
  firmName: string;
  /** PNG bytes of the firm logo, or null. */
  logoPng: Uint8Array | null;
  includeCover: boolean;
  includeIndex: boolean;
  trial: boolean;
  productName: string;
  generatedOn: Date;
}

const LETTER: [number, number] = [612, 792];
const MARGIN = 54;
const INK = rgb(0.04, 0.04, 0.04);
const MUTED = rgb(0.4, 0.4, 0.4);
const SUBTLE = rgb(0.55, 0.55, 0.55);
const RULE = rgb(0.85, 0.85, 0.85);

/** pdf-lib's standard fonts use WinAnsi: replace anything it can't encode. */
const WIN_ANSI_EXTRAS = new Set('–—‘’“”•…€™ŠšŽžŒœŸ†‡‰‹›ƒˆ˜'.split(''));
export function winAnsi(text: string): string {
  return text.replace(/[\u0100-\u{10FFFF}]/gu, (c) => (WIN_ANSI_EXTRAS.has(c) ? c : '?'));
}

function truncate(text: string, font: PDFFont, size: number, width: number): string {
  let t = winAnsi(text);
  if (font.widthOfTextAtSize(t, size) <= width) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function addLink(
  doc: PDFDocument,
  page: PDFPage,
  rect: [number, number, number, number],
  target: PDFRef,
) {
  const annot = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: rect,
    Border: [0, 0, 0],
    Dest: [target, 'XYZ', null, null, null],
  });
  const ref = doc.context.register(annot);
  const existing = page.node.lookup(PDFName.of('Annots'));
  if (existing instanceof PDFArray) existing.push(ref);
  else page.node.set(PDFName.of('Annots'), doc.context.obj([ref]));
}

interface OutlineNode {
  title: string;
  target: PDFRef;
  children: OutlineNode[];
}

/** Writes a nested outline (bookmarks) and opens the file with the bookmark panel visible. */
function writeOutline(doc: PDFDocument, nodes: OutlineNode[]) {
  const ctx = doc.context;
  const rootRef = ctx.nextRef();
  const build = (
    items: OutlineNode[],
    parent: PDFRef,
  ): { first: PDFRef; last: PDFRef; count: number } | null => {
    if (!items.length) return null;
    const refs = items.map(() => ctx.nextRef());
    let total = 0;
    items.forEach((item, i) => {
      const ref = refs[i] as PDFRef;
      const dict = PDFDict.withContext(ctx);
      dict.set(PDFName.of('Title'), PDFHexString.fromText(item.title));
      dict.set(PDFName.of('Parent'), parent);
      dict.set(PDFName.of('Dest'), ctx.obj([item.target, 'XYZ', null, null, null]));
      if (i > 0) dict.set(PDFName.of('Prev'), refs[i - 1] as PDFRef);
      if (i < items.length - 1) dict.set(PDFName.of('Next'), refs[i + 1] as PDFRef);
      const children = build(item.children, ref);
      if (children) {
        dict.set(PDFName.of('First'), children.first);
        dict.set(PDFName.of('Last'), children.last);
        // Positive count: categories open, so documents show at a glance.
        dict.set(PDFName.of('Count'), PDFNumber.of(children.count));
        total += children.count;
      }
      ctx.assign(ref, dict);
      total += 1;
    });
    return { first: refs[0] as PDFRef, last: refs[refs.length - 1] as PDFRef, count: total };
  };
  const top = build(nodes, rootRef);
  if (!top) return;
  ctx.assign(
    rootRef,
    ctx.obj({ Type: 'Outlines', First: top.first, Last: top.last, Count: top.count }),
  );
  doc.catalog.set(PDFName.of('Outlines'), rootRef);
  doc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
}

export interface BinderResult {
  bytes: Uint8Array;
  pageCount: number;
  documentCount: number;
  /** 1-based page number where each document starts, in binder order. */
  startPages: number[];
}

export async function assembleBinder(
  sections: BinderSection[],
  source: PageSource,
  options: BinderOptions,
): Promise<BinderResult> {
  const doc = await PDFDocument.create();
  const title = `${options.client} – ${String(options.taxYear)} Binder`;
  doc.setTitle(winAnsi(title), { showInWindowTitleBar: true });
  doc.setAuthor(winAnsi(options.firmName || options.productName));
  doc.setCreator(options.productName);
  doc.setProducer(options.productName);
  doc.setCreationDate(options.generatedOn);
  doc.setModificationDate(options.generatedOn);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const documents = sections.flatMap((s) => s.documents);
  const bodyPageCount = documents.reduce((n, d) => n + d.pages.length, 0);

  // Index layout: one row per category heading and per document.
  const rowHeight = 18;
  const firstIndexTop = 792 - MARGIN - 70;
  const rowsPerPage = Math.floor((firstIndexTop - MARGIN - 30) / rowHeight);
  const indexRows =
    sections.reduce((n, s) => n + 1 + s.documents.length, 0) + Math.max(0, sections.length - 1);
  const indexPageCount = options.includeIndex ? Math.max(1, Math.ceil(indexRows / rowsPerPage)) : 0;
  const frontCount = (options.includeCover ? 1 : 0) + indexPageCount;

  const coverPage = options.includeCover ? doc.addPage(LETTER) : null;
  const indexPages = Array.from({ length: indexPageCount }, () => doc.addPage(LETTER));

  // Body pages, copied or embedded in order.
  const pdfCache = new Map<string, PDFDocument>();
  const startPages: number[] = [];
  const docStartRefs: PDFRef[] = [];
  let pageNumber = frontCount;
  for (const d of documents) {
    startPages.push(pageNumber + 1);
    let first: PDFPage | null = null;
    for (const p of d.pages) {
      let page: PDFPage;
      if (p.kind === 'pdf') {
        let src = pdfCache.get(p.sourceId);
        if (!src) {
          src = await PDFDocument.load(await source.pdf(p.sourceId), {
            ignoreEncryption: false,
            updateMetadata: false,
          });
          pdfCache.set(p.sourceId, src);
        }
        const [copied] = await doc.copyPages(src, [p.pageIndex]);
        if (!copied)
          throw new Error(`Page ${String(p.pageIndex + 1)} is missing from its source file.`);
        page = doc.addPage(copied);
        if (p.rotation) page.setRotation(degrees((page.getRotation().angle + p.rotation) % 360));
      } else {
        const image = await doc.embedJpg(await source.jpeg(p.sourceId, p.pageIndex));
        // Fit the image on a letter page in its own orientation, then apply the review rotation.
        const landscape = image.width > image.height;
        page = doc.addPage(landscape ? [LETTER[1], LETTER[0]] : LETTER);
        const { width, height } = page.getSize();
        const scale = Math.min(width / image.width, height / image.height);
        const w = image.width * scale;
        const h = image.height * scale;
        page.drawImage(image, { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h });
        if (p.rotation) page.setRotation(degrees(p.rotation % 360));
      }
      first ??= page;
      pageNumber += 1;
    }
    if (first) docStartRefs.push(first.ref);
  }
  const totalPages = frontCount + bodyPageCount;

  // Cover.
  if (coverPage) {
    let y = 792 - MARGIN;
    if (options.logoPng) {
      const logo = await doc.embedPng(options.logoPng);
      const scale = Math.min(140 / logo.width, 48 / logo.height);
      coverPage.drawImage(logo, {
        x: MARGIN,
        y: y - logo.height * scale,
        width: logo.width * scale,
        height: logo.height * scale,
      });
      y -= logo.height * scale + 18;
    }
    if (options.firmName) {
      coverPage.drawText(winAnsi(options.firmName), {
        x: MARGIN,
        y: y - 12,
        size: 12,
        font: bold,
        color: INK,
      });
    }
    const centerY = 792 / 2 + 60;
    coverPage.drawText(winAnsi(options.client), {
      x: MARGIN,
      y: centerY,
      size: 34,
      font: bold,
      color: INK,
    });
    coverPage.drawText(`${String(options.taxYear)} tax documents`, {
      x: MARGIN,
      y: centerY - 34,
      size: 16,
      font: regular,
      color: MUTED,
    });
    coverPage.drawLine({
      start: { x: MARGIN, y: centerY - 62 },
      end: { x: 612 - MARGIN, y: centerY - 62 },
      thickness: 0.75,
      color: RULE,
    });
    const facts: [string, string][] = [
      ['Documents', String(documents.length)],
      ['Pages', String(totalPages)],
      [
        'Prepared',
        options.generatedOn.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      ],
    ];
    facts.forEach(([k, v], i) => {
      const x = MARGIN + i * 150;
      coverPage.drawText(k.toUpperCase(), {
        x,
        y: centerY - 86,
        size: 8,
        font: regular,
        color: SUBTLE,
      });
      coverPage.drawText(winAnsi(v), { x, y: centerY - 104, size: 13, font: bold, color: INK });
    });
    if (options.trial) {
      const note = `Created with ${options.productName} trial`;
      coverPage.drawText(note, {
        x: (612 - regular.widthOfTextAtSize(note, 8)) / 2,
        y: MARGIN / 2,
        size: 8,
        font: regular,
        color: SUBTLE,
      });
    }
  }

  // Index with links.
  if (indexPages.length) {
    let pageI = 0;
    let row = 0;
    let docI = 0;
    const top = (i: number) => (i === 0 ? firstIndexTop : 792 - MARGIN - 20);
    const firstIndex = indexPages[0];
    if (firstIndex) {
      firstIndex.drawText('Contents', {
        x: MARGIN,
        y: 792 - MARGIN - 24,
        size: 20,
        font: bold,
        color: INK,
      });
      firstIndex.drawText(winAnsi(`${options.client} · ${String(options.taxYear)}`), {
        x: MARGIN,
        y: 792 - MARGIN - 44,
        size: 10,
        font: regular,
        color: MUTED,
      });
    }
    const nextRow = () => {
      row += 1;
      const capacity = pageI === 0 ? rowsPerPage : Math.floor((top(pageI) - MARGIN) / rowHeight);
      if (row >= capacity) {
        pageI += 1;
        row = 0;
      }
    };
    sections.forEach((section, si) => {
      if (si > 0) nextRow();
      const page = indexPages[pageI];
      if (!page) return;
      const y = top(pageI) - row * rowHeight;
      page.drawText(winAnsi(section.title).toUpperCase(), {
        x: MARGIN,
        y,
        size: 8.5,
        font: bold,
        color: MUTED,
      });
      nextRow();
      for (const d of section.documents) {
        const p = indexPages[pageI];
        const start = startPages[docI];
        const target = docStartRefs[docI];
        docI += 1;
        if (!p || start === undefined || !target) continue;
        const yy = top(pageI) - row * rowHeight;
        const num = String(start);
        const numWidth = regular.widthOfTextAtSize(num, 10);
        const label = truncate(d.name, regular, 10, 612 - 2 * MARGIN - numWidth - 40);
        p.drawText(label, { x: MARGIN + 10, y: yy, size: 10, font: regular, color: INK });
        p.drawText(num, { x: 612 - MARGIN - numWidth, y: yy, size: 10, font: regular, color: INK });
        const labelEnd = MARGIN + 10 + regular.widthOfTextAtSize(label, 10) + 6;
        const dotsEnd = 612 - MARGIN - numWidth - 6;
        if (dotsEnd > labelEnd) {
          p.drawLine({
            start: { x: labelEnd, y: yy + 2 },
            end: { x: dotsEnd, y: yy + 2 },
            thickness: 0.5,
            color: RULE,
            dashArray: [1, 2.5],
          });
        }
        addLink(doc, p, [MARGIN, yy - 4, 612 - MARGIN, yy + 12], target);
        nextRow();
      }
    });
    indexPages.forEach((p, i) => {
      const label = `Contents ${String(i + 1)} of ${String(indexPages.length)}`;
      p.drawText(label, {
        x: 612 - MARGIN - regular.widthOfTextAtSize(label, 8),
        y: MARGIN / 2,
        size: 8,
        font: regular,
        color: SUBTLE,
      });
    });
  }

  // Bookmarks: Category → Document.
  let k = 0;
  const outline: OutlineNode[] = sections.map((section) => {
    const children = section.documents.flatMap((d): OutlineNode[] => {
      const target = docStartRefs[k];
      k += 1;
      return target ? [{ title: d.name, target, children: [] }] : [];
    });
    return { title: section.title, target: children[0]?.target ?? doc.getPage(0).ref, children };
  });
  if (coverPage) outline.unshift({ title: 'Cover', target: coverPage.ref, children: [] });
  if (indexPages[0])
    outline.splice(coverPage ? 1 : 0, 0, {
      title: 'Contents',
      target: indexPages[0].ref,
      children: [],
    });
  writeOutline(doc, outline);

  const bytes = await doc.save({ useObjectStreams: true });
  return { bytes, pageCount: doc.getPageCount(), documentCount: documents.length, startPages };
}

/** One document as its own PDF, for "Also export individual renamed files". */
export async function assembleSingle(
  document: BinderDocument,
  source: PageSource,
  productName: string,
  generatedOn: Date,
): Promise<Uint8Array> {
  const { bytes } = await assembleBinder([{ title: '', documents: [document] }], source, {
    client: document.name,
    taxYear: 0,
    firmName: '',
    logoPng: null,
    includeCover: false,
    includeIndex: false,
    trial: false,
    productName,
    generatedOn,
  });
  const out = await PDFDocument.load(bytes);
  out.setTitle(winAnsi(document.name));
  // A single document doesn't need a bookmark panel.
  out.catalog.delete(PDFName.of('Outlines'));
  out.catalog.delete(PDFName.of('PageMode'));
  return out.save({ useObjectStreams: true });
}
