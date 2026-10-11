import { expect, test, type Page } from '@playwright/test';
import { routes } from '../scripts/routes';
import { e2eEnv } from './e2e.env';

/** Replaces lemon.js with a recorder so tests see exactly what the page asks for. */
async function stubLemonJs(page: Page) {
  await page.route('https://app.lemonsqueezy.com/js/lemon.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.__lemon = { opened: [], setup: 0 };
        window.createLemonSqueezy = function () {
          window.LemonSqueezy = {
            Setup: function () { window.__lemon.setup++; },
            Url: { Open: function (u) { window.__lemon.opened.push(u); }, Close: function () {} },
          };
        };`,
    }),
  );
}

test.describe('every page', () => {
  for (const route of routes) {
    test(`${route} renders with one h1, a title, a description and a canonical URL`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await page.title()).toMatch(/BinderReady/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{40,}/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${e2eEnv.SITE_URL}${route}`,
      );
      await expect(page.getByText(/ not set$/)).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
});

test('home: the hero sorts the pile into a binder, and Replay starts over', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('figure').first();
  await expect(hero.getByText('18 files dropped')).toBeVisible();
  await expect(hero.getByText('IMG_5678.HEIC')).toBeVisible();
  await expect(hero.getByText('23 documents recognized · 3 need review')).toBeVisible({
    timeout: 5000,
  });
  await expect(hero.getByText('2026 W-2 – Northwind Logistics – Sample')).toBeVisible();
  await expect(
    hero.locator('figcaption').getByText('1 binder · 23 documents · 41 pages'),
  ).toBeVisible({ timeout: 6000 });
  // Record every phase the stage passes through, so a slow runner can't miss the short
  // "scattered" step between Replay and the next sort.
  await hero.locator('[data-phase]').evaluate((stage) => {
    const seen: string[] = [];
    (window as unknown as { phases: string[] }).phases = seen;
    new MutationObserver(() => {
      const phase = stage.getAttribute('data-phase') ?? '';
      if (seen.at(-1) !== phase) seen.push(phase);
    }).observe(stage, { attributes: true, attributeFilter: ['data-phase'] });
  });
  await hero.getByRole('button', { name: 'Replay' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { phases: string[] }).phases), {
      timeout: 10000,
    })
    .toEqual(['scattered', 'sorted', 'binder']);
});

test('home: the Sort button skips the wait', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('figure').first();
  // A click before hydration does nothing on a static page: retry until it takes.
  await expect(async () => {
    await hero.getByRole('button', { name: 'Sort' }).click();
    await expect(hero.getByText('23 documents recognized · 3 need review')).toBeVisible({
      timeout: 1000,
    });
  }).toPass({ timeout: 15000 });
});

test('home: reduced motion shows the finished binder', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('figure').first().locator('figcaption')).toContainText(
    '1 binder · 23 documents · 41 pages',
  );
  await context.close();
});

test('theme: choosing Light persists across reloads; the default is dark', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('footer label[title="Light"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('footer input[value="light"]')).toBeChecked();
});

test('FAQ: a question opens with the keyboard', async ({ page }) => {
  await page.goto('/');
  const item = page.locator('#faq-advice');
  await item.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(item).toHaveAttribute('open', '');
  await expect(item.getByText(/does not prepare returns/)).toBeVisible();
});

test('ROI calculator: defaults match the brief and respond to input', async ({ page }) => {
  await page.goto('/');
  const roi = page.locator('section', {
    has: page.getByRole('heading', { name: 'Pay once. Keep the difference.' }),
  });
  await expect(roi).toContainText(
    'This season: $1,500 vs. $149 once. BinderReady pays for itself after 30 returns.',
  );
  // The page is static HTML until React hydrates; input before that is reset. Retry
  // until the calculator answers (it hydrates within a second or two on a slow runner).
  await expect(async () => {
    await roi.getByLabel('Returns per season').fill('1000');
    await expect(roi).toContainText('This season: $5,000 vs. $149 once.', { timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await roi.getByLabel('Per-return cost of an organizing service').fill('10');
  await expect(roi).toContainText('pays for itself after 15 returns.');
});

test('missing-docs demo: dismiss a row, undo it, and copy the list', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const demo = page.locator('main');
  await demo.getByRole('button', { name: /Not expected this year: 1099-SA/ }).click();
  await expect(demo.getByText('2 of 3')).toBeVisible();
  await demo.getByRole('button', { name: 'Copy missing-docs list' }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('- 1099-DIV from Sample Brokerage');
  expect(text).not.toContain('1099-SA');
  await demo.getByRole('button', { name: /Undo: 1099-SA/ }).click();
  await expect(demo.getByText('3 of 3')).toBeVisible();
});

test('checkout: Buy opens the Lemon Squeezy overlay with the Solo variant', async ({ page }) => {
  await stubLemonJs(page);
  await page.goto('/pricing/');
  await page.getByRole('button', { name: 'Buy Solo' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __lemon?: { opened: string[] } }).__lemon?.opened,
      ),
    )
    .toEqual([`${e2eEnv.LEMON_SQUEEZY_SOLO_CHECKOUT_URL}?embed=1`]);
  expect(
    await page.evaluate(() => (window as unknown as { __lemon: { setup: number } }).__lemon.setup),
  ).toBe(1);
});

test('checkout: Firm opens the Firm variant', async ({ page }) => {
  await stubLemonJs(page);
  await page.goto('/pricing/');
  await page.getByRole('button', { name: 'Buy Firm' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __lemon?: { opened: string[] } }).__lemon?.opened,
      ),
    )
    .toEqual([`${e2eEnv.LEMON_SQUEEZY_FIRM_CHECKOUT_URL}?embed=1`]);
});

