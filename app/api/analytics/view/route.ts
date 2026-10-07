import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureJsonRequest, MAX_ANALYTICS_BODY_BYTES, noStoreJson, rateLimit, rateLimitedResponse, sameOrigin, validSlug, validUuid } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const limited = rateLimit(req, 'analytics-view', 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);
  const jsonCheck = ensureJsonRequest(req, MAX_ANALYTICS_BODY_BYTES);
  if (!jsonCheck.ok) return jsonCheck.response;
  if (!sameOrigin(req)) return noStoreJson({ ok: false }, { status: 403 });

  try {
    const body = await req.json();
    const slug = String(body?.slug ?? '').trim();
    const sessionId = String(body?.sessionId ?? '').trim();
    if (!validSlug(slug) || !validUuid(sessionId)) return noStoreJson({ ok: false }, { status: 400 });

    const { data: book, error: bookError } = await supabaseAdmin.from('books').select('id,status').eq('slug', slug).maybeSingle();
    if (bookError || !book || book.status !== 'PUBLISHED') return noStoreJson({ ok: false }, { status: 404 });

    const session = await auth();
    let userId: string | null = null;
    if (session?.user?.email) {
      const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', session.user.email.trim().toLowerCase()).maybeSingle();
      userId = user?.id ?? null;
    }

    // The unique index makes a refresh in the same browser session one view,
    // preventing an attacker from inflating view counts by replaying the request.
    const { error } = await supabaseAdmin.from('book_views').upsert(
      { book_id: book.id, session_id: sessionId, user_id: userId },
      { onConflict: 'book_id,session_id', ignoreDuplicates: true },
    );
    if (error) return noStoreJson({ ok: false }, { status: 503 });

    return noStoreJson({ ok: true });
  } catch {
    return noStoreJson({ ok: false }, { status: 400 });
  }
}
