import { site } from '@/site.config';

/** schema.org SoftwareApplication with one Offer per paid plan plus the free trial. */
export function softwareApplicationJsonLd() {
  const offer = (name: string, price: number) => ({
    '@type': 'Offer',
    name,
    price: price.toFixed(2),
    priceCurrency: site.pricing.currency,
    url: `${site.url}/pricing/`,
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.productName,
    description: site.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Windows 10, Windows 11, macOS',
    url: site.url,
    offers: [
      offer('Trial', 0),
      offer('Solo', site.pricing.solo.price),
      offer('Firm', site.pricing.firm.price),
    ],
  };
}

/** Serializes for a <script type="application/ld+json">, escaping "<" per the Next.js JSON-LD guide. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
