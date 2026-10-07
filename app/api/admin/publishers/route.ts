import { z } from 'zod';
import { listPublishers, updatePublisher, type PublisherStatus } from '@/lib/publisher-store';
import { requireAdmin } from '@/lib/admin-auth';
import { ensureJsonRequest, noStoreJson, rateLimit, rateLimitedResponse, sameOrigin } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const statusSchema = z.object({
  email: z.string().trim().email().max(320),
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED']),
});

export async function GET(request: Request) {
  const limited = rateLimit(request, 'admin-publishers-get', 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);
  if (!(await requireAdmin())) return noStoreJson({ error: 'Forbidden.' }, { status: 403 });

  try {
    return noStoreJson({ publishers: await listPublishers() });
  } catch {
    return noStoreJson({ error: 'Could not load publisher applications.' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const limited = rateLimit(request, 'admin-publishers-write', 20, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);
  const jsonCheck = ensureJsonRequest(request, 16 * 1024);
  if (!jsonCheck.ok) return jsonCheck.response;
  if (!sameOrigin(request)) return noStoreJson({ error: 'Cross-site request blocked.' }, { status: 403 });
  if (!(await requireAdmin())) return noStoreJson({ error: 'Forbidden.' }, { status: 403 });

  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ error: 'Invalid publisher update.' }, { status: 400 });

  try {
    const updated = await updatePublisher(parsed.data.email.toLowerCase(), { status: parsed.data.status as PublisherStatus });
    if (!updated) return noStoreJson({ error: 'Publisher not found.' }, { status: 404 });
    return noStoreJson({ publisher: updated });
  } catch {
    return noStoreJson({ error: 'Publisher could not be updated.' }, { status: 503 });
  }
}
