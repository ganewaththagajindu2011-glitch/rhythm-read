import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json(
    { error: 'Publisher uploads are disabled. Only administrators can upload books.' },
    { status: 403 },
  );
}
