import type { MetadataRoute } from 'next';
import { getCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const staticRoutes = ['/', '/discover', '/login', '/library', '/contact', '/privacy', '/terms', '/refunds'].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.7,
  }));

  try {
    const books = await getCatalog();
    return [
      ...staticRoutes,
      ...books.map((book) => ({
        url: `${base}/book/${book.slug}`,
        changeFrequency: 'weekly' as const,
        priority: book.featured ? 0.8 : 0.6,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
