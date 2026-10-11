import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqList } from '@/components/faq';
import { Roi } from '@/components/home/roi';
import { PageHeader } from '@/components/page-header';
import { FoundersBanner, PricingCards, PricingFootnote } from '@/components/pricing-cards';
import { Band, SectionHeading } from '@/components/rails';
import { faqs, type Faq } from '@/lib/content';
import { site } from '@/site.config';

export const metadata: Metadata = {
  title: 'Pricing',
  description: `${site.productName} is a one-time purchase: $${site.pricing.solo.price} for Solo, $${site.pricing.firm.price} for Firm, with a free trial.`,
  alternates: { canonical: '/pricing/' },
};

const { pricing } = site;

const licenseFaqs: Faq[] = [
  ...faqs.filter((f) => ['subscription', 'updates', 'office'].includes(f.id)),
  {
    id: 'move',
    question: 'How do I move a license to a new computer?',
    answer: [
      'Open Settings → License on the old computer and choose Deactivate this device. The activation becomes free, and you can enter the same key on the new computer.',
      'If the old computer is lost or broken, email support with your license key and we free the activation for you.',
    ],
  },
  {
    id: 'offline',
    question: 'Does the license need the internet?',
    answer: [
      `Only once, to activate. After that ${site.productName} works offline indefinitely. When it is online it rechecks the key at most every 14 days, only to catch refunded keys, and a failed check never locks you out.`,
    ],
  },
  {
    id: 'trial-limit',
    question: 'What happens when the trial ends?',
    answer: [
      `The trial includes every feature for ${pricing.trialBinders} client binders. Binders you already exported stay yours. Enter a license key in Settings → License to keep building binders; nothing needs reinstalling.`,
    ],
  },
  {
    id: 'invoice',
    question: 'Do I get an invoice for my records?',
    answer: [
      'Yes. Lemon Squeezy, our payment provider and merchant of record, emails a receipt with your license key and calculates any sales tax due at checkout.',
    ],
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Pay once. Use it every season."
        lede={`A one-time license, not a subscription. Try every feature free on ${pricing.trialBinders} client binders first.`}
      />
      <Band labelledBy="plans-title">
        <h2 id="plans-title" className="sr-only">
          Plans
        </h2>
        <div className="grid gap-8 px-5 py-14 md:px-10 md:py-20">
          <FoundersBanner />
          <PricingCards />
          <PricingFootnote />
        </div>
      </Band>
      <Roi />
      <Band labelledBy="license-title">
        <div className="grid gap-10 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <SectionHeading id="license-title" eyebrow="Licensing" title="How licenses work." />
          <FaqList items={licenseFaqs} />
        </div>
      </Band>
      <Band labelledBy="refund-title">
        <div className="grid gap-6 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <SectionHeading
            id="refund-title"
            eyebrow="Refunds"
            title={`${pricing.refundDays} days to decide.`}
          />
          <div className="max-w-[60ch] space-y-4 text-[15px] text-fg-muted">
            <p>
              Ask for a refund within {pricing.refundDays} days of purchase and you get the full
              amount back. You don’t need to give a reason.
            </p>
            <p>
              Reply to your receipt email or write to support with your order number. Refunds go
              back to the original payment method, and the license key is deactivated when the
              refund is issued.
            </p>
            <p>
              <Link href="/legal/refunds/" className="text-fg underline underline-offset-4">
                Read the full refund policy
              </Link>
            </p>
          </div>
        </div>
      </Band>
    </>
  );
}
