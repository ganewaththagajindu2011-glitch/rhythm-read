import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/admin-auth';
import {
  MAX_COVER_BYTES,
  MAX_PDF_BYTES,
  ensureJsonRequest,
  noStoreJson,
  rateLimit,
  rateLimitedResponse,
  sameOrigin,
} from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'books';

const uploadSchema = z.object({
  name: z.string().trim().min(1).max(255).refine((value) => !/[\u0000-\u001F\u007F]/.test(value), 'Invalid file name.'),
  type: z.string().trim().min(1).max(100),
  kind: z.enum(['cover', 'pdf']),
  size: z.number().int().positive(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, 'admin-storage-presign', 20, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);

  const jsonCheck = ensureJsonRequest(request, 16 * 1024);
  if (!jsonCheck.ok) return jsonCheck.response;
  if (!sameOrigin(request)) return noStoreJson({ error: 'Cross-site request blocked.' }, { status: 403 });

  const adminEmail = await requireAdmin();
  if (!adminEmail) return noStoreJson({ error: 'Administrator access required.' }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) return noStoreJson({ error: 'Invalid upload request.' }, { status: 400 });

    const { name, type, kind, size } = parsed.data;
    const lowerName = name.toLowerCase();

    if (kind === 'pdf') {
      if (type !== 'application/pdf' || !lowerName.endsWith('.pdf')) {
        return noStoreJson({ error: 'A valid PDF file is required.' }, { status: 400 });
      }
      if (size > MAX_PDF_BYTES) {
        return noStoreJson({ error: 'PDF is too large. Maximum supported size is 300 MB.' }, { status: 413 });
      }
    } else {
      const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
      const validExt = /\.(jpe?g|png|webp)$/.test(lowerName);
      if (!allowed.has(type) || !validExt) {
        return noStoreJson({ error: 'Cover must be JPG, PNG or WEBP.' }, { status: 400 });
      }
      if (size > MAX_COVER_BYTES) {
        return noStoreJson({ error: 'Cover image is too large. Maximum supported size is 10 MB.' }, { status: 413 });
      }
    }

    const extension = kind === 'pdf'
      ? 'pdf'
      : lowerName.endsWith('.png')
        ? 'png'
        : lowerName.endsWith('.webp')
          ? 'webp'
          : 'jpg';

    const date = new Date().toISOString().slice(0, 10);
    const key = `admin/${date}/${randomUUID()}.${extension}`;
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(key);

    if (error || !data) return noStoreJson({ error: 'Could not create upload URL.' }, { status: 503 });

    return noStoreJson({ bucket: BUCKET, path: key, token: data.token, expiresIn: 7200 }, { status: 200 });
  } catch (error) {
    console.error('Admin storage presign failed');
    return noStoreJson({ error: 'Supabase Storage is not configured correctly.' }, { status: 503 });
  }
}
