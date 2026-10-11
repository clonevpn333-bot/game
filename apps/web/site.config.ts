/**
 * Every business value the website uses lives here: name, prices, checkout and
 * download URLs, support email, company details.
 *
 * Values Corey has to supply come from environment variables (see .env.example).
 * In a normal build a missing value renders as a visible "not configured" marker.
 * A release build (BINDERREADY_RELEASE=1) refuses to build with anything missing,
 * so a site with dead buttons or blank legal names can never ship.
 */

/** Trademark check pending: renaming the product is this one line. */
export const PRODUCT_NAME = 'BinderReady';

function env(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** `owner/name` of the GitHub repository whose releases carry the installers. */
const downloadRepo = env(process.env.DOWNLOAD_REPO);

/** Installer file names after the product name; equal to the desktop release-assets.ts. */
export const RELEASE_ASSET_SUFFIXES = {
  windows: 'windows-x64-setup.exe',
  macAppleSilicon: 'macos-apple-silicon.dmg',
  macIntel: 'macos-intel.dmg',
} as const;

/** A version-free installer file on the latest release, e.g. `BinderReady-macos-intel.dmg`. */
export function releaseAsset(suffix: string): string | null {
  return downloadRepo
    ? `https://github.com/${downloadRepo}/releases/latest/download/${PRODUCT_NAME}-${suffix}`
    : null;
}

export const site = {
  productName: PRODUCT_NAME,
  /** File-name-safe form of the product name, e.g. for the security PDF. */
  slug: PRODUCT_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  tagline: 'Client docs in, binder ready.',
  description:
    'Drop in a client’s messy pile of tax documents. Get one bookmarked, perfectly ordered PDF binder in seconds. Everything runs on your computer.',

  /** Canonical origin, no trailing slash. Used for metadata, sitemap and Open Graph. */
  url: (env(process.env.SITE_URL) ?? 'http://localhost:3000').replace(/\/$/, ''),
  supportEmail: env(process.env.SUPPORT_EMAIL),
  company: {
    legalName: env(process.env.COMPANY_LEGAL_NAME),
    /** US state whose law governs the Terms and EULA, e.g. "Texas". */
    governingState: env(process.env.COMPANY_GOVERNING_STATE),
    /** Postal address for legal notices. */
    address: env(process.env.COMPANY_ADDRESS),
  },

  pricing: {
    currency: 'USD',
    trialBinders: 3,
    solo: { price: 149, activations: 2 },
    firm: { price: 299, activations: 3 },
    refundDays: 14,
    majorVersion: 1,
  },

  /** Lemon Squeezy hosted checkout URLs (Products → Share → Checkout link), one per variant. */
  checkout: {
    solo: env(process.env.LEMON_SQUEEZY_SOLO_CHECKOUT_URL),
    firm: env(process.env.LEMON_SQUEEZY_FIRM_CHECKOUT_URL),
  },

  /** Founders discount. The 100-license limit is enforced by Lemon Squeezy, not by this site. */
  founders: {
    active: process.env.FOUNDERS_ACTIVE === '1',
    code: env(process.env.FOUNDERS_CODE) ?? 'FOUNDERS',
    price: 99,
    limit: 100,
  },

  /**
   * Installers from the newest published GitHub release. The release workflow attaches
   * version-free copies (apps/desktop/scripts/release-assets.ts), so these links never
   * go stale and the site needs no rebuild per release.
   */
  downloads: {
    repo: downloadRepo,
    releases: downloadRepo ? `https://github.com/${downloadRepo}/releases` : null,
    windows: releaseAsset(RELEASE_ASSET_SUFFIXES.windows),
    macAppleSilicon: releaseAsset(RELEASE_ASSET_SUFFIXES.macAppleSilicon),
    macIntel: releaseAsset(RELEASE_ASSET_SUFFIXES.macIntel),
  },

  /** The only two hosts the desktop app may contact; shown on the Security page. */
  network: {
    licenseHost: 'api.lemonsqueezy.com',
    /** Updates come from this repository's GitHub releases (apps/desktop net.rs allows it). */
    updateHost: 'github.com',
  },

  systemRequirements: {
    windows: 'Windows 10 or 11, 64-bit (x64)',
    mac: 'macOS 11 Big Sur or later, Apple silicon or Intel',
    memory: '8 GB RAM recommended',
    disk: '500 MB free disk space, plus room for your binders',
  },
} as const;

export type Site = typeof site;

/** Every env-supplied value, for the release check and the "not configured" markers. */
export const requiredForRelease = {
  SITE_URL: process.env.SITE_URL ? site.url : null,
  SUPPORT_EMAIL: site.supportEmail,
  COMPANY_LEGAL_NAME: site.company.legalName,
  COMPANY_GOVERNING_STATE: site.company.governingState,
  COMPANY_ADDRESS: site.company.address,
  LEMON_SQUEEZY_SOLO_CHECKOUT_URL: site.checkout.solo,
  LEMON_SQUEEZY_FIRM_CHECKOUT_URL: site.checkout.firm,
  DOWNLOAD_REPO: site.downloads.repo,
} as const;

export function missingReleaseValues(): string[] {
  return Object.entries(requiredForRelease)
    .filter(([, value]) => value === null)
    .map(([key]) => key);
}
