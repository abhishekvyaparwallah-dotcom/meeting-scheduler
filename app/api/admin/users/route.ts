import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { AppUser } from '@/lib/types';

import { memoryStore } from '@/lib/in-memory-store';

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const userDocs = await User.find().sort({ createdAt: 1 }).lean();

    const users: AppUser[] = userDocs.map((u: any) => ({
      id: u._id.toString(),
      employeeId: u.employeeId,
      name: u.name,
      email: u.email,
      passwordHash: '',
      role: u.role,
      phone: u.phone,
      customScript: u.customScript || '',
      active: u.active,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    console.warn('[API USERS] Fallback to in-memory users:', (err as Error).message);
    return NextResponse.json({ users: memoryStore.users });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as Partial<AppUser> & { password?: string };
  if (!body.name || !body.email || !body.password || !body.employeeId) {
    return NextResponse.json({ message: 'Missing required staff fields' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const existing = await User.findOne({
      $or: [{ email: body.email.toLowerCase().trim() }, { employeeId: body.employeeId.trim() }],
    });

    if (existing) {
      return NextResponse.json(
        { message: 'Staff with this email or Employee ID already exists' },
        { status: 400 }
      );
    }

    const newUserDoc = await User.create({
      employeeId: body.employeeId.trim(),
      name: body.name.trim(),
      email: body.email.toLowerCase().trim(),
      passwordHash: bcrypt.hashSync(body.password, 10),
      role: body.role ?? 'TELECALLER',
      phone: body.phone || '',
      customScript: body.customScript || '',
      active: true,
    });

    const user: AppUser = {
      id: newUserDoc._id.toString(),
      employeeId: newUserDoc.employeeId,
      name: newUserDoc.name,
      email: newUserDoc.email,
      passwordHash: '',
      role: newUserDoc.role,
      phone: newUserDoc.phone,
      customScript: newUserDoc.customScript || '',
      active: newUserDoc.active,
    };

    try {
      await AuditLog.create({
        employeeId: (session.user as any).employeeId,
        employeeName: session.user.name ?? 'Admin',
        actionType: 'CREATE_USER',
        entityType: 'user',
        entityId: user.id,
        details: `Created new ${user.role} account for ${user.name} (${user.employeeId})`,
      });
    } catch (e) {
      console.error('Audit log error:', e);
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.warn('[API USERS POST] Offline fallback:', (err as Error).message);
    const mockUser: AppUser = {
      id: `USR-${Date.now()}`,
      employeeId: body.employeeId.trim(),
      name: body.name.trim(),
      email: body.email.toLowerCase().trim(),
      passwordHash: '',
      role: body.role ?? 'TELECALLER',
      phone: body.phone || '',
      customScript: body.customScript || '',
      active: true,
    };
    memoryStore.users.push(mockUser);
    return NextResponse.json({ user: mockUser }, { status: 201 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as Partial<AppUser> & { password?: string };
  if (!body.id) {
    return NextResponse.json({ message: 'Missing user ID' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const updateFields: any = {};
    if (body.name) updateFields.name = body.name.trim();
    if (body.phone !== undefined) updateFields.phone = body.phone;
    if (body.customScript !== undefined) updateFields.customScript = body.customScript;
    if (body.active !== undefined) updateFields.active = body.active;
    if (body.password) {
      updateFields.passwordHash = bcrypt.hashSync(body.password, 10);
    }

    const updated = await User.findByIdAndUpdate(body.id, updateFields, { new: true });

    if (body.password) {
      try {
        await AuditLog.create({
          employeeId: (session.user as any).employeeId,
          employeeName: session.user.name ?? 'Admin',
          actionType: 'UPDATE_PASSWORD',
          entityType: 'user',
          entityId: body.id,
          details: `Password changed for telecaller: ${updated?.name || body.id}`,
        });
      } catch (e) {
        console.error('Audit log error:', e);
      }
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    const memUser = memoryStore.users.find((u) => u.id === body.id);
    if (memUser) {
      if (body.customScript !== undefined) memUser.customScript = body.customScript;
      if (body.phone !== undefined) memUser.phone = body.phone;
      if (body.password) memUser.passwordHash = bcrypt.hashSync(body.password, 10);
    }
    return NextResponse.json({ success: true, user: memUser });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ message: 'Missing user ID' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const target = await User.findById(id);
    if (!target) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (target.role === 'ADMIN' && target.email === 'admin@vyaparwallah.com') {
      return NextResponse.json({ message: 'Cannot delete primary Admin account' }, { status: 400 });
    }

    await User.findByIdAndDelete(id);

    try {
      await AuditLog.create({
        employeeId: (session.user as any).employeeId,
        employeeName: session.user.name ?? 'Admin',
        actionType: 'DELETE_USER',
        entityType: 'user',
        entityId: id,
        details: `Removed staff account: ${target.name} (${target.employeeId})`,
      });
    } catch (e) {
      console.error('Audit log error:', e);
    }
  } catch (err) {
    memoryStore.users = memoryStore.users.filter((u) => u.id !== id);
  }

  return NextResponse.json({ success: true });
}
