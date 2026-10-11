import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { securityContentHash } from './content-hash';
import { securityPdfPath } from './security-content';

describe('security overview PDF', () => {
  it('exists and matches the current security content', async () => {
    const file = resolve(import.meta.dirname, '..', 'public', securityPdfPath.slice(1));
    const pdf = await PDFDocument.load(await readFile(file));
    expect(pdf.getSubject(), 'Run `pnpm build && pnpm security:pdf` in apps/web').toBe(
      `content:${securityContentHash()}`,
    );
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });
});
