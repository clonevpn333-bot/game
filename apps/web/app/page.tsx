import type { Metadata } from 'next';
import { FaqList } from '@/components/faq';
import { Features } from '@/components/home/features';
import { FinalCta } from '@/components/home/final-cta';
import { Hero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';
import { PrivacyPanel } from '@/components/home/privacy-panel';
import { Roi } from '@/components/home/roi';
import { WorksWith } from '@/components/home/works-with';
import { FoundersBanner, PricingCards, PricingFootnote } from '@/components/pricing-cards';
import { Band, SectionHeading } from '@/components/rails';
import { Testimonials } from '@/components/testimonials';
import { faqs } from '@/lib/content';
import { jsonLdScript, softwareApplicationJsonLd } from '@/lib/json-ld';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(softwareApplicationJsonLd()) }}
      />
      <Hero />
      <WorksWith />
      <HowItWorks />
      <Features />
      <PrivacyPanel />
      <Roi />
      <Band id="pricing" labelledBy="pricing-title">
        <div className="grid gap-10 px-5 py-16 md:px-10 md:py-24">
          <SectionHeading
            id="pricing-title"
            eyebrow="05 — Pricing"
            title="One price. Yours to keep."
            className="reveal"
          />
          <FoundersBanner />
          <div className="reveal">
            <PricingCards />
          </div>
          <PricingFootnote />
        </div>
      </Band>
      <Testimonials />
      <Band labelledBy="faq-title">
        <div className="grid gap-10 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-[1fr_2fr] lg:gap-16">
          <SectionHeading id="faq-title" eyebrow="06 — Questions" title="Answers, plainly." />
          <FaqList items={faqs} />
        </div>
      </Band>
      <FinalCta />
    </>
  );
}
