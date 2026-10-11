'use client';

import { cx } from '@binderready/design';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { docsNav } from '@/lib/docs-nav';

export function DocsSidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Docs" className="no-print">
      <p className="eyebrow mb-3 hidden lg:block">Docs</p>
      <ul className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:mx-0 lg:flex-col lg:overflow-visible">
        {docsNav.map((item) => {
          const active = pathname === item.href || pathname === item.href.replace(/\/$/, '');
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'block rounded-control px-3 py-2 text-sm transition-colors duration-150',
                  active ? 'bg-fg/8 text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
