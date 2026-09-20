import type { Book } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase-admin';

function rowToBook(row: any): Book {
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author_name,
    description: row.description,
    cover: row.cover_url || (row.slug ? `/api/books/${row.slug}/cover` : ''),
    category: category?.name ?? 'Uncategorized',
    price: Number(row.price ?? 0),
    free: Boolean(row.is_free),
    featured: Boolean(row.featured),
    content: row.content ?? '',
    pdfUrl: row.pdf_key ? `/api/books/${row.slug}/file` : undefined,
    fileName: row.file_name ?? undefined,
    fileSize: row.file_size ? Number(row.file_size) : undefined,
  };
}

async function queryBooks(statuses: string[]) {
  const { data, error } = await supabaseAdmin
    .from('books')
    .select('*, categories(name)')
    .in('status', statuses)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToBook);
}

export async function getCatalog(): Promise<Book[]> {
  return queryBooks(['PUBLISHED']);
}

export async function getUploadedBooks(): Promise<Book[]> {
  return queryBooks(['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED']);
}

export async function findBook(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('books')
    .select('*, categories(name)')
    .eq('slug', slug)
    .eq('status', 'PUBLISHED')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToBook(data) : null;
}

export async function listCategories(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('name')
    .eq('active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.name);
}

export async function categoryIdFor(name: string) {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';
  const { data, error } = await supabaseAdmin
    .from('categories')
    .upsert({ name, slug, active: true }, { onConflict: 'name' })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function createBookRecord(input: {
  slug: string;
  title: string;
  authorName: string;
  description: string;
  coverUrl: string;
  content: string;
  price: number;
  free: boolean;
  featured: boolean;
  category: string;
  ownerId?: string | null;
  pdfKey?: string | null;
  coverKey?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  status?: 'DRAFT'|'PENDING'|'PUBLISHED'|'REJECTED';
}) {
  const categoryId = await categoryIdFor(input.category);
  const { data, error } = await supabaseAdmin
    .from('books')
    .insert({
      slug: input.slug,
      title: input.title,
      author_name: input.authorName,
      description: input.description,
      cover_url: input.coverUrl,
      cover_key: input.coverKey ?? null,
      content: input.content,
      price: input.free ? 0 : Math.max(0, input.price || 0),
      currency: 'USD',
      is_free: input.free,
      featured: input.featured,
      status: input.status ?? 'PENDING',
      category_id: categoryId,
      owner_id: input.ownerId ?? null,
      pdf_key: input.pdfKey ?? null,
      file_name: input.fileName ?? null,
      file_size: input.fileSize ?? null,
    })
    .select('id,slug')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setBookStatus(slug: string, status: 'DRAFT'|'PENDING'|'PUBLISHED'|'REJECTED') {
  const { data, error } = await supabaseAdmin
    .from('books')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getPublisherBooks(ownerId: string) {
  const { data, error } = await supabaseAdmin
    .from('books')
    .select('*, categories(name)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToBook);
}

export async function getBookRow(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('books')
    .select('*, categories(name), publisher_profiles!books_owner_id_fkey(user_id,status)')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
