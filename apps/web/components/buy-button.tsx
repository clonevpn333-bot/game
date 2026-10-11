'use client';

import { Button, type ButtonSize, type ButtonVariant } from '@binderready/design';
import { useState, type ReactNode } from 'react';
import { loadLemonSqueezy, openCheckout } from '@/lib/checkout';

export interface BuyButtonProps {
  /** Hosted checkout URL from site.config; null only in non-release builds. */
  checkoutUrl: string | null;
  /** Env var that supplies checkoutUrl, named in the not-configured message. */
  envName: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export function BuyButton({
  checkoutUrl,
  envName,
  variant,
  size,
  className,
  children,
}: BuyButtonProps) {
  const [state, setState] = useState<'idle' | 'opening' | 'unconfigured'>('idle');
  const warm = () => {
    if (checkoutUrl) void loadLemonSqueezy();
  };
  return (
    <span className="relative inline-flex">
      <Button
        variant={variant}
        size={size}
        className={className}
        data-checkout-url={checkoutUrl ?? undefined}
        aria-busy={state === 'opening'}
        onPointerEnter={warm}
        onFocus={warm}
        onClick={() => {
          if (!checkoutUrl) {
            setState('unconfigured');
            return;
          }
          setState('opening');
          void openCheckout(checkoutUrl).finally(() => {
            setState('idle');
          });
        }}
      >
        {children}
      </Button>
      {state === 'unconfigured' ? (
        <span
          role="status"
          className="absolute left-0 top-full z-30 mt-2 w-64 rounded-control border border-border-strong bg-surface p-3 text-left font-mono text-xs text-fg-muted"
        >
          Checkout isn’t configured in this build. Set {envName}.
        </span>
      ) : null}
    </span>
  );
}
