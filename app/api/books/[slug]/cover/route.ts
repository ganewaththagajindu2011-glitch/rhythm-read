import { NextResponse } from 'next/server';
import { getBookRow } from '@/lib/catalog';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'books';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await getBookRow(slug);
  if (!row || row.status !== 'PUBLISHED' || !row.cover_url) {
    return NextResponse.json({ error: 'Cover not available.' }, { status: 404 });
  }

  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(row.cover_key, 300);
    if (!error && data?.signedUrl) return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'private, max-age=60' } });
    return NextResponse.json({ error: error?.message ?? 'Cover storage is not configured.' }, { status: 503 });
  } catch (error) {
    console.error('Supabase signed cover url failed', error);
    return NextResponse.json({ error: 'Cover storage is not configured.' }, { status: 503 });
  }
}
