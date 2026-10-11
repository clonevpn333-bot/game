/**
 * Opens an exported binder and checks that it navigates: every bookmark and every
 * index link lands on the first page of the right document. Renders the cover, the
 * index and a navigation sheet (each bookmark next to the page it opens) as
 * screenshots, so the result can also be checked by eye.
 *
 *   node scripts/verify-binder.ts <binder.pdf> [--shots docs/screenshots/phase-4] [--expect-title "…"]
 *
 * Exits 1 on any failed check. Needs pdftoppm; screenshots need a Chromium
 * (CHROMIUM_PATH or playwright-core's).
 */
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';
import { OPS, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// pdfjs reads its standard fonts with fs in Node: a plain path, not a file:// URL.
const standardFontDataUrl = `${join(dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json')), 'standard_fonts')}/`;

export interface BinderCheck {
  pages: number;
  title: string;
  bookmarks: { title: string; page: number; children: { title: string; page: number }[] }[];
  links: { text: string; page: number; fromPage: number }[];
  failures: string[];
}

interface OutlineNode {
  title: string;
  dest: unknown;
  items: OutlineNode[];
}

export async function checkBinder(path: string, expectTitle?: string): Promise<BinderCheck> {
  const pdf = await getDocument({ data: new Uint8Array(await readFile(path)), standardFontDataUrl })
    .promise;
  const failures: string[] = [];
  const pageOf = async (dest: unknown): Promise<number> => {
    const explicit = typeof dest === 'string' ? await pdf.getDestination(dest) : dest;
    const ref = Array.isArray(explicit) ? (explicit[0] as unknown) : null;
    if (!ref || typeof ref !== 'object') return -1;
    return (await pdf.getPageIndex(ref as { num: number; gen: number })) + 1;
  };

  const meta = await pdf.getMetadata();
  const title = (meta.info as { Title?: string }).Title ?? '';
  if (expectTitle !== undefined && title !== expectTitle)
    failures.push(`title is "${title}", expected "${expectTitle}"`);

  const outline = ((await pdf.getOutline()) as OutlineNode[] | null) ?? [];
  const bookmarks = await Promise.all(
    outline.map(async (node) => ({
      title: node.title,
      page: await pageOf(node.dest),
      children: await Promise.all(
        node.items.map(async (child) => ({ title: child.title, page: await pageOf(child.dest) })),
      ),
    })),
  );
  if (!bookmarks.length) failures.push('the binder has no bookmarks');

  const documents = bookmarks.flatMap((b) => b.children);
  // Documents follow one another: each starts after the previous one.
  documents.forEach((d, i) => {
    if (d.page < 1) failures.push(`bookmark "${d.title}" has no target page`);
    const previous = documents[i - 1];
    if (previous && d.page <= previous.page)
      failures.push(`bookmark "${d.title}" (p${String(d.page)}) is not after "${previous.title}"`);
  });
  // A category bookmark opens its first document.
  for (const b of bookmarks.filter((x) => x.children.length)) {
    if (b.page !== b.children[0]?.page)
      failures.push(`category "${b.title}" opens p${String(b.page)}, not its first document`);
  }

  // Index links: in reading order they must match the document bookmarks one for one.
  const links: BinderCheck['links'] = [];
  const contents = bookmarks.find((b) => b.title === 'Contents');
  const firstDoc = documents[0]?.page ?? pdf.numPages + 1;
  if (contents) {
    for (let p = contents.page; p < firstDoc; p++) {
      const page = await pdf.getPage(p);
      const text = await page.getTextContent();
      const annotations = (await page.getAnnotations()) as {
        subtype: string;
        dest?: unknown;
        rect: number[];
      }[];
      const rows = annotations
        .filter((a) => a.subtype === 'Link' && a.dest)
        .sort((a, b) => (b.rect[1] ?? 0) - (a.rect[1] ?? 0));
      for (const link of rows) {
        const [, y1 = 0, , y2 = 0] = link.rect;
        const items = text.items as { str?: string; transform?: number[] }[];
        const label = items
          .filter(
            (it): it is { str: string; transform: number[] } =>
              it.str !== undefined && it.transform !== undefined,
          )
          .filter((it) => {
            const y = it.transform[5] ?? 0;
            return y >= y1 - 1 && y <= y2 + 1;
          })
          .map((it) => it.str)
          .join(' ')
          .replace(/\s*\.(\s*\.)+\s*/g, ' … ')
          .trim();
        links.push({ text: label, page: await pageOf(link.dest), fromPage: p });
      }
    }
    if (links.length !== documents.length)
      failures.push(
        `index has ${String(links.length)} links for ${String(documents.length)} documents`,
      );
    links.forEach((l, i) => {
      const doc = documents[i];
      if (!doc) return;
      if (l.page !== doc.page)
        failures.push(
          `index link "${l.text}" opens p${String(l.page)}, bookmark says p${String(doc.page)}`,
        );
      if (!l.text.startsWith(doc.title.slice(0, 20)))
        failures.push(`index row "${l.text}" does not name "${doc.title}"`);
      if (!l.text.endsWith(String(doc.page)))
        failures.push(`index row "${l.text}" does not print page ${String(doc.page)}`);
    });
  }
  const result = { pages: pdf.numPages, title, bookmarks, links, failures };
  await pdf.loadingTask.destroy();
  return result;
}

/** Text on the cover page and how many images it draws (the firm logo). */
export async function coverInfo(path: string): Promise<{ text: string; images: number }> {
  const pdf = await getDocument({ data: new Uint8Array(await readFile(path)), standardFontDataUrl })
    .promise;
  const page = await pdf.getPage(1);
  const text = (await page.getTextContent()).items
    .map((it) => ('str' in it ? it.str : ''))
    .join(' ');
  const ops = await page.getOperatorList();
  const images = ops.fnArray.filter((op) => op === OPS.paintImageXObject).length;
  await pdf.loadingTask.destroy();
  return { text, images };
}

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

/** Cover, index pages and a bookmark → target page sheet, as PNG screenshots. */
export async function shootBinder(
  path: string,
  check: BinderCheck,
  outDir: string,
  prefix: string,
) {
  await mkdir(outDir, { recursive: true });
  const work = await mkdtemp(join(tmpdir(), 'br-verify-'));
  try {
    const render = (page: number, dpi: number, out: string) => {
      execFileSync('pdftoppm', [
        '-f',
        String(page),
        '-l',
        String(page),
        '-r',
        String(dpi),
        '-png',
        '-singlefile',
        path,
        out,
      ]);
      return `${out}.png`;
    };
    const front = check.bookmarks.flatMap((b) => b.children)[0]?.page ?? 1;
    for (let p = 1; p < front; p++) {
      render(p, 110, join(outDir, `${prefix}-page-${String(p)}`));
    }
    const thumbs = new Map<number, string>();
    for (const page of new Set(
      check.bookmarks.flatMap((b) => [b.page, ...b.children.map((c) => c.page)]),
    )) {
      const file = render(page, 30, join(work, `t${String(page)}`));
      thumbs.set(page, `data:image/png;base64,${(await readFile(file)).toString('base64')}`);
    }
    const rows = check.bookmarks
      .flatMap((b) => [
        { depth: 0, title: b.title, page: b.page },
        ...b.children.map((c) => ({ depth: 1, title: c.title, page: c.page })),
      ])
      .map(
        (r) =>
          `<tr><td style="padding-left:${String(8 + r.depth * 20)}px">${escape(r.title)}</td><td class="n">p${String(r.page)}</td><td><img src="${thumbs.get(r.page) ?? ''}"></td></tr>`,
      )
      .join('');
    const html = `<!doctype html><meta charset="utf-8"><style>
      body{font:13px/1.4 system-ui,sans-serif;margin:24px;color:#111}
      h1{font-size:16px;margin:0 0 4px} p{color:#666;margin:0 0 16px}
      table{border-collapse:collapse} td{border-top:1px solid #e5e5e5;padding:6px 8px;vertical-align:middle}
      td.n{font-family:ui-monospace,monospace;color:#555} img{height:64px;border:1px solid #ddd}
    </style><h1>Bookmarks → the page each one opens</h1>
    <p>${escape(check.title)} · ${String(check.pages)} pages · ${String(check.links.length)} index links checked · ${check.failures.length ? `${String(check.failures.length)} failures` : 'all bookmarks and links land on the right page'}</p>
    <table>${rows}</table>`;
    const browser = await chromium.launch(
      process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    );
    const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
    await page.setContent(html);
    await page.screenshot({ path: join(outDir, `${prefix}-navigation.png`), fullPage: true });
    await browser.close();
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      shots: { type: 'string' },
      'expect-title': { type: 'string' },
      prefix: { type: 'string' },
    },
  });
  const path = resolve(positionals[0] ?? '');
  const check = await checkBinder(path, values['expect-title']);
  console.log(
    `${String(check.pages)} pages, ${String(check.bookmarks.length)} top-level bookmarks, ${String(check.links.length)} index links`,
  );
  for (const f of check.failures) console.log(`FAIL  ${f}`);
  if (values.shots)
    await shootBinder(path, check, resolve(values.shots), values.prefix ?? 'binder');
  if (check.failures.length) process.exitCode = 1;
}
