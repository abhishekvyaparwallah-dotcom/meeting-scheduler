import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb';
import CallingLeadModel from '@/models/CallingLead';
import AuditLog from '@/models/AuditLog';
import { CallingLead } from '@/lib/types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role;
  const loggedEmployeeId = (session.user as any).employeeId;

  await connectToDatabase();

  const lead = await CallingLeadModel.findById(params.id);
  if (!lead) {
    return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
  }

  if (role !== 'ADMIN' && lead.assignedEmployeeId !== loggedEmployeeId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as Partial<CallingLead>;

  // Role-based field assignment (Security Hardening)
  if (body.status) lead.status = body.status;
  if (body.notes !== undefined) lead.notes = String(body.notes).trim();
  if (body.callbackTime !== undefined) lead.callbackTime = String(body.callbackTime).trim();
  if (body.doctorName !== undefined) lead.doctorName = String(body.doctorName).trim();

  if (role === 'ADMIN') {
    if (body.clientName) lead.clientName = String(body.clientName).trim();
    if (body.clientType) lead.clientType = body.clientType;
    if (body.phone) lead.phone = String(body.phone).trim();
    if (body.city !== undefined) lead.city = String(body.city).trim();
    if (body.assignedEmployeeId !== undefined) lead.assignedEmployeeId = body.assignedEmployeeId;
  }

  await lead.save();

  const updated: CallingLead = {
    id: lead._id.toString(),
    clientName: lead.clientName,
    institutionName: lead.institutionName || '',
    doctorName: lead.doctorName || '',
    clientType: lead.clientType,
    phone: lead.phone,
    city: lead.city,
    assignedEmployeeId: lead.assignedEmployeeId,
    status: lead.status,
    notes: lead.notes,
    callbackTime: lead.callbackTime,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };

  try {
    await AuditLog.create({
      employeeId: loggedEmployeeId,
      employeeName: session.user.name ?? 'Staff',
      actionType: 'UPDATE_LEAD_STATUS',
      entityType: 'calling_lead',
      entityId: updated.id,
      details: `Updated call status for ${updated.clientName} to [${updated.status}]. Note: ${updated.notes || 'None'}`,
    });
  } catch (e) {
    console.error('Audit log error:', e);
  }

  return NextResponse.json({ lead: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== 'ADMIN') {
    return NextResponse.json({ message: 'Only Admin can remove leads.' }, { status: 403 });
  }

  await connectToDatabase();
  await CallingLeadModel.findByIdAndDelete(params.id);

  return NextResponse.json({ success: true });
}
