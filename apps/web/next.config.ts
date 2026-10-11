import createMDX from '@next/mdx';
import type { NextConfig } from 'next';
import { missingReleaseValues } from './site.config';

if (process.env.BINDERREADY_RELEASE === '1') {
  const missing = missingReleaseValues();
  if (missing.length > 0) {
    throw new Error(
      `Release build blocked. Set these in the environment first: ${missing.join(', ')} (see apps/web/.env.example).`,
    );
  }
}

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  pageExtensions: ['ts', 'tsx', 'mdx'],
  images: { unoptimized: true },
  transpilePackages: ['@binderready/design', '@binderready/engine'],
  poweredByHeader: false,
  reactStrictMode: true,
};

// GFM for the docs' tables. Plugins are named by string so Turbopack can load them.
const withMDX = createMDX({
  extension: /\.mdx$/,
  options: { remarkPlugins: [['remark-gfm', {}]] },
});

export default withMDX(nextConfig);
