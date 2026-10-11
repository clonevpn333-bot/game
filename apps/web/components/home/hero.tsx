import { buttonStyles } from '@binderready/design';
import { ArrowDown, Download } from 'lucide-react';
import Link from 'next/link';
import { site } from '@/site.config';
import { Rails } from '../rails';
import { HeroStage } from '../hero/hero-stage';

/**
 * Get in first, learn second: the headline, one sentence and the two ways in (download, or
 * watch it work) fit above the fold; the demo sits right under them and everything else
 * comes after.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-80" aria-hidden />
      <Rails className="relative">
        <div className="flex flex-col items-center px-5 pb-12 pt-16 text-center md:px-10 md:pt-24">
          <p className="eyebrow">For tax preparers · Windows &amp; macOS</p>
          <h1
            id="hero-title"
            className="mt-5 max-w-[22ch] text-[2.5rem] font-bold leading-[1.04] tracking-[-0.035em] text-balance md:text-[3.9rem]"
          >
            Turn a client’s pile of tax documents into{' '}
            <span className="text-steel">one ordered, bookmarked PDF binder.</span>
          </h1>
          <p className="mt-5 max-w-[46ch] text-body text-pretty text-fg-muted md:text-[18px]">
            Drop in W-2s, 1099s, scans and phone photos. {site.productName} recognizes and names
            each one, you check what it flags, and nothing leaves your computer.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/download/" className={buttonStyles({ size: 'lg' })}>
              <Download strokeWidth={1.5} />
              Download free trial
            </Link>
            <a href="#demo" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
              See it work
              <ArrowDown strokeWidth={1.5} />
            </a>
          </div>
          <p className="mt-4 font-mono text-xs text-fg-subtle">
            {site.pricing.trialBinders} binders free · No account · ${site.pricing.solo.price} once
          </p>
        </div>
        <div id="demo" className="relative scroll-mt-20 px-3 pb-16 md:px-10 md:pb-24">
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
