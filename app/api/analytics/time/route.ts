import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { slug?: string; sessionId?: string; seconds?: number } | null;
    const slug = String(body?.slug ?? '').trim();
    const sessionId = String(body?.sessionId ?? '').trim();
    const seconds = Math.min(86400, Math.max(0, Number(body?.seconds ?? 0)));
    if (!slug || !sessionId || !Number.isFinite(seconds)) return NextResponse.json({ ok: false }, { status: 400 });

    const { data: book } = await supabaseAdmin.from('books').select('id,status').eq('slug', slug).maybeSingle();
    if (!book || book.status !== 'PUBLISHED') return NextResponse.json({ ok: false }, { status: 404 });

    const session = await auth();
    let userId: string | null = null;
    if (session?.user?.email) {
      const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', session.user.email.toLowerCase()).maybeSingle();
      userId = user?.id ?? null;
    }

    const { data: current } = await supabaseAdmin.from('reading_sessions').select('id').eq('session_id', sessionId).eq('book_id', book.id).maybeSingle();
    if (current) {
      await supabaseAdmin.from('reading_sessions').update({ duration_seconds: Math.round(seconds), ended_at: new Date().toISOString(), user_id: userId }).eq('id', current.id);
    } else {
      await supabaseAdmin.from('reading_sessions').insert({ book_id: book.id, session_id: sessionId, user_id: userId, started_at: new Date(Date.now() - Math.round(seconds) * 1000).toISOString(), ended_at: new Date().toISOString(), duration_seconds: Math.round(seconds) });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
