'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { primaryNav } from '@/lib/nav';
import { ThemeToggle } from './theme-toggle';

/** Phone navigation: a disclosure under the bar. Closes on route change and Escape. */
export function MobileMenu({ actions }: { actions: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const pathname = usePathname();
  const panelId = useId();

  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((o) => !o);
        }}
        className="grid size-9 place-items-center rounded-control border border-border-strong text-fg [&_svg]:size-4"
      >
        {open ? <X strokeWidth={1.5} /> : <Menu strokeWidth={1.5} />}
        <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-border bg-bg px-4 pb-6 pt-2"
      >
        <nav aria-label="Main">
          <ul className="divide-y divide-border">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex h-12 items-center text-[15px]">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">{actions}</div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
