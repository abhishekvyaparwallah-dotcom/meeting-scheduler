import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb';
import CallingLeadModel from '@/models/CallingLead';
import AuditLog from '@/models/AuditLog';
import UserModel from '@/models/User';
import { memoryStore } from '@/lib/in-memory-store';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role;
  const adminName = (session.user as any).name || 'Admin';
  const adminEmpId = (session.user as any).employeeId || 'ADMIN';

  if (role !== 'ADMIN') {
    return NextResponse.json({ message: 'Only Admin can allocate leads.' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON request.' }, { status: 400 });
  }

  const { mode, leadIds, targetEmployeeId, count, countPerTelecaller, telecallerIds } = body;

  try {
    await connectToDatabase();

    // Mode 1: Assign specific selected lead IDs to a target telecaller
    if (mode === 'SPECIFIC_LEADS' && Array.isArray(leadIds) && leadIds.length > 0 && targetEmployeeId) {
      const targetUser = await UserModel.findOne({ employeeId: targetEmployeeId }).lean();
      const telecallerName = (targetUser as any)?.name || targetEmployeeId;

      await CallingLeadModel.updateMany(
        { _id: { $in: leadIds } },
        { $set: { assignedEmployeeId: targetEmployeeId, updatedAt: new Date() } }
      );

      // In-memory fallback sync
      if (memoryStore.leads) {
        memoryStore.leads = memoryStore.leads.map((l) =>
          leadIds.includes(l.id) ? { ...l, assignedEmployeeId: targetEmployeeId, updatedAt: new Date().toISOString() } : l
        );
      }

      await AuditLog.create({
        employeeId: adminEmpId,
        employeeName: adminName,
        actionType: 'ASSIGN_LEADS',
        entityType: 'lead',
        details: `Allocated ${leadIds.length} selected leads to ${telecallerName} (${targetEmployeeId})`,
      });

      return NextResponse.json({ success: true, updatedCount: leadIds.length });
    }

    // Mode 2: Quick count allocation (Next N unassigned leads to target telecaller)
    if (mode === 'QUICK_COUNT' && Number(count) > 0 && targetEmployeeId) {
      const targetUser = await UserModel.findOne({ employeeId: targetEmployeeId }).lean();
      const telecallerName = (targetUser as any)?.name || targetEmployeeId;
      const numToAssign = Math.min(500, Math.max(1, Number(count)));

      const unassignedDocs = await CallingLeadModel.find({
        $or: [
          { assignedEmployeeId: 'UNASSIGNED' },
          { assignedEmployeeId: '' },
          { assignedEmployeeId: null },
          { assignedEmployeeId: adminEmpId },
        ],
        status: 'NEW',
      })
        .sort({ createdAt: -1 })
        .limit(numToAssign)
        .lean();

      const idsToUpdate = unassignedDocs.map((d: any) => d._id);

      if (idsToUpdate.length > 0) {
        await CallingLeadModel.updateMany(
          { _id: { $in: idsToUpdate } },
          { $set: { assignedEmployeeId: targetEmployeeId, updatedAt: new Date() } }
        );

        // In-memory sync
        if (memoryStore.leads) {
          const strIds = idsToUpdate.map((id: any) => id.toString());
          memoryStore.leads = memoryStore.leads.map((l) =>
            strIds.includes(l.id) ? { ...l, assignedEmployeeId: targetEmployeeId, updatedAt: new Date().toISOString() } : l
          );
        }

        await AuditLog.create({
          employeeId: adminEmpId,
          employeeName: adminName,
          actionType: 'ASSIGN_LEADS',
          entityType: 'lead',
          details: `Dispatched daily batch of ${idsToUpdate.length} leads to ${telecallerName} (${targetEmployeeId})`,
        });
      }

      return NextResponse.json({ success: true, updatedCount: idsToUpdate.length });
    }

    // Mode 3: Distribute equally among telecallers
    if (
      mode === 'DISTRIBUTE_EQUALLY' &&
      Number(countPerTelecaller) > 0 &&
      Array.isArray(telecallerIds) &&
      telecallerIds.length > 0
    ) {
      const perUser = Math.min(100, Math.max(1, Number(countPerTelecaller)));
      const totalNeeded = perUser * telecallerIds.length;

      const unassignedDocs = await CallingLeadModel.find({
        $or: [
          { assignedEmployeeId: 'UNASSIGNED' },
          { assignedEmployeeId: '' },
          { assignedEmployeeId: null },
          { assignedEmployeeId: adminEmpId },
        ],
        status: 'NEW',
      })
        .sort({ createdAt: -1 })
        .limit(totalNeeded)
        .lean();

      let assignedTotal = 0;
      let currentIndex = 0;

      for (const tId of telecallerIds) {
        const slice = unassignedDocs.slice(currentIndex, currentIndex + perUser);
        const ids = slice.map((d: any) => d._id);
        if (ids.length > 0) {
          await CallingLeadModel.updateMany(
            { _id: { $in: ids } },
            { $set: { assignedEmployeeId: tId, updatedAt: new Date() } }
          );
          assignedTotal += ids.length;
        }
        currentIndex += perUser;
      }

      await AuditLog.create({
        employeeId: adminEmpId,
        employeeName: adminName,
        actionType: 'ASSIGN_LEADS',
        entityType: 'lead',
        details: `Distributed ${perUser} leads each among ${telecallerIds.length} telecallers (Total: ${assignedTotal} leads dispatched)`,
      });

      return NextResponse.json({ success: true, updatedCount: assignedTotal });
    }

    return NextResponse.json({ message: 'Invalid allocation parameters.' }, { status: 400 });
  } catch (err) {
    console.error('[API BATCH ASSIGN ERROR]:', err);
    return NextResponse.json({ message: 'Database error during lead allocation.' }, { status: 500 });
  }
}
