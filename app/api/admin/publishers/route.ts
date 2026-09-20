import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listPublishers, updatePublisher, type PublisherStatus } from '@/lib/publisher-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ensureAdmin() {
  const session = await auth();
  return !!(session?.user?.email && session.user.email === process.env.ADMIN_EMAIL);
}

export async function GET() {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  return NextResponse.json({ publishers: await listPublishers() });
}

export async function PATCH(request: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { email?: string; status?: PublisherStatus } | null;
  const email = String(body?.email ?? '').trim();
  const status = body?.status;
  if (!email || !status || !['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid publisher update.' }, { status: 400 });
  }
  const updated = await updatePublisher(email, { status });
  if (!updated) return NextResponse.json({ error: 'Publisher not found.' }, { status: 404 });
  return NextResponse.json({ publisher: updated });
}
