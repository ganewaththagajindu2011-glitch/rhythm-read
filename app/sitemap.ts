import type { MetadataRoute } from 'next';
import { categorySlug, getCatalog, listCategories } from '@/lib/catalog';
import { getSiteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const staticRoutes = ['/', '/discover', '/contact', '/privacy', '/terms', '/refunds'].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === '/' ? ('daily' as const) : ('weekly' as const),
    priority: path === '/' ? 1 : 0.7,
  }));

  try {
    const [books, categories] = await Promise.all([getCatalog(), listCategories()]);
    return [
      ...staticRoutes,
      ...categories.map((category) => ({
        url: `${base}/category/${categorySlug(category)}`,
        changeFrequency: 'weekly' as const,
        priority: 0.75,
      })),
      ...books.map((book) => ({
        url: `${base}/book/${book.slug}`,
        changeFrequency: 'weekly' as const,
        priority: book.featured ? 0.95 : 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
