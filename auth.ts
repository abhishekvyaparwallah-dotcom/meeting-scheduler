import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from '@/auth.config';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';

import { UserRole } from '@/lib/types';

const STATIC_FALLBACK_USERS: Array<{
  employeeId: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}> = [
  {
    employeeId: 'EMP-1001',
    name: 'Vyapar Admin',
    email: 'admin@vyaparwallah.com',
    password: 'Admin@12345',
    role: 'ADMIN',
  },
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().toLowerCase().trim();
        const password = credentials?.password?.toString() ?? '';
        if (!email || !password) return null;

        try {
          await connectToDatabase();

          const user = await User.findOne({ email, active: true });
          if (user) {
            const passwordMatches = bcrypt.compareSync(password, user.passwordHash);
            if (passwordMatches) {
              try {
                await AuditLog.create({
                  employeeId: user.employeeId,
                  employeeName: user.name,
                  actionType: 'LOGIN',
                  entityType: 'session',
                  details: `Logged in as ${user.role}`,
                });
              } catch (e) {
                console.error('Failed to log login audit:', e);
              }

              return {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                employeeId: user.employeeId,
                dailyTarget: user.dailyTarget ?? 3,
                customScript: user.customScript ?? '',
              };
            }
            // User exists in database but password didn't match -> reject immediately
            return null;
          }
        } catch (dbErr) {
          console.warn('[AUTH] MongoDB offline or unreachable, checking fallback accounts:', (dbErr as Error).message);
        }

        // Fallback check if MongoDB is offline or initial setup
        const fallback = STATIC_FALLBACK_USERS.find(
          (u) => u.email.toLowerCase() === email && u.password === password
        );

        if (fallback) {
          return {
            id: fallback.employeeId,
            name: fallback.name,
            email: fallback.email,
            role: fallback.role,
            employeeId: fallback.employeeId,
            dailyTarget: 3,
            customScript: '',
          };
        }

        return null;
      },
    }),
  ],
  secret: process.env.AUTH_SECRET ?? 'vyapar-wallah-default-secret-key-99',
});

