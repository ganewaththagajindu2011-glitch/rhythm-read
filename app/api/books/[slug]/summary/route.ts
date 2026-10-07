import { findBook } from '@/lib/catalog';
import { noStoreJson, rateLimit, rateLimitedResponse, validSlug } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validSlug(slug)) return noStoreJson({ error: 'Book not found.' }, { status: 404 });
  const limited = rateLimit(request, `book-summary:${slug}`, 120, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);

  const book = await findBook(slug);
  if (!book) return noStoreJson({ error: 'Book not found.' }, { status: 404 });
  return noStoreJson({ book: { title: book.title, price: book.price, currency: 'USD', free: book.free, slug: book.slug } });
}
