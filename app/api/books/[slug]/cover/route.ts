import { NextResponse } from 'next/server';
import { getBookRow } from '@/lib/catalog';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { noStoreJson, rateLimit, rateLimitedResponse, validSlug } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'books';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validSlug(slug)) return noStoreJson({ error: 'Cover not available.' }, { status: 404 });

  const limited = rateLimit(request, `book-cover:${slug}`, 120, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);

  const row = await getBookRow(slug);
  if (!row || row.status !== 'PUBLISHED' || !row.cover_key) {
    return noStoreJson({ error: 'Cover not available.' }, { status: 404 });
  }

  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(row.cover_key, 300);
    if (!error && data?.signedUrl) {
      return NextResponse.redirect(data.signedUrl, {
        status: 302,
        headers: {
          'Cache-Control': 'private, max-age=60',
          'Referrer-Policy': 'no-referrer',
        },
      });
    }
    return noStoreJson({ error: 'Cover storage is not configured.' }, { status: 503 });
  } catch {
    console.error('Supabase signed cover url failed');
    return noStoreJson({ error: 'Cover storage is not configured.' }, { status: 503 });
  }
}
