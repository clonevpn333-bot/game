/**
 * Captures the built showcase at 375 / 768 / 1440px in light and dark.
 * Output: docs/screenshots/phase-0/showcase-<theme>-<width>.png at the repo root.
 *
 * Browser: set CHROMIUM_PATH to a Chromium/Chrome binary, or run
 * `pnpm exec playwright-core install chromium` once.
 */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const showcaseRoot = fileURLToPath(new URL('../showcase', import.meta.url));
const outDir = fileURLToPath(new URL('../../../docs/screenshots/phase-0', import.meta.url));
const widths = [375, 768, 1440] as const;
const themes = ['light', 'dark'] as const;

await mkdir(outDir, { recursive: true });

const server = await preview({ root: showcaseRoot, preview: { port: 4317, strictPort: true } });
const url = server.resolvedUrls?.local[0];
if (!url) throw new Error('Preview server did not report a URL');

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);

try {
  for (const theme of themes) {
    for (const width of widths) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        colorScheme: theme,
        deviceScaleFactor: 1,
      });
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      if (overflow > 0)
        throw new Error(`${theme} @ ${width}px: horizontal overflow of ${overflow}px`);

      const file = `${outDir}/showcase-${theme}-${width}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log(`saved ${file}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) => {
    server.httpServer.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
