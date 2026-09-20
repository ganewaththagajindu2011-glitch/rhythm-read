import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      if (nextUrl.pathname.startsWith('/admin')) {
        return auth?.user?.email === process.env.ADMIN_EMAIL;
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
