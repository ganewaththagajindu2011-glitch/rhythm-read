import type { NextAuthConfig } from 'next-auth';

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || '';
}

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      if (nextUrl.pathname.startsWith('/admin')) {
        const email = normalizeEmail(auth?.user?.email);
        const admin = normalizeEmail(process.env.ADMIN_EMAIL);
        return Boolean(email && admin && email === admin);
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