test('checkout: if lemon.js is blocked, the hosted checkout page opens instead', async ({
  page,
}) => {
  await page.route('https://app.lemonsqueezy.com/js/lemon.js', (route) => route.abort());
  await page.route('https://binderready-test.lemonsqueezy.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Hosted checkout</title>' }),
  );
  await page.goto('/');
  await page.locator('header').getByRole('button', { name: 'Buy', exact: true }).first().click();
  await expect(page).toHaveURL(e2eEnv.LEMON_SQUEEZY_SOLO_CHECKOUT_URL);
});

test('pricing: the Founders banner shows when active', async ({ page }) => {
  await page.goto('/pricing/');
  await expect(
    page.getByText(
      /Founders pricing: Solo is \$99 with code\s+FOUNDERS for the first 100 licenses\./,
    ),
  ).toBeVisible();
});

test('download: Windows is primary by default, macOS on a Mac', async ({ browser }) => {
  const win = await browser.newPage();
  await win.goto('/download/');
  const winLinks = win.locator('main a', { hasText: /^Download for/ });
  await expect(winLinks.first()).toHaveText('Download for Windows');
  await expect(winLinks.first()).toHaveAttribute(
    'href',
    `https://github.com/${e2eEnv.DOWNLOAD_REPO}/releases/latest/download/BinderReady-windows-x64-setup.exe`,
  );
  await win.close();

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  });
  const mac = await context.newPage();
  await mac.goto('/download/');
  await expect(mac.locator('main a', { hasText: /^Download for/ }).first()).toHaveText(
    'Download for macOS',
  );
  await expect(mac.locator('main a', { hasText: /^Download for/ }).first()).toHaveAttribute(
    'href',
    /\/releases\/latest\/download\/BinderReady-macos-apple-silicon\.dmg$/,
  );
  await expect(mac.getByRole('link', { name: /Intel version/ })).toHaveAttribute(
    'href',
    /\/releases\/latest\/download\/BinderReady-macos-intel\.dmg$/,
  );
  await context.close();
});

test('docs: shortcut tables render as tables', async ({ page }) => {
  await page.goto('/docs/review-shortcuts/');
  await expect(page.locator('main table')).toHaveCount(3);
  await expect(page.getByRole('cell', { name: 'Accept the selected document' })).toBeVisible();
});

test('keyboard: the first Tab lands on the skip link, which moves focus to main', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
});

test('security: the PDF downloads', async ({ request }) => {
  const res = await request.get('/binderready-security-overview.pdf');
  expect(res.status()).toBe(200);
  expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
});

test('seo: JSON-LD, sitemap, robots and the Open Graph image', async ({ page, request }) => {
  await page.goto('/');
  const ld = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
  ) as {
    '@type': string;
    offers: { price: string }[];
  };
  expect(ld['@type']).toBe('SoftwareApplication');
  expect(ld.offers.map((o) => o.price)).toEqual(['0.00', '149.00', '299.00']);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain(`<loc>${e2eEnv.SITE_URL}/security/</loc>`);
  expect(sitemap).not.toContain('/thanks/');
  expect(await (await request.get('/robots.txt')).text()).toContain(
    `Sitemap: ${e2eEnv.SITE_URL}/sitemap.xml`,
  );
  const og = await request.get('/og.png');
  expect(og.headers()['content-type']).toBe('image/png');
});

test('mobile: the menu opens, lists the pages and closes with Escape', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('link', { name: 'Pricing' }).last()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  await page.close();
});
