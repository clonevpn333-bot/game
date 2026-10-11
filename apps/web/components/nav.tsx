import { buttonStyles } from '@binderready/design';
import Link from 'next/link';
import { primaryNav } from '@/lib/nav';
import { site } from '@/site.config';
import { BuyButton } from './buy-button';
import { MobileMenu } from './mobile-menu';
import { ThemeToggle } from './theme-toggle';
import { Wordmark } from './wordmark';

function Actions() {
  return (
    <>
      <Link href="/download/" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
        Download
      </Link>
      <BuyButton
        checkoutUrl={site.checkout.solo}
        envName="LEMON_SQUEEZY_SOLO_CHECKOUT_URL"
        size="sm"
      >
        Buy
      </BuyButton>
    </>
  );
}

export function Nav() {
  return (
    <header className="nav-scroll-border no-print sticky top-0 z-40 border-b border-border bg-bg/75 backdrop-blur-md backdrop-saturate-150">
      <div className="px-4 md:px-8">
        <div className="relative mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 md:px-6">
          <Wordmark />
          <nav aria-label="Main" className="absolute left-1/2 hidden -translate-x-1/2 md:block">
            <ul className="flex items-center gap-1">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded-control px-3 py-2 text-sm text-fg-muted transition-colors duration-150 hover:text-fg"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle className="mr-2 hidden lg:flex" />
            <Actions />
          </div>
          <MobileMenu actions={<Actions />} />
        </div>
      </div>
    </header>
  );
}
