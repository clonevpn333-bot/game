import { buttonStyles } from '@binderready/design';
import { Download } from 'lucide-react';
import Link from 'next/link';
import { site } from '@/site.config';
import { BuyButton } from '../buy-button';
import { Rails } from '../rails';
import { HeroStage } from '../hero/hero-stage';

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-80" aria-hidden />
      <Rails className="relative">
        <div className="grid gap-10 px-5 pb-14 pt-16 md:px-10 md:pt-24 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:gap-16 lg:pb-20">
          <div>
            <p className="eyebrow">Local-first tax document organizer</p>
            <h1 id="hero-title" className="mt-6 text-display">
              The shoebox, <span className="text-steel">sorted.</span>
            </h1>
          </div>
          <div className="lg:pb-2">
            <p className="max-w-[46ch] text-body text-pretty text-fg-muted md:text-[17px]">
              Drop in a client’s messy pile of tax documents. Get one bookmarked, perfectly ordered
              PDF binder in seconds. Everything runs on your computer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/download/" className={buttonStyles()}>
                <Download strokeWidth={1.5} />
                Download free trial
              </Link>
              <BuyButton
                checkoutUrl={site.checkout.solo}
                envName="LEMON_SQUEEZY_SOLO_CHECKOUT_URL"
                variant="secondary"
              >
                Buy for ${site.pricing.solo.price}, once
              </BuyButton>
            </div>
            <p className="mt-5 font-mono text-xs text-fg-subtle">
              Windows &amp; macOS · Works offline · No subscription
            </p>
          </div>
        </div>
        <div className="relative px-3 pb-16 md:px-10 md:pb-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-10 mx-auto h-[70%] max-w-4xl rounded-full bg-[radial-gradient(closest-side,var(--hero-glow),transparent)]"
          />
          <div className="settle relative">
            <HeroStage client="Jane Sample" />
          </div>
        </div>
      </Rails>
    </section>
  );
}
