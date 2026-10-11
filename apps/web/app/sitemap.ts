import type { MetadataRoute } from 'next';
import { routes } from '@/scripts/routes.ts';
import { site } from '@/site.config';

export const dynamic = 'force-static';

const unlisted = new Set(['/thanks/']);

export default function sitemap(): MetadataRoute.Sitemap {
  return routes
    .filter((r) => !unlisted.has(r))
    .map((route) => ({
      url: `${site.url}${route}`,
      changeFrequency: route === '/' || route === '/changelog/' ? 'weekly' : 'monthly',
      priority: route === '/' ? 1 : route.startsWith('/legal/') ? 0.3 : 0.7,
    }));
}
