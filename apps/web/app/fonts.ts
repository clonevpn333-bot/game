import localFont from 'next/font/local';

/*
 * Geist, Latin subset (Fontsource packaging of the same OFL files the `geist`
 * package ships). The full variable files are 68–70 KB each; these are 29 KB
 * and 23 KB, which is what keeps mobile LCP under 1.8 s. Characters outside
 * Latin (arrows, ⌘) fall back to the system font in the stack.
 * Only the sans face is preloaded: it renders the LCP text; mono is for labels.
 */
export const geistSans = localFont({
  src: '../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Arial',
});

export const geistMono = localFont({
  src: '../node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
});
