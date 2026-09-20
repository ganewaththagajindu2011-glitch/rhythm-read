import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { error } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('active', true)
      .limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, database: 'ok' });
  } catch {
    return NextResponse.json({ ok: false, database: 'unavailable' }, { status: 503 });
  }
}
