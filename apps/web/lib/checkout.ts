'use client';

/**
 * Lemon Squeezy overlay checkout via Lemon.js, loaded only when a visitor shows
 * intent to buy. API per https://docs.lemonsqueezy.com/help/lemonjs/methods and
 * https://docs.lemonsqueezy.com/help/lemonjs/handling-events:
 *   window.createLemonSqueezy()      initializes after a late script load
 *   LemonSqueezy.Setup({ eventHandler })
 *   LemonSqueezy.Url.Open(url)       opens the checkout overlay
 *   event.event === 'Checkout.Success' after payment
 * If the script can't load (offline, blocked), the hosted checkout page opens instead.
 */

interface LemonSqueezyEvent {
  event: string;
}

interface LemonSqueezyGlobal {
  Setup: (options: { eventHandler: (event: LemonSqueezyEvent) => void }) => void;
  Url: { Open: (url: string) => void; Close: () => void };
}

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: LemonSqueezyGlobal;
  }
}

export const LEMON_JS_URL = 'https://app.lemonsqueezy.com/js/lemon.js';
const LOAD_TIMEOUT_MS = 6000;

let loading: Promise<LemonSqueezyGlobal | null> | null = null;

export function loadLemonSqueezy(): Promise<LemonSqueezyGlobal | null> {
  loading ??= new Promise<LemonSqueezyGlobal | null>((resolve) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      resolve(null);
    }, LOAD_TIMEOUT_MS);
    script.src = LEMON_JS_URL;
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timer);
      window.createLemonSqueezy?.();
      const ls = window.LemonSqueezy ?? null;
      ls?.Setup({
        eventHandler: (event) => {
          if (event.event === 'Checkout.Success') window.location.assign('/thanks/');
        },
      });
      resolve(ls);
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    document.head.appendChild(script);
  }).then((ls) => {
    if (!ls) loading = null; // allow a retry on the next click
    return ls;
  });
  return loading;
}

/** The overlay expects the embed flag on hosted checkout links. */
export function overlayUrl(checkoutUrl: string): string {
  const url = new URL(checkoutUrl);
  url.searchParams.set('embed', '1');
  return url.toString();
}

export async function openCheckout(checkoutUrl: string): Promise<'overlay' | 'redirect'> {
  const ls = await loadLemonSqueezy();
  if (ls) {
    ls.Url.Open(overlayUrl(checkoutUrl));
    return 'overlay';
  }
  window.location.assign(checkoutUrl);
  return 'redirect';
}
