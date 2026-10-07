import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { getUploadedBooks, createBookRecord, categoryIdFor } from '@/lib/catalog';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  MAX_JSON_BODY_BYTES,
  ensureJsonRequest,
  noStoreJson,
  rateLimit,
  rateLimitedResponse,
  sameOrigin,
} from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const storageKeySchema = z.string().trim().max(500).regex(
  /^admin\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.(?:pdf|png|jpe?g|webp)$/i,
);

const bookFieldsSchema = z.object({
  title: z.string().trim().min(1).max(180),
  authorName: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5000),
  category: z.string().trim().min(1).max(100),
  price: z.number().finite().min(0).max(100000),
  free: z.boolean(),
  featured: z.boolean(),
  content: z.string().max(10000),
});

const createSchema = bookFieldsSchema.extend({
  coverKey: storageKeySchema,
  pdfKey: storageKeySchema,
  fileName: z.string().trim().min(1).max(255).regex(/^[^\u0000-\u001F\u007F]+$/),
  fileSize: z.number().int().positive().max(300 * 1024 * 1024),
});

const editSchema = bookFieldsSchema.partial().extend({
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9](?:[a-z0-9-]{0,158}[a-z0-9])?$/),
  status: z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED']).optional(),
  coverKey: storageKeySchema.optional(),
  pdfKey: storageKeySchema.optional(),
  fileName: z.string().trim().min(1).max(255).regex(/^[^\u0000-\u001F\u007F]+$/).optional(),
  fileSize: z.number().int().positive().max(300 * 1024 * 1024).optional(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `book-${Date.now()}`;
}

function cleanupKeys(bucket: string, keys: string[]) {
  const unique = [...new Set(keys.filter(Boolean))];
  if (!unique.length) return Promise.resolve();
  return supabaseAdmin.storage.from(bucket).remove(unique).then(({ error }) => {
    if (error) console.warn('Storage cleanup warning');
  });
}

