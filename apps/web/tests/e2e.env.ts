/**
 * Values the e2e build uses (scripts/e2e.ts sets them before `next build`).
 * The checkout URLs are Lemon Squeezy-shaped but point at a test store name;
 * tests intercept lemon.js and the checkout host, so nothing leaves the machine.
 */
export const e2eEnv = {
  SITE_URL: 'https://binderready.test',
  SUPPORT_EMAIL: 'support@binderready.test',
  COMPANY_LEGAL_NAME: 'Sample Software LLC',
  COMPANY_GOVERNING_STATE: 'Delaware',
  COMPANY_ADDRESS: '123 Sample St, Testville',
  LEMON_SQUEEZY_SOLO_CHECKOUT_URL:
    'https://binderready-test.lemonsqueezy.com/buy/solo-test-variant',
  LEMON_SQUEEZY_FIRM_CHECKOUT_URL:
    'https://binderready-test.lemonsqueezy.com/buy/firm-test-variant',
  FOUNDERS_ACTIVE: '1',
  DOWNLOAD_REPO: 'sample-owner/binderready',
};
