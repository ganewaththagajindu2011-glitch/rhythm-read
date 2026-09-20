import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'books';

async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const configured = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!email || !configured || email !== configured) return null;
  return email;
}

export async function POST(request: Request) {
  const adminEmail = await requireAdmin();
  if (!adminEmail) {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? 'file');
    const type = String(body.type ?? 'application/octet-stream');
    const kind = body.kind === 'cover' ? 'cover' : 'pdf';

    if (kind === 'pdf' && type !== 'application/pdf') {
      return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
    }
    if (kind === 'cover' && !type.startsWith('image/')) {
      return NextResponse.json({ error: 'An image cover is required.' }, { status: 400 });
    }

    const extension = kind === 'pdf'
      ? 'pdf'
      : name.toLowerCase().endsWith('.png')
        ? 'png'
        : name.toLowerCase().endsWith('.webp')
          ? 'webp'
          : 'jpg';

    const key = `admin/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(key);

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Could not create upload URL.' }, { status: 503 });
    }

    return NextResponse.json({ bucket: BUCKET, path: key, token: data.token, expiresIn: 7200, admin: adminEmail });
  } catch (error) {
    console.error('Admin storage presign failed:', error);
    return NextResponse.json({ error: 'Supabase Storage is not configured correctly.' }, { status: 503 });
  }
}
