/**
 * Turns a PDF into engine input: words with page-fraction boxes from the text
 * layer (pdfjs), plus a 64-bit dHash of each rendered page (pdftoppm) for
 * near-duplicate detection.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FileInput, PageInput, Word } from '@binderready/engine';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfjsRoot = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
const standardFontDataUrl = `${pathToFileURL(join(pdfjsRoot, 'standard_fonts')).href}/`;

export class OpenError extends Error {
  readonly kind: 'password' | 'corrupt';
  constructor(kind: 'password' | 'corrupt', message: string) {
    super(message);
    this.kind = kind;
  }
}

export async function textLayerPages(bytes: Uint8Array): Promise<PageInput[]> {
  const task = getDocument({ data: bytes.slice(), standardFontDataUrl, useSystemFonts: false });
  try {
    let pdf;
    try {
      pdf = await task.promise;
    } catch (error) {
      const name = (error as { name?: string }).name ?? '';
      throw new OpenError(name === 'PasswordException' ? 'password' : 'corrupt', String(error));
    }
    const pages: PageInput[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const { width, height } = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const words: Word[] = [];
      for (const item of content.items) {
        if (!('str' in item) || item.str.trim() === '') continue;
        const [, , , d = 0, e = 0, f = 0] = item.transform as number[];
        const fontHeight = Math.abs(d) || item.height;
        const top = height - f - fontHeight;
        // Split the run into words, sharing its width by character count.
        const tokens = item.str.split(/(\s+)/);
        const perChar = item.width / Math.max(1, item.str.length);
        let offset = 0;
        for (const token of tokens) {
          if (token.trim() !== '') {
            words.push({
              text: token,
              x: (e + offset * perChar) / width,
              y: top / height,
              w: (token.length * perChar) / width,
              h: fontHeight / height,
              confidence: 1,
            });
          }
          offset += token.length;
        }
      }
      pages.push({ index: n - 1, words, source: 'text-layer' });
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

/** dHash: 9×8 grayscale, one bit per horizontal neighbour comparison → 16 hex chars. */
export function dHashFromGray(pixels: Uint8Array, width: number, height: number): string {
  const cols = 9;
  const rows = 8;
  const cell = (cx: number, cy: number) => {
    const x0 = Math.floor((cx * width) / cols);
    const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * width) / cols));
    const y0 = Math.floor((cy * height) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * height) / rows));
    let sum = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) sum += pixels[y * width + x] ?? 0;
    return sum / ((x1 - x0) * (y1 - y0));
  };
  let bits = '';
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols - 1; x++) bits += cell(x, y) > cell(x + 1, y) ? '1' : '0';
  let hex = '';
  for (let i = 0; i < 64; i += 4) hex += Number.parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/** Parses a binary PGM (P5) as written by `pdftoppm -gray`. */
export function parsePgm(buffer: Buffer): { width: number; height: number; pixels: Uint8Array } {
  const header = buffer.subarray(0, 64).toString('latin1');
  const m = /^P5\s+(\d+)\s+(\d+)\s+(\d+)\s/.exec(header);
  if (!m?.[1] || !m[2]) throw new Error('Not a binary PGM');
  const width = Number(m[1]);
  const height = Number(m[2]);
  return {
    width,
    height,
    pixels: new Uint8Array(buffer.subarray(m[0].length, m[0].length + width * height)),
  };
}

/** Rasterizes each page at low resolution with pdftoppm and hashes it. */
export function pageHashes(path: string, pageCount: number): string[] {
  const hashes: string[] = [];
  for (let n = 1; n <= pageCount; n++) {
    const pgm = execFileSync(
      'pdftoppm',
      ['-gray', '-r', '24', '-f', String(n), '-l', String(n), path],
      { maxBuffer: 16 * 1024 * 1024 },
    );
    const { width, height, pixels } = parsePgm(pgm);
    hashes.push(dHashFromGray(pixels, width, height));
  }
  return hashes;
}

export async function fileInput(
  id: string,
  name: string,
  path: string,
  bytes: Uint8Array,
  sha256: string,
): Promise<FileInput> {
  const pages = await textLayerPages(bytes);
  const hashes = pageHashes(path, pages.length);
  return {
    id,
    name,
    sha256,
    pages: pages.map((p, i) => ({ ...p, ...(hashes[i] ? { phash: hashes[i] } : {}) })),
  };
}
