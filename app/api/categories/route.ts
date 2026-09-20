import { NextResponse } from 'next/server';
import { listCategories } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(
      { categories: await listCategories() },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } }
    );
  } catch {
    return NextResponse.json({ error: 'Categories are unavailable.' }, { status: 503 });
  }
}
