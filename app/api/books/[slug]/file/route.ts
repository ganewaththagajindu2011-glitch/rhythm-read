import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getBookRow } from '@/lib/catalog';
import { getUserByEmail } from '@/lib/db-users';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { noStoreJson, rateLimit, rateLimitedResponse, validSlug } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'books';
const PDF_URL_TTL_SECONDS = 90;

async function authorizeReader(row: any) {
  // Every PDF request requires a verified Google/NextAuth session.
  // Paid editions additionally require a verified PAID purchase record.
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return { ok: false as const, status: 401, error: 'Please sign in with Google before opening any book.' };

  const user = await getUserByEmail(email);
  if (!user) return { ok: false as const, status: 401, error: 'Your account is not ready yet. Please sign in again.' };

  if (!row.is_free) {
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .select('id,order_id')
      .eq('user_id', user.id)
      .eq('book_id', row.id)
      .maybeSingle();

    if (purchaseError) {
      console.error('Purchase lookup failed');
      return { ok: false as const, status: 503, error: 'Reader access could not be verified.' };
    }
    if (!purchase) return { ok: false as const, status: 402, error: 'Purchase required.' };

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('status')
      .eq('id', purchase.order_id)
      .maybeSingle();

    if (orderError || order?.status !== 'PAID') {
      return { ok: false as const, status: 402, error: 'Purchase required.' };
    }
  }

  return { ok: true as const, userId: user.id };
}

async function getSignedUrl(key: string) {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(key, PDF_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function handle(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validSlug(slug)) return noStoreJson({ error: 'Book file not available.' }, { status: 404 });

  const limited = rateLimit(request, `book-file:${slug}`, 90, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);

  try {
    const row = await getBookRow(slug);
    if (!row || row.status !== 'PUBLISHED' || !row.pdf_key) {
      return noStoreJson({ error: 'Book file not available.' }, { status: 404 });
    }

    const access = await authorizeReader(row);
    if (!access.ok) return noStoreJson({ error: access.error }, { status: access.status });

    const signedUrl = await getSignedUrl(row.pdf_key);
    if (!signedUrl) return noStoreJson({ error: 'Reader storage is not configured.' }, { status: 503 });

    const range = request.headers.get('range');
    const upstream = await fetch(signedUrl, {
      method: 'GET',
      headers: range ? { Range: range } : undefined,
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!upstream.ok && upstream.status !== 206) {
      console.error('PDF upstream returned', upstream.status);
      return noStoreJson({ error: 'The book file could not be loaded.' }, { status: 503 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="${String(row.file_name || `${slug}.pdf`).replace(/[^a-zA-Z0-9._ -]/g, '_')}"`);
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    headers.set('Pragma', 'no-cache');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');

    for (const name of ['content-length', 'content-range']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    console.error('PDF proxy failed');
    return noStoreJson({ error: 'The book file could not be loaded.' }, { status: 503 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  return handle(request, context);
}

export async function HEAD(request: Request, context: { params: Promise<{ slug: string }> }) {
  const response = await handle(request, context);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}
