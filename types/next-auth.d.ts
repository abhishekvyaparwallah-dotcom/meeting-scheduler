import { UserRole } from '@/lib/types';
import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      employeeId: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: UserRole;
    employeeId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRole;
    employeeId?: string;
    userId?: string;
  }
}
