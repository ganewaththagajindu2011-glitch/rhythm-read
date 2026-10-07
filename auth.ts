import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { authConfig } from './auth.config';
import { upsertUser } from '@/lib/db-users';
import { getRoleForEmail } from '@/lib/roles';

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || '';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
      authorization: { params: { prompt: 'select_account' } },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;

      // Google accounts expose a verified email; only verified identities are
      // accepted into the application account system.
      if ((user as any).emailVerified === false) return false;

      try {
        await upsertUser({
          email: normalizeEmail(user.email),
          name: user.name,
          image: user.image,
        });
      } catch (e) {
        console.error('user sync failed');
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      const email = normalizeEmail(user?.email ?? token.email);
      token.role = await getRoleForEmail(email);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { role?: string }).role = String(token.role ?? 'USER');
      }
      return session;
    },
  },
});
