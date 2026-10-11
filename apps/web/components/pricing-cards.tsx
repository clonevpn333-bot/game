import { Badge, buttonStyles, cx } from '@binderready/design';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { plans } from '@/lib/content';
import { site } from '@/site.config';
import { BuyButton } from './buy-button';

export function FoundersBanner() {
  if (!site.founders.active) return null;
  return (
    <p className="rounded-[10px] border border-border-strong bg-surface px-4 py-3 text-sm text-fg-muted">
      Founders pricing: Solo is <span className="text-fg">${site.founders.price}</span> with code{' '}
      <code className="rounded-[4px] border border-border-strong px-1.5 py-0.5 font-mono text-[13px] text-fg">
        {site.founders.code}
      </code>{' '}
      for the first {site.founders.limit} licenses.
    </p>
  );
}

export function PricingCards() {
  return (
    <div className="grid gap-px overflow-hidden rounded-[14px] border border-border bg-border lg:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={cx(
            'relative flex flex-col bg-bg p-6 md:p-8',
            plan.highlight && 'bg-surface shadow-[inset_0_0_0_1px_var(--fg)] md:z-10',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-semibold tracking-[-0.015em]">{plan.name}</h3>
            {plan.highlight ? <Badge>Most popular</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-fg-muted">{plan.summary}</p>
          <p className="mt-8 flex items-baseline gap-2">
            <span className="tabular text-5xl font-semibold tracking-[-0.04em]">{plan.price}</span>
            <span className="font-mono text-sm text-fg-muted">{plan.cadence}</span>
          </p>
          <ul className="mt-8 flex-1 space-y-3 text-[15px]">
            {plan.features.map((feature) => (
              <li key={feature} className="flex gap-2.5">
                <Check
                  className="mt-1 size-4 shrink-0 text-fg-muted"
                  strokeWidth={1.5}
                  aria-hidden
                />
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            {plan.id === 'trial' ? (
              <Link
                href="/download/"
                className={buttonStyles({ variant: 'secondary', className: 'w-full' })}
              >
                Download free trial
              </Link>
            ) : (
              <BuyButton
                checkoutUrl={plan.id === 'solo' ? site.checkout.solo : site.checkout.firm}
                envName={
                  plan.id === 'solo'
                    ? 'LEMON_SQUEEZY_SOLO_CHECKOUT_URL'
                    : 'LEMON_SQUEEZY_FIRM_CHECKOUT_URL'
                }
                variant={plan.highlight ? 'primary' : 'secondary'}
                className="w-full"
              >
                Buy {plan.name}
              </BuyButton>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PricingFootnote() {
  return (
    <p className="text-center text-sm text-fg-muted">
      {site.pricing.refundDays}-day refund, no questions asked. Not a subscription. Ever.
    </p>
  );
}
