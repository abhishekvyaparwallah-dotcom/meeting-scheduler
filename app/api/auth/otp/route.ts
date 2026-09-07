import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import OtpToken from '@/models/OtpToken';
import { sendLoginOtpEmail } from '@/lib/email-service';
import { memoryStore } from '@/lib/in-memory-store';

const STATIC_ADMIN = {
  employeeId: 'EMP-1001',
  name: 'Avinash Jha',
  email: 'avinashjhacode@gmail.com',
  password: 'Admin@111',
  role: 'ADMIN',
};

// In-memory OTP storage fallback if MongoDB is in offline mode
const memoryOtpStore = new Map<
  string,
  {
    email: string;
    otpHash: string;
    challengeId: string;
    attempts: number;
    expiresAt: number;
  }
>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email?.toString().toLowerCase().trim();
    const password = body.password?.toString() ?? '';
    const captchaVerified = Boolean(body.captchaVerified);

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    if (!captchaVerified) {
      return NextResponse.json(
        { message: 'Security CAPTCHA verification failed. Please solve the CAPTCHA.' },
        { status: 400 }
      );
    }

    let foundUser: { name: string; email: string; role: string; passwordHash?: string } | null = null;

    try {
      await connectToDatabase();
      const userDoc = await User.findOne({ email, active: true });
      if (userDoc) {
        const passwordMatches = bcrypt.compareSync(password, userDoc.passwordHash);
        if (passwordMatches) {
          foundUser = {
            name: userDoc.name,
            email: userDoc.email,
            role: userDoc.role,
          };
        } else {
          return NextResponse.json(
            { message: 'Invalid email or password. Please try again.' },
            { status: 401 }
          );
        }
      }
    } catch (dbErr) {
      console.warn('[OTP API] MongoDB offline or fallback:', (dbErr as Error).message);
    }

    // Check static fallback admin if user wasn't in MongoDB
    if (!foundUser) {
      if (email === STATIC_ADMIN.email && password === STATIC_ADMIN.password) {
        foundUser = {
          name: STATIC_ADMIN.name,
          email: STATIC_ADMIN.email,
          role: STATIC_ADMIN.role,
        };
      } else {
        // Also check memoryStore users
        const memUser = memoryStore.users.find(
          (u) => u.email.toLowerCase() === email && (u as any).password === password
        );
        if (memUser) {
          foundUser = {
            name: memUser.name,
            email: memUser.email,
            role: memUser.role,
          };
        }
      }
    }

    if (!foundUser) {
      return NextResponse.json(
        { message: 'Invalid email or password. Please try again.' },
        { status: 401 }
      );
    }

    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const challengeId = crypto.randomUUID();
    const otpHash = bcrypt.hashSync(otp, 8);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    try {
      await connectToDatabase();
      // Invalidate any previous active OTPs for this email
      await OtpToken.deleteMany({ email });
      await OtpToken.create({
        email,
        otpHash,
        challengeId,
        attempts: 0,
        expiresAt,
      });
    } catch (saveErr) {
      console.warn('[OTP API] Storing OTP in memory fallback:', (saveErr as Error).message);
      memoryOtpStore.set(challengeId, {
        email,
        otpHash,
        challengeId,
        attempts: 0,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
    }

    // Send email via Nodemailer
    const emailResult = await sendLoginOtpEmail({
      email: foundUser.email,
      name: foundUser.name,
      otp,
      role: foundUser.role,
    });

    return NextResponse.json({
      success: true,
      challengeId,
      email: foundUser.email,
      name: foundUser.name,
      devOtpPreview: !process.env.SMTP_HOST ? otp : undefined, // Useful dev hint if SMTP not yet configured
      message: `A 6-digit security code has been sent to ${foundUser.email}. Valid for 5 minutes.`,
    });
  } catch (err: any) {
    console.error('[OTP API ERROR]:', err);
    return NextResponse.json(
      { message: err?.message || 'Failed to process login request.' },
      { status: 500 }
    );
  }
}
