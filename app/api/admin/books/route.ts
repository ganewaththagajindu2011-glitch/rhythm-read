import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { getUploadedBooks, createBookRecord, setBookStatus } from '@/lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const configured = process.env.ADMIN_EMAIL?.toLowerCase();
  return Boolean(email && configured && email === configured);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `book-${Date.now()}`;
}

const editBookSchema = z.object({
  slug: z.string().min(1).max(160),
  title: z.string().trim().min(1).max(180).optional(),
  authorName: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  price: z.number().finite().min(0).max(100000).optional(),
  free: z.boolean().optional(),
  featured: z.boolean().optional(),
  content: z.string().max(10000).optional(),
  coverKey: z.string().regex(/^admin\//).max(500),
pdfKey: z.string().regex(/^admin\//).max(500).optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
});

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  return NextResponse.json({ books: await getUploadedBooks() });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const title = String(body.title ?? '').trim();
    const authorName = String(body.authorName ?? '').trim();
    const description = String(body.description ?? '').trim();
    const category = String(body.category ?? 'Fiction').trim() || 'Fiction';
    const price = Number(body.price ?? 0);
    const free = Boolean(body.free);
    const featured = Boolean(body.featured);
    const content = String(body.content ?? '').trim();
    const coverKey = String(body.coverKey ?? '').trim();
    const pdfKey = String(body.pdfKey ?? '').trim();
    const fileName = String(body.fileName ?? 'book.pdf').trim() || 'book.pdf';
    const fileSize = Number(body.fileSize ?? 0);

    if (!title || !authorName || !description) {
      return NextResponse.json({ error: 'Title, author and description are required.' }, { status: 400 });
    }

    if (!coverKey || !pdfKey) {
      return NextResponse.json({ error: 'Upload both the cover and PDF first.' }, { status: 400 });
    }

    if (!coverKey.startsWith('admin/')) {
      return NextResponse.json({ error: 'Invalid cover storage path.' }, { status: 400 });
    }

    if (!pdfKey.startsWith('admin/')) {
      return NextResponse.json({ error: 'Invalid PDF storage path.' }, { status: 400 });
    }

    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'The book file must be a PDF.' }, { status: 400 });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: 'PDF file size is required.' }, { status: 400 });
    }

    const uploadedBooks = await getUploadedBooks();
    let slug = slugify(title);
    let n = 2;
    while (uploadedBooks.some((book) => book.slug === slug)) {
      slug = `${slugify(title)}-${n++}`;
    }

    const created = await createBookRecord({
      slug,
      title,
      authorName,
      description,
      coverUrl: `/api/books/${slug}/cover`,
      coverKey,
      content: content || 'This book is available in the Rhythm Read reader.',
      price: free ? 0 : Math.max(0, price || 0),
      free,
      featured,
      category,
      ownerId: null,
      pdfKey,
      fileName,
      fileSize,
      status: 'PUBLISHED',
    });

    return NextResponse.json({ ok: true, book: created }, { status: 201 });
  } catch (error) {
    console.error('Admin book creation failed:', error);
    return NextResponse.json({ error: 'Book could not be created.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  try {
    const raw = await request.json();
    const parsed = editBookSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid book update data.', details: parsed.error.flatten() }, { status: 400 });
    }

    const values = parsed.data;
    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    const { categoryIdFor } = await import('@/lib/catalog');

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('books')
      .select('id, slug, cover_key, pdf_key')
      .eq('slug', values.slug)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!existing) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (values.title !== undefined) update.title = values.title;
    if (values.authorName !== undefined) update.author_name = values.authorName;
    if (values.description !== undefined) update.description = values.description;
    if (values.category !== undefined) update.category_id = await categoryIdFor(values.category);
    if (values.free !== undefined) {
      update.is_free = values.free;
      if (values.free) update.price = 0;
    }
    if (values.price !== undefined && values.free !== true) update.price = Math.max(0, values.price);
    if (values.featured !== undefined) update.featured = values.featured;
    if (values.content !== undefined) update.content = values.content;
    if (values.coverKey !== undefined) {
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

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'books';
    const oldFiles: string[] = [];
    if (values.coverKey && existing.cover_key && existing.cover_key !== values.coverKey) oldFiles.push(existing.cover_key);
    if (values.pdfKey && existing.pdf_key && existing.pdf_key !== values.pdfKey) oldFiles.push(existing.pdf_key);
    if (oldFiles.length) {
      const { error: cleanupError } = await supabaseAdmin.storage.from(bucket).remove(oldFiles);
      if (cleanupError) console.warn('Old file cleanup warning:', cleanupError.message);
    }

    await supabaseAdmin.from('audit_logs').insert({
      actor_email: process.env.ADMIN_EMAIL,
      action: 'EDIT_BOOK',
      entity: 'books',
      entity_id: existing.id,
      meta: { slug: existing.slug, fields: Object.keys(update).filter((k) => k !== 'updated_at') },
    });

    revalidatePath('/');
    revalidatePath('/discover');
    revalidatePath(`/book/${existing.slug}`);
    revalidatePath('/library');

    return NextResponse.json({ ok: true, book: updated });
  } catch (error) {
    console.error('Admin book update failed:', error);
    return NextResponse.json({ error: 'Book could not be updated.' }, { status: 500 });
  }
}


export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { slug?: string } | null;
  const slug = String(body?.slug ?? '').trim();
  if (!slug) return NextResponse.json({ error: 'Slug is required.' }, { status: 400 });

  try {
    const { data: row, error: lookupError } = await (await import('@/lib/supabase-admin')).supabaseAdmin
      .from('books')
      .select('id,slug,cover_key,pdf_key')
      .eq('slug', slug)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!row) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });

    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    const { count: orderCount, error: orderCountError } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('book_id', row.id);

    if (orderCountError) throw orderCountError;
    if ((orderCount ?? 0) > 0) {
      return NextResponse.json({
        error: 'This book has purchase history and cannot be permanently deleted. Unpublish it instead so financial records remain intact.'
      }, { status: 409 });
    }

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'books';
    const files = [row.cover_key, row.pdf_key].filter(Boolean) as string[];
    if (files.length) {
      const { error: storageError } = await supabaseAdmin.storage.from(bucket).remove(files);
      if (storageError) console.warn('Storage cleanup warning:', storageError.message);
    }

    const { error: deleteError } = await supabaseAdmin.from('books').delete().eq('id', row.id);
    if (deleteError) throw deleteError;

    await supabaseAdmin.from('audit_logs').insert({
      actor_email: process.env.ADMIN_EMAIL,
      action: 'DELETE_BOOK',
      entity: 'books',
      entity_id: row.id,
      meta: { slug: row.slug },
    });

    revalidatePath('/');
    revalidatePath('/discover');
    revalidatePath(`/book/${row.slug}`);
    revalidatePath('/library');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin book deletion failed:', error);
    return NextResponse.json({ error: 'Book could not be deleted.' }, { status: 500 });
  }
}
