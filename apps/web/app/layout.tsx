import { themeBootScript } from '@binderready/design';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Footer } from '@/components/footer';
import { Nav } from '@/components/nav';
import { ogImage } from '@/lib/og';
import { themeOptions } from '@/lib/theme-options';
import { geistMono, geistSans } from './fonts';
import { site } from '@/site.config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.productName}: tax documents in, bookmarked binder out`,
    template: `%s · ${site.productName}`,
  },
  description: site.description,
  applicationName: site.productName,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: site.productName,
    title: `${site.productName}: the shoebox, sorted.`,
    description: site.description,
    url: '/',
    images: [ogImage],
  },
  twitter: { card: 'summary_large_image', images: [ogImage.url] },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript(themeOptions) }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg">
        <a
          href="#main"
          className="sr-only z-50 rounded-control bg-fg px-3 py-2 text-sm text-bg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
