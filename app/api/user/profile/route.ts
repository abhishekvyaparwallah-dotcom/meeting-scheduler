import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const employeeId = (session.user as any)?.employeeId;
  const email = session.user.email?.toLowerCase().trim();

  try {
    await connectToDatabase();
    const userDoc = await User.findOne({
      $or: [
        ...(employeeId ? [{ employeeId }] : []),
        ...(email ? [{ email }] : []),
      ],
    }).lean();

    if (userDoc) {
      return NextResponse.json({
        user: {
          id: (userDoc as any)._id.toString(),
          employeeId: (userDoc as any).employeeId,
          name: (userDoc as any).name,
          email: (userDoc as any).email,
          role: (userDoc as any).role,
          phone: (userDoc as any).phone || '',
          customScript: (userDoc as any).customScript || '',
          dailyTarget: (userDoc as any).dailyTarget ?? 3,
          active: (userDoc as any).active ?? true,
        },
      });
    }
  } catch (err) {
    console.warn('[API USER PROFILE] Error fetching user profile:', (err as Error).message);
  }

  return NextResponse.json({
    user: {
      id: session.user.id || employeeId || 'EMP-1001',
      employeeId: employeeId || 'EMP-1001',
      name: session.user.name || 'Telecaller',
      email: session.user.email || '',
      role: (session.user as any)?.role || 'TELECALLER',
      phone: '',
      customScript: (session.user as any)?.customScript || '',
      dailyTarget: (session.user as any)?.dailyTarget ?? 3,
      active: true,
    },
  });
}
