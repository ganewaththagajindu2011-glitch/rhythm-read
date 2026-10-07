import { getCatalog } from '@/lib/catalog';
import { noStoreJson, rateLimit, rateLimitedResponse } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = rateLimit(request, 'catalog-books', 120, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);
  try {
    return noStoreJson({ books: await getCatalog() });
  } catch {
    return noStoreJson({ books: [] }, { status: 503 });
  }
}

export async function POST(request: Request) {
  return noStoreJson({ error: 'Book uploads are admin-only. Use /api/admin/books.' }, { status: 403 });
}
