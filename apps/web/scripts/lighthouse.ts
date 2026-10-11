/**
 * Lighthouse (mobile, default throttling) on every route of the built site.
 * Writes docs/lighthouse/phase-1.md and fails if any category is below 95 or LCP ≥ 1.8s.
 *   node scripts/lighthouse.ts [--only /,/pricing/]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { routes } from './routes.ts';
import { serveStatic } from './serve.ts';

const { values } = parseArgs({ options: { only: { type: 'string' } } });
const only = values.only?.split(',');
const pages = only ? routes.filter((r) => only.includes(r)) : routes;
const port = 4404;
const server = await serveStatic(port);
const chrome = await chromeLauncher.launch({
  ...(process.env.CHROMIUM_PATH ? { chromePath: process.env.CHROMIUM_PATH } : {}),
  chromeFlags: ['--headless=new', '--no-sandbox'],
});

const categories = ['performance', 'accessibility', 'best-practices', 'seo'] as const;
const rows: string[] = [];
const failures: string[] = [];

try {
  for (const route of pages) {
    // Median of three runs by LCP, as Lighthouse recommends for a stable reading.
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const result = await lighthouse(`http://localhost:${port}${route}`, {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: [...categories],
      });
      if (!result) throw new Error(`No Lighthouse result for ${route}`);
      runs.push(result.lhr);
    }
    runs.sort(
      (a, b) =>
        (a.audits['largest-contentful-paint']?.numericValue ?? 0) -
        (b.audits['largest-contentful-paint']?.numericValue ?? 0),
    );
    const lhr = runs[1];
    if (!lhr) throw new Error(`No median run for ${route}`);
    const scores = categories.map((c) => Math.round((lhr.categories[c]?.score ?? 0) * 100));
    const lcp = lhr.audits['largest-contentful-paint']?.numericValue ?? Number.NaN;
    const cls = lhr.audits['cumulative-layout-shift']?.numericValue ?? Number.NaN;
    rows.push(
      `| \`${route}\` | ${scores.join(' | ')} | ${(lcp / 1000).toFixed(2)} s | ${cls.toFixed(3)} |`,
    );
    scores.forEach((s, i) => {
      if (s < 95) {
        const failing = Object.values(lhr.audits)
          .filter(
            (a) =>
              a.score !== null &&
              a.score < 0.9 &&
              lhr.categories[categories[i] ?? '']?.auditRefs.some(
                (r) => r.id === a.id && r.weight > 0,
              ),
          )
          .map((a) => a.id);
        failures.push(`${route} ${categories[i] ?? ''} ${s}: ${failing.join(', ')}`);
      }
    });
    if (lcp >= 1800) failures.push(`${route} LCP ${(lcp / 1000).toFixed(2)}s`);
    console.log(
      `${route}  ${scores.join(' / ')}  LCP ${(lcp / 1000).toFixed(2)}s  CLS ${cls.toFixed(3)}`,
    );
  }
} finally {
  chrome.kill();
  server.close();
}

const outDir = resolve(import.meta.dirname, '../../../docs/lighthouse');
await mkdir(outDir, { recursive: true });
await writeFile(
  `${outDir}/phase-1.md`,
  [
    '# Lighthouse: website (mobile)',
    '',
    `Run ${new Date().toISOString().slice(0, 10)} against the static export served locally with brotli, Lighthouse mobile defaults (simulated slow 4G, 4× CPU slowdown). Each row is the median of three runs by LCP.`,
    '',
    '| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |',
    '|---|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n'),
);

if (failures.length) {
  console.error(`\nBelow target:\n${failures.join('\n')}`);
  process.exitCode = 1;
}
