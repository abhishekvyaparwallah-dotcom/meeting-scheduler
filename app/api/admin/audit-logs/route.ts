import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb';
import AuditLogModel from '@/models/AuditLog';
import { AuditLog } from '@/lib/types';
import { memoryStore } from '@/lib/in-memory-store';

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const docs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(100).lean();

    const logs: AuditLog[] = docs.map((doc: any) => ({
      id: doc._id.toString(),
      employeeId: doc.employeeId,
      employeeName: doc.employeeName,
      actionType: doc.actionType,
      entityType: doc.entityType,
      entityId: doc.entityId,
      details: doc.details,
      createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
    }));

    return NextResponse.json({ logs });
  } catch (err) {
    console.warn('[API AUDIT LOGS] Fallback offline:', (err as Error).message);
    return NextResponse.json({ logs: memoryStore.auditLogs || [] });
  }
}