export async function GET(request: Request) {
  const limited = rateLimit(request, 'admin-books-get', 60, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);
  if (!(await requireAdmin())) return noStoreJson({ error: 'Forbidden.' }, { status: 403 });

  try {
    return noStoreJson({ books: await getUploadedBooks() });
  } catch {
    return noStoreJson({ error: 'Could not load the book catalog.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(request, 'admin-books-write', 20, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);
  const jsonCheck = ensureJsonRequest(request, MAX_JSON_BODY_BYTES);
  if (!jsonCheck.ok) return jsonCheck.response;
  if (!sameOrigin(request)) return noStoreJson({ error: 'Cross-site request blocked.' }, { status: 403 });
  const adminEmail = await requireAdmin();
  if (!adminEmail) return noStoreJson({ error: 'Forbidden.' }, { status: 403 });

  let coverKey = '';
  let pdfKey = '';
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'books';

  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return noStoreJson({ error: 'Invalid book data.' }, { status: 400 });
    const values = parsed.data;
    coverKey = values.coverKey;
    pdfKey = values.pdfKey;

    if (values.coverKey.endsWith('.pdf') || !values.coverKey.match(/\.(?:png|jpe?g|webp)$/i)) {
      return noStoreJson({ error: 'Invalid cover storage path.' }, { status: 400 });
    }
    if (!values.pdfKey.endsWith('.pdf')) return noStoreJson({ error: 'Invalid PDF storage path.' }, { status: 400 });
    if (!values.fileName.toLowerCase().endsWith('.pdf')) return noStoreJson({ error: 'The book file must be a PDF.' }, { status: 400 });

    const uploadedBooks = await getUploadedBooks();
    let slug = slugify(values.title);
    let n = 2;
    while (uploadedBooks.some((book) => book.slug === slug)) slug = `${slugify(values.title)}-${n++}`;

    const created = await createBookRecord({
      slug,
      title: values.title,
      authorName: values.authorName,
      description: values.description,
      coverUrl: `/api/books/${slug}/cover`,
      coverKey,
      content: values.content.trim() || 'This book is available in the Rhythm Read reader.',
      price: values.free ? 0 : values.price,
      free: values.free,
      featured: values.featured,
      category: values.category,
      ownerId: null,
      pdfKey,
      fileName: values.fileName,
      fileSize: values.fileSize,
      status: 'PUBLISHED',
    });

    await supabaseAdmin.from('audit_logs').insert({
      actor_email: adminEmail,
      action: 'CREATE_BOOK',
      entity: 'books',
      entity_id: created.id,
      meta: { slug, title: values.title },
    });

    revalidatePath('/');
    revalidatePath('/discover');
    revalidatePath(`/book/${slug}`);

    return noStoreJson({ ok: true, book: created }, { status: 201 });
  } catch (error) {
    await cleanupKeys(bucket, [coverKey, pdfKey]);
    console.error('Admin book creation failed');
    return noStoreJson({ error: 'Book could not be created.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const limited = rateLimit(request, 'admin-books-write', 20, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);
  const jsonCheck = ensureJsonRequest(request, MAX_JSON_BODY_BYTES);
  if (!jsonCheck.ok) return jsonCheck.response;
  if (!sameOrigin(request)) return noStoreJson({ error: 'Cross-site request blocked.' }, { status: 403 });
  const adminEmail = await requireAdmin();
  if (!adminEmail) return noStoreJson({ error: 'Forbidden.' }, { status: 403 });

  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ error: 'Invalid book update data.' }, { status: 400 });
  const values = parsed.data;

  try {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('books')
      .select('id,slug,cover_key,pdf_key')
      .eq('slug', values.slug)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!existing) return noStoreJson({ error: 'Book not found.' }, { status: 404 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (values.title !== undefined) update.title = values.title;
    if (values.authorName !== undefined) update.author_name = values.authorName;
    if (values.description !== undefined) update.description = values.description;
    if (values.category !== undefined) update.category_id = await categoryIdFor(values.category);
    if (values.free !== undefined) {
      update.is_free = values.free;
      if (values.free) update.price = 0;
    }
    if (values.price !== undefined && values.free !== true) update.price = values.price;
    if (values.featured !== undefined) update.featured = values.featured;
    if (values.content !== undefined) update.content = values.content.trim();
    if (values.status !== undefined) update.status = values.status;
    if (values.coverKey !== undefined) {
      if (!/\.(?:png|jpe?g|webp)$/i.test(values.coverKey)) return noStoreJson({ error: 'Invalid cover storage path.' }, { status: 400 });
      update.cover_key = values.coverKey;
      update.cover_url = `/api/books/${existing.slug}/cover`;
    }
    if (values.pdfKey !== undefined) update.pdf_key = values.pdfKey;
    if (values.fileName !== undefined) update.file_name = values.fileName;
    if (values.fileSize !== undefined) update.file_size = values.fileSize;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('books')
      .update(update)
      .eq('id', existing.id)
      .select('id, slug, title')
      .single();

    if (updateError) throw updateError;

    const oldFiles: string[] = [];
    if (values.coverKey && existing.cover_key && existing.cover_key !== values.coverKey) oldFiles.push(existing.cover_key);
    if (values.pdfKey && existing.pdf_key && existing.pdf_key !== values.pdfKey) oldFiles.push(existing.pdf_key);
    await cleanupKeys(process.env.SUPABASE_STORAGE_BUCKET || 'books', oldFiles);

    await supabaseAdmin.from('audit_logs').insert({
      actor_email: adminEmail,
      action: 'EDIT_BOOK',
      entity: 'books',
      entity_id: existing.id,
      meta: { slug: existing.slug, fields: Object.keys(update).filter((k) => k !== 'updated_at') },
    });

    revalidatePath('/');
    revalidatePath('/discover');
    revalidatePath(`/book/${existing.slug}`);
    revalidatePath('/library');

    return noStoreJson({ ok: true, book: updated });
  } catch (error) {
    console.error('Admin book update failed');
    return noStoreJson({ error: 'Book could not be updated.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const limited = rateLimit(request, 'admin-books-write', 10, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);
  const jsonCheck = ensureJsonRequest(request, 16 * 1024);
  if (!jsonCheck.ok) return jsonCheck.response;
  if (!sameOrigin(request)) return noStoreJson({ error: 'Cross-site request blocked.' }, { status: 403 });
  const adminEmail = await requireAdmin();
  if (!adminEmail) return noStoreJson({ error: 'Forbidden.' }, { status: 403 });

  const body = await request.json().catch(() => null) as { slug?: string } | null;
  const slug = String(body?.slug ?? '').trim();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,158}[a-z0-9])?$/.test(slug)) return noStoreJson({ error: 'Invalid slug.' }, { status: 400 });

  try {
    const { data: row, error: lookupError } = await supabaseAdmin
      .from('books')
      .select('id,slug,cover_key,pdf_key')
      .eq('slug', slug)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!row) return noStoreJson({ error: 'Book not found.' }, { status: 404 });

    const [{ count: orderCount, error: orderError }, { count: purchaseCount, error: purchaseError }] = await Promise.all([
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('book_id', row.id),
      supabaseAdmin.from('purchases').select('id', { count: 'exact', head: true }).eq('book_id', row.id),
    ]);
    if (orderError) throw orderError;
    if (purchaseError) throw purchaseError;
    if ((orderCount ?? 0) > 0 || (purchaseCount ?? 0) > 0) {
      return noStoreJson({ error: 'This book has purchase history and cannot be permanently deleted. Unpublish it instead.' }, { status: 409 });
    }

    const { error: deleteError } = await supabaseAdmin.from('books').delete().eq('id', row.id);
    if (deleteError) throw deleteError;

    await cleanupKeys(process.env.SUPABASE_STORAGE_BUCKET || 'books', [row.cover_key, row.pdf_key].filter(Boolean) as string[]);

    await supabaseAdmin.from('audit_logs').insert({
      actor_email: adminEmail,
      action: 'DELETE_BOOK',
      entity: 'books',
      entity_id: row.id,
      meta: { slug: row.slug },
    });

    revalidatePath('/');
    revalidatePath('/discover');
    revalidatePath(`/book/${row.slug}`);
    revalidatePath('/library');

    return noStoreJson({ ok: true });
  } catch (error) {
    console.error('Admin book deletion failed');
    return noStoreJson({ error: 'Book could not be deleted.' }, { status: 500 });
  }
}
