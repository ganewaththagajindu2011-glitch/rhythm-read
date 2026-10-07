import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureJsonRequest, MAX_ANALYTICS_BODY_BYTES, noStoreJson, rateLimit, rateLimitedResponse, sameOrigin, validSlug, validUuid } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const limited = rateLimit(req, 'analytics-time', 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);
  const jsonCheck = ensureJsonRequest(req, MAX_ANALYTICS_BODY_BYTES);
  if (!jsonCheck.ok) return jsonCheck.response;
  if (!sameOrigin(req)) return noStoreJson({ ok: false }, { status: 403 });

  try {
    const body = await req.json();
    const slug = String(body?.slug ?? '').trim();
    const sessionId = String(body?.sessionId ?? '').trim();
    const reportedSeconds = Number(body?.seconds ?? 0);
    if (!validSlug(slug) || !validUuid(sessionId) || !Number.isFinite(reportedSeconds) || reportedSeconds < 0) {
      return noStoreJson({ ok: false }, { status: 400 });
    }

    const { data: book, error: bookError } = await supabaseAdmin.from('books').select('id,status').eq('slug', slug).maybeSingle();
    if (bookError || !book || book.status !== 'PUBLISHED') return noStoreJson({ ok: false }, { status: 404 });

    const session = await auth();
    let userId: string | null = null;
    if (session?.user?.email) {
      const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', session.user.email.trim().toLowerCase()).maybeSingle();
      userId = user?.id ?? null;
    }

    const now = new Date();
    const { data: current } = await supabaseAdmin
      .from('reading_sessions')
      .select('id,started_at,duration_seconds')
      .eq('session_id', sessionId)
      .eq('book_id', book.id)
      .maybeSingle();

    if (current) {
      const started = new Date(current.started_at).getTime();
      const elapsed = Number.isFinite(started) ? Math.max(0, (now.getTime() - started) / 1000) : 0;
      const believable = Math.min(86400, elapsed + 30); // small clock/network tolerance
      const duration = Math.max(Number(current.duration_seconds || 0), Math.min(reportedSeconds, believable));
      const { error } = await supabaseAdmin
        .from('reading_sessions')
        .update({ duration_seconds: Math.floor(duration), ended_at: now.toISOString(), user_id: userId })
        .eq('id', current.id);
      if (error) return noStoreJson({ ok: false }, { status: 503 });
    } else {
      const seconds = Math.min(30, reportedSeconds);
      const startedAt = new Date(now.getTime() - Math.floor(seconds * 1000)).toISOString();
      const { error } = await supabaseAdmin.from('reading_sessions').insert({
        book_id: book.id,
        session_id: sessionId,
        user_id: userId,
        started_at: startedAt,
        ended_at: now.toISOString(),
        duration_seconds: Math.floor(seconds),
      });
      if (error) return noStoreJson({ ok: false }, { status: 503 });
    }

    return noStoreJson({ ok: true });
  } catch {
    return noStoreJson({ ok: false }, { status: 400 });
  }
}
