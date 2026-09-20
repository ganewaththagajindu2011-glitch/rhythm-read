import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ensureAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  return !!(email && process.env.ADMIN_EMAIL?.toLowerCase() === email);
}

export async function GET() {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  try {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [books, views, time, users, orders] = await Promise.all([
      supabaseAdmin.from('books').select('id,title,status,is_free,price'),
      supabaseAdmin.from('book_views').select('book_id,viewed_at').gte('viewed_at', since),
      supabaseAdmin.from('reading_sessions').select('book_id,duration_seconds,ended_at').gte('ended_at', since),
      supabaseAdmin.from('users').select('id,created_at').gte('created_at', since),
      supabaseAdmin.from('orders').select('amount,status').eq('status', 'PAID').gte('created_at', since),
    ]);
    if (books.error) throw books.error;
    if (views.error) throw views.error;
    if (time.error) throw time.error;
    if (users.error) throw users.error;
    if (orders.error) throw orders.error;

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

    return NextResponse.json({
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
  } catch (error) {
    console.error('Analytics load failed:', error);
    return NextResponse.json({ error: 'Analytics unavailable. Run ANALYTICS-MIGRATION.sql first.' }, { status: 503 });
  }
}
