import { NextResponse } from 'next/server';
import { getBookRow } from '@/lib/catalog';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@/auth';
import { getUserByEmail } from '@/lib/db-users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'books';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await getBookRow(slug);
  if (!row || row.status !== 'PUBLISHED' || !row.pdf_key) {
    return NextResponse.json({ error: 'Book file not available.' }, { status: 404 });
  }

  if (!row.is_free) {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email) return NextResponse.json({ error: 'Purchase required.' }, { status: 402 });

    const user = await getUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'Purchase required.' }, { status: 402 });

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_id', row.id)
      .maybeSingle();

    if (purchaseError) {
      console.error('Purchase check failed', purchaseError);
      return NextResponse.json({ error: 'Reader access could not be verified.' }, { status: 503 });
    }

    if (!purchase) return NextResponse.json({ error: 'Purchase required.' }, { status: 402 });
  }

  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(row.pdf_key, 60);
    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message ?? 'Reader storage is not configured.' }, { status: 503 });
    }
    return NextResponse.redirect(data.signedUrl, {
      status: 302,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Supabase signed reader url failed', error);
    return NextResponse.json({ error: 'Reader storage is not configured.' }, { status: 503 });
  }
}
