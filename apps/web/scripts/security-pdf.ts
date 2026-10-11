/**
 * Prints the built /security page to public/<slug>-security-overview.pdf.
 * Run after `pnpm build` whenever lib/security-content.ts changes; the unit
 * test fails until you do. The PDF Subject carries a hash of the content.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { chromium } from 'playwright-core';
import { securityContentHash } from '../lib/content-hash.ts';
import { securityPdfPath } from '../lib/security-content.ts';
import { site } from '../site.config.ts';
import { serveStatic } from './serve.ts';

const out = resolve(import.meta.dirname, '..', 'public', securityPdfPath.slice(1));
const port = 4403;
const server = await serveStatic(port);
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
try {
  const context = await browser.newContext({ colorScheme: 'light', reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    localStorage.setItem('br-theme', 'light');
  });
  const page = await context.newPage();
  await page.goto(`http://localhost:${port}/security/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const printed = await page.pdf({
    format: 'Letter',
    printBackground: false,
    margin: { top: '0.6in', bottom: '0.7in', left: '0.6in', right: '0.6in' },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="font-size:8px;width:100%;padding:0 0.6in;display:flex;justify-content:space-between;color:#666"><span>${site.productName} security overview</span><span class="pageNumber"></span></div>`,
  });
  const pdf = await PDFDocument.load(printed);
  pdf.setTitle(`${site.productName} security overview`);
  pdf.setAuthor(site.company.legalName ?? site.productName);
  pdf.setSubject(`content:${securityContentHash()}`);
  pdf.setCreator(site.productName);
  await writeFile(out, await pdf.save());
  console.log(`wrote ${out} (${String((await readFile(out)).length)} bytes)`);
} finally {
  await browser.close();
  server.close();
}
