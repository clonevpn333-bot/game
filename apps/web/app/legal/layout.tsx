import Link from 'next/link';
import type { ReactNode } from 'react';
import { Rails } from '@/components/rails';

const legalNav = [
  { href: '/legal/terms/', label: 'Terms of Sale' },
  { href: '/legal/eula/', label: 'License agreement' },
  { href: '/legal/privacy/', label: 'Privacy' },
  { href: '/legal/refunds/', label: 'Refunds' },
];

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <Rails>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 px-5 pb-24 pt-10 md:px-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 lg:pt-16">
        <nav aria-label="Legal" className="no-print lg:sticky lg:top-24 lg:self-start">
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-control px-3 py-2 text-sm text-fg-muted hover:text-fg"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="min-w-0 max-w-[72ch]">{children}</article>
      </div>
    </Rails>
  );
}
