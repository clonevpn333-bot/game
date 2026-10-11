import { buttonStyles } from '@binderready/design';
import Link from 'next/link';
import { site } from '@/site.config';
import { BuyButton } from '../buy-button';
import { Band } from '../rails';

export function FinalCta() {
  return (
    <Band labelledBy="cta-title">
      <div className="reveal flex flex-col items-start gap-8 px-5 py-20 md:px-10 md:py-28 lg:flex-row lg:items-end lg:justify-between">
        <h2 id="cta-title" className="max-w-[16ch] text-h2 text-balance md:text-[3.25rem]">
          Get your evenings back this tax season.
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/download/" className={buttonStyles()}>
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
      </div>
    </Band>
  );
}
