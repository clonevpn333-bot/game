import { site } from '../site.config.ts';

const P = site.productName;

export const securityLastUpdated = '2026-10-11';

export interface SecuritySection {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: { term: string; detail: string }[];
}

/**
 * The security overview. Rendered at /security and printed to the downloadable PDF
 * (scripts/security-pdf.ts). Every claim here must match the desktop app; Phase 7
 * adds an automated test for the network allowlist this page describes.
 */
export const securitySections: SecuritySection[] = [
  {
    id: 'summary',
    title: 'Summary',
    paragraphs: [
      `${P} is a desktop app that organizes tax documents into PDF binders. It reads, recognizes and assembles documents on the computer it is installed on. Client files are never uploaded, there is no account, and there is no cloud processing.`,
      'The app can make two kinds of network request, both described below. Its Content Security Policy and network allowlist block every other destination.',
    ],
  },
  {
    id: 'local',
    title: 'What runs on your computer',
    items: [
      {
        term: 'Reading files',
        detail:
          'PDF, JPG, PNG, HEIC and TIFF files are opened from the folders you choose. Phone photos are decoded and turned upright locally.',
      },
      {
        term: 'Text recognition (OCR)',
        detail:
          'Scans and photos are read by an OCR engine on your computer: the bundled Tesseract engine, or the text recognition built into Windows or macOS. None of these send images anywhere.',
      },
      {
        term: 'Form recognition and naming',
        detail:
          'Matching documents to form types, splitting scans and naming files all happen in the app.',
      },
      {
        term: 'Binder assembly',
        detail: 'The finished PDF is written to the folder you choose. The app keeps no copy.',
      },
    ],
  },
  {
    id: 'stored',
    title: 'What the app stores',
    paragraphs: [
      `${P} keeps a small database in its app data folder. It holds your settings, your client list (display name and tax year), and, after each export, a list of the form types and issuer names in that binder so it can tell you next year what is missing.`,
      'It does not store document images, recognized text, Social Security numbers, taxpayer identification numbers, account numbers or dollar amounts. Your license activation is kept in the operating system’s credential store (Windows Credential Manager or the macOS Keychain).',
      'Settings → Data shows the folder location and has a Delete all local history action.',
    ],
  },
  {
    id: 'network',
    title: 'The only two network requests',
    items: [
      {
        term: `License activation · ${site.network.licenseHost}`,
        detail:
          'Sends your license key and a device name when you activate or deactivate. When online, the app rechecks the key at most every 14 days to catch refunded or disabled keys. A failed check is never treated as invalid, so the app keeps working offline.',
      },
      {
        term: `Update check · ${site.network.updateHost}`,
        detail:
          'Downloads a small file listing the latest version and, if you choose to install it, the signed update. Turn it off in Settings → Updates.',
      },
    ],
  },
  {
    id: 'enforcement',
    title: 'How the limit is enforced',
    paragraphs: [
      'The app’s user interface runs under a Content Security Policy that names only those two hosts, and the app’s native network layer has the same allowlist. An automated test in the build fails if either list contains anything else.',
      'There is no analytics, telemetry or crash-reporting code in the app, and its fonts are bundled rather than downloaded.',
    ],
  },
  {
    id: 'diagnostics',
    title: 'Diagnostic reports',
    paragraphs: [
      'If you need help, Settings → Export diagnostic report creates a zip file on your computer with the app version, operating system, timings and error codes. It contains no document content or client names. Nothing is sent automatically; you decide whether to email it.',
    ],
  },
  {
    id: 'yours',
    title: 'What stays your responsibility',
    paragraphs: [
      `${P} helps you keep client files off third-party servers. It does not protect the computer it runs on. Keep the operating system updated, use full-disk encryption (BitLocker or FileVault), lock the screen when you step away, and back up the folders where you save binders.`,
      'You can attach this page to your firm’s written information security plan to describe how this tool handles client documents.',
    ],
  },
];

/** Plain-text form of the content, used to detect a stale PDF. */
export function securityContentText(): string {
  return JSON.stringify({ securityLastUpdated, securitySections });
}

export const securityPdfPath = `/${site.slug}-security-overview.pdf`;
