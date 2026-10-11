import Link from 'next/link';
import { site } from '@/site.config';
import { NotConfigured } from './not-configured';
import { ThemeToggle } from './theme-toggle';
import { Wordmark } from './wordmark';

const columns = [
  {
    title: 'Product',
    links: [
      { href: '/#product', label: 'Overview' },
      { href: '/pricing/', label: 'Pricing' },
      { href: '/download/', label: 'Download' },
      { href: '/security/', label: 'Security' },
      { href: '/changelog/', label: 'Changelog' },
    ],
  },
  {
    title: 'Docs',
    links: [
      { href: '/docs/', label: 'Getting started' },
      { href: '/docs/supported-forms/', label: 'Supported forms' },
      { href: '/docs/review-shortcuts/', label: 'Review shortcuts' },
      { href: '/docs/license-activation/', label: 'License activation' },
      { href: '/docs/troubleshooting/', label: 'Troubleshooting' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/legal/terms/', label: 'Terms of Sale' },
      { href: '/legal/eula/', label: 'License agreement' },
      { href: '/legal/privacy/', label: 'Privacy' },
      { href: '/legal/refunds/', label: 'Refunds' },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="no-print border-t border-border">
      <div className="px-4 md:px-8">
        <div className="mx-auto grid max-w-[1200px] gap-12 border-x border-border px-5 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-10">
          <div className="flex flex-col items-start gap-4">
            <Wordmark />
            <p className="max-w-[32ch] text-sm text-fg-muted">{site.tagline}</p>
            <p className="text-sm text-fg-muted">
              Support:{' '}
              {site.supportEmail ? (
                <a
                  href={`mailto:${site.supportEmail}`}
                  className="text-fg underline-offset-4 hover:underline"
                >
                  {site.supportEmail}
                </a>
              ) : (
                <NotConfigured name="SUPPORT_EMAIL" />
              )}
            </p>
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="eyebrow">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-fg-muted transition-colors duration-150 hover:text-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-border px-4 md:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 border-x border-border px-5 py-5 md:px-10">
          <p className="text-xs text-fg-muted">
            © {year} {site.company.legalName ?? <NotConfigured name="COMPANY_LEGAL_NAME" />}.{' '}
            {site.productName} is not tax advice and does not prepare returns.
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
