import { getPublisherByEmail } from '@/lib/publisher-store';

export type AppRole = 'USER' | 'AUTHOR' | 'ADMIN';

export async function getRoleForEmail(email?: string | null): Promise<AppRole> {
  if (!email) return 'USER';
  if (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) return 'ADMIN';
  const publisher = await getPublisherByEmail(email);
  if (publisher?.status === 'APPROVED') return 'AUTHOR';
  return 'USER';
}

export async function requireEmail(session: { user?: { email?: string | null } } | null) {
  const email = session?.user?.email;
  if (!email) throw new Error('UNAUTHENTICATED');
  return email;
}
