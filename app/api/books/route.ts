import { NextResponse } from 'next/server';
import { getCatalog } from '@/lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ books: await getCatalog() });
  } catch (error) {
    console.error('Catalog request failed:', error);
    return NextResponse.json({ books: [] }, { status: 200 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Book uploads are admin-only. Use /api/admin/books.' },
    { status: 403 },
  );
}
