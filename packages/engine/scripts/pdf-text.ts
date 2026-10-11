import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/** Extracts the text layer of every page, pages separated by newlines. */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const task = getDocument({ data: bytes, useSystemFonts: false });
  try {
    const pdf = await task.promise;
    const pages: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
    }
    return pages.join('\n');
  } finally {
    await task.destroy();
  }
}
