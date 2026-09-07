import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const isProtected = ['/dashboard', '/crm', '/analytics', '/api/meetings', '/api/leads', '/api/clients', '/api/admin'].some((path) =>
        pathname.startsWith(path)
      );

      if (isProtected) {
        if (!isLoggedIn) {
          if (pathname.startsWith('/api/')) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
          }
          return false;
        }
        const role = (auth.user as any)?.role;
        if ((pathname.startsWith('/analytics') || pathname.startsWith('/api/admin') || pathname.startsWith('/api/clients')) && role !== 'ADMIN') {
          if (pathname.startsWith('/api/')) {
            return Response.json({ message: 'Forbidden' }, { status: 403 });
          }
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.employeeId = (user as any).employeeId;
        token.userId = user.id;
        token.dailyTarget = (user as any).dailyTarget;
        token.customScript = (user as any).customScript;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as any;
        session.user.employeeId = token.employeeId as string;
        session.user.id = token.userId as string;
        (session.user as any).dailyTarget = token.dailyTarget as number;
        (session.user as any).customScript = token.customScript as string;
      }
      return session;
    },
  },
  providers: [],
};
