import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { extractOmbNumbers } from '../src/verify.ts';
import { extractPdfText } from './pdf-text.ts';

describe('extractPdfText', () => {
  it('reads the text layer of every page of a real PDF', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    doc
      .addPage()
      .drawText('Sample Statement  OMB No. 0000-0000', { x: 50, y: 700, font, size: 12 });
    doc.addPage().drawText('Box one amount', { x: 50, y: 700, font, size: 12 });

    const text = await extractPdfText(await doc.save());
    expect(text).toContain('Sample Statement');
    expect(text.split('\n')[1]).toContain('Box one amount');
    expect(extractOmbNumbers(text)).toEqual(['0000-0000']);
  });
});
