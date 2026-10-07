import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/admin-auth';
import { noStoreJson, rateLimit, rateLimitedResponse } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = rateLimit(request, 'admin-analytics-get', 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);
  if (!(await requireAdmin())) return noStoreJson({ error: 'Forbidden.' }, { status: 403 });

  try {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [books, views, time, users, orders] = await Promise.all([
      supabaseAdmin.from('books').select('id,title,status,is_free,price').limit(5000),
      supabaseAdmin.from('book_views').select('book_id,viewed_at').gte('viewed_at', since).limit(100000),
      supabaseAdmin.from('reading_sessions').select('book_id,duration_seconds,ended_at').gte('ended_at', since).limit(100000),
      supabaseAdmin.from('users').select('id,created_at').gte('created_at', since).limit(100000),
      supabaseAdmin.from('orders').select('amount,status').eq('status', 'PAID').gte('created_at', since).limit(100000),
    ]);
    if (books.error || views.error || time.error || users.error || orders.error) throw new Error('Analytics query failed');

    const metrics = new Map<string, { title: string; views: number; seconds: number }>();
    for (const b of books.data ?? []) metrics.set(b.id, { title: b.title, views: 0, seconds: 0 });
    for (const v of views.data ?? []) {
      const row = metrics.get(v.book_id); if (row) row.views += 1;
    }
    for (const t of time.data ?? []) {
      const row = metrics.get(t.book_id); if (row) row.seconds += Number(t.duration_seconds || 0);
    }

    const topBooks = [...metrics.values()].sort((a, b) => b.views - a.views).slice(0, 10);
    const totalReadingSeconds = [...metrics.values()].reduce((sum, x) => sum + x.seconds, 0);
    const paidRevenue = (orders.data ?? []).reduce((sum, x) => sum + Number(x.amount || 0), 0);

    return noStoreJson({
      periodDays: 30,
      totalViews: (views.data ?? []).length,
      totalReadingSeconds,
      totalReadingMinutes: Math.round(totalReadingSeconds / 60),
      newUsers: (users.data ?? []).length,
      paidRevenue,
      topBooks,
      totals: {
        allBooks: (books.data ?? []).length,
        published: (books.data ?? []).filter((b) => b.status === 'PUBLISHED').length,
        free: (books.data ?? []).filter((b) => b.is_free).length,
      },
    });
  } catch {
    return noStoreJson({ error: 'Analytics unavailable. Run the required database migrations first.' }, { status: 503 });
  }
}
