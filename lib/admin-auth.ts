import { auth } from '@/auth';

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || '';
}

export async function getAdminIdentity() {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  const configured = normalizeEmail(process.env.ADMIN_EMAIL);
  if (!email || !configured || email !== configured) return null;

  const user = session?.user as ({ emailVerified?: boolean | null } | undefined);
  if (user?.emailVerified === false) return null;

  return email;
}

export async function requireAdmin() {
  return getAdminIdentity();
}
