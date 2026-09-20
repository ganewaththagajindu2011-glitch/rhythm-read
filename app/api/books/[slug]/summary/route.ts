import { NextResponse } from 'next/server';
import { findBook } from '@/lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await findBook(slug);
  if (!book) return NextResponse.json({ error: 'Book not found.' }, { status: 404 });
  return NextResponse.json({ book: { title: book.title, price: book.price, currency: 'USD', free: book.free, slug: book.slug } });
}
