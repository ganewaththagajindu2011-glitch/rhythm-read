import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { slug?: string; sessionId?: string } | null;
    const slug = String(body?.slug ?? '').trim();
    const sessionId = String(body?.sessionId ?? '').trim();
    if (!slug || !sessionId) return NextResponse.json({ ok: false }, { status: 400 });

    const { data: book } = await supabaseAdmin.from('books').select('id,status').eq('slug', slug).maybeSingle();
    if (!book || book.status !== 'PUBLISHED') return NextResponse.json({ ok: false }, { status: 404 });

    const session = await auth();
    let userId: string | null = null;
    if (session?.user?.email) {
      const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', session.user.email.toLowerCase()).maybeSingle();
      userId = user?.id ?? null;
    }

    await supabaseAdmin.from('book_views').insert({ book_id: book.id, session_id: sessionId, user_id: userId });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
