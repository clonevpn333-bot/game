import { buttonStyles } from '@binderready/design';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Band } from '@/components/rails';
import { site } from '@/site.config';

export const metadata: Metadata = {
  title: 'Thank you',
  robots: { index: false },
  alternates: { canonical: '/thanks/' },
};

const steps = [
  {
    title: 'Find your license key',
    body: 'Lemon Squeezy emails your receipt and license key within a few minutes. Check spam if it hasn’t arrived.',
  },
  {
    title: `Open ${site.productName}`,
    body: 'If you haven’t installed it yet, download it now. The trial and the full version are the same app.',
  },
  {
    title: 'Activate',
    body: 'Go to Settings → License, paste the key and choose Activate. This needs the internet once; after that the app works offline.',
  },
];

export default function ThanksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Order complete"
        title="Thank you. Check your email for your license key."
        lede="Your purchase is done. Three steps and you’re licensed."
      />
      <Band labelledBy="activate-title">
        <h2 id="activate-title" className="sr-only">
          Activate your license
        </h2>
        <ol className="grid border-border md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="border-border px-5 py-10 md:px-10 [&:not(:first-child)]:border-t md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:border-t-0"
            >
              <span className="tabular font-mono text-sm text-fg-subtle">0{i + 1}</span>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.015em]">{step.title}</h3>
              <p className="mt-2 text-[15px] text-fg-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-3 border-t border-border px-5 py-8 md:px-10">
          <Link href="/download/" className={buttonStyles()}>
            Download {site.productName}
          </Link>
          <Link href="/docs/license-activation/" className={buttonStyles({ variant: 'secondary' })}>
            Activation help
          </Link>
        </div>
      </Band>
    </>
  );
}
