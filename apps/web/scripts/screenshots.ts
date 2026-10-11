/**
 * Full-page screenshots of every route at 375 / 768 / 1440 in light and dark.
 *   node scripts/screenshots.ts [--only /,/pricing/] [--out dir]
 * Needs a built site (pnpm build) and Chromium (CHROMIUM_PATH or playwright-core install).
 * Fails on horizontal overflow, which is the most common responsive bug.
 */
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';
import { routes } from './routes.ts';
import { serveStatic } from './serve.ts';

const { values } = parseArgs({ options: { only: { type: 'string' }, out: { type: 'string' } } });
const outDir = resolve(
  values.out ?? resolve(import.meta.dirname, '../../../docs/screenshots/phase-1'),
);
const only = values.only?.split(',');
const pages = only ? routes.filter((r) => only.includes(r)) : routes;
const widths = [375, 768, 1440];
const themes = ['light', 'dark'] as const;

await mkdir(outDir, { recursive: true });
const port = 4401;
const server = await serveStatic(port);
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const problems: string[] = [];

try {
  for (const route of pages) {
    for (const theme of themes) {
      const context = await browser.newContext({ colorScheme: theme, reducedMotion: 'reduce' });
      await context.addInitScript((t) => {
        localStorage.setItem('br-theme', t);
      }, theme);
      for (const width of widths) {
        const page = await context.newPage();
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(150);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        if (overflow > 0)
          problems.push(`${route} ${theme} @${width}: ${overflow}px horizontal overflow`);
        const name = route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/\//g, '-');
        await page.screenshot({
          path: `${outDir}/${name}-${theme}-${width}.jpg`,
          fullPage: true,
          type: 'jpeg',
          quality: 82,
        });
        await page.close();
      }
      await context.close();
    }
    console.log(`captured ${route}`);
  }
} finally {
  await browser.close();
  server.close();
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
}
