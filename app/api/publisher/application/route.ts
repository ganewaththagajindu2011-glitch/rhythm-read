import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json(
    { error: 'Publisher applications and publisher uploads are disabled in the admin-owned catalog mode.' },
    { status: 403 },
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'Publisher mode is disabled. Only the administrator can publish books.' },
    { status: 403 },
  );
}
