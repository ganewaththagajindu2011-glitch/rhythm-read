import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { authConfig } from './auth.config';
import { upsertUser } from '@/lib/db-users';
import { getRoleForEmail } from '@/lib/roles';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (user.email) {
        try {
          await upsertUser({
            email: user.email,
            name: user.name,
            image: user.image,
          });
        } catch (e) {
          console.error('user sync failed', e);
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
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
