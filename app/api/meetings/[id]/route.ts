import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb';
import MeetingModel from '@/models/Meeting';
import AuditLog from '@/models/AuditLog';
import { validateMeetingSlot } from '@/lib/meeting-utils';
import { Meeting } from '@/lib/types';

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

  let meeting = await MeetingModel.findById(params.id);
  if (!meeting) {
    return NextResponse.json({ message: 'Meeting not found' }, { status: 404 });
  }

  if (role !== 'ADMIN' && meeting.assignedEmployeeId !== loggedEmployeeId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as Partial<Meeting>;

  if ((body.date && body.date !== meeting.date) || (body.time && body.time !== meeting.time)) {
    const newDate = body.date ?? meeting.date;
    const newTime = body.time ?? meeting.time;

    const allMeetingsDocs = await MeetingModel.find({ _id: { $ne: meeting._id } }).lean();
    const allMeetings: Meeting[] = allMeetingsDocs.map((doc: any) => ({
      id: doc._id.toString(),
      date: doc.date,
      time: doc.time,
      clientName: doc.clientName,
      clientType: doc.clientType,
      phone: doc.phone,
      assignedEmployeeId: doc.assignedEmployeeId,
      status: doc.status,
      convertedToClient: doc.convertedToClient,
      createdAt: doc.createdAt?.toISOString?.() || '',
      updatedAt: doc.updatedAt?.toISOString?.() || '',
    }));

    const validation = validateMeetingSlot(allMeetings, newDate, newTime, meeting._id.toString());
    if (!validation.valid) {
      return NextResponse.json({ message: validation.message }, { status: 400 });
    }
  }

  // Role-based field assignment (Security Hardening)
  if (body.date) meeting.date = String(body.date).trim();
  if (body.time) meeting.time = String(body.time).trim();
  if (body.clientName) meeting.clientName = String(body.clientName).trim();
  if (body.clientType) meeting.clientType = body.clientType;
  if (body.phone) meeting.phone = String(body.phone).trim();
  if (body.businessAddress !== undefined) meeting.businessAddress = String(body.businessAddress).trim();
  if (body.mapsLink !== undefined) meeting.mapsLink = String(body.mapsLink).trim();
  if (body.notes !== undefined) meeting.notes = String(body.notes).trim();
  if (body.status) meeting.status = body.status;

  if (role === 'ADMIN') {
    if (body.assignedEmployeeId) meeting.assignedEmployeeId = body.assignedEmployeeId;
    if (body.convertedToClient !== undefined) meeting.convertedToClient = body.convertedToClient;
    if (body.dealAmount !== undefined) meeting.dealAmount = body.dealAmount;
    if (body.contractDuration !== undefined) meeting.contractDuration = body.contractDuration;
    if (body.acquisitionExpense !== undefined) meeting.acquisitionExpense = body.acquisitionExpense;
    if (body.nextFollowUp !== undefined) meeting.nextFollowUp = body.nextFollowUp;
  }

  await meeting.save();

  const updated: Meeting = {
    id: meeting._id.toString(),
    date: meeting.date,
    time: meeting.time,
    clientName: meeting.clientName,
    clientType: meeting.clientType,
    phone: meeting.phone,
    businessAddress: meeting.businessAddress || '',
    mapsLink: meeting.mapsLink || '',
    assignedEmployeeId: meeting.assignedEmployeeId,
    createdByEmployeeId: meeting.createdByEmployeeId,
    leadId: meeting.leadId,
    notes: meeting.notes || '',
    status: meeting.status,
    convertedToClient: meeting.convertedToClient,
    dealAmount: meeting.dealAmount,
    contractDuration: meeting.contractDuration,
    acquisitionExpense: meeting.acquisitionExpense,
    nextFollowUp: meeting.nextFollowUp,
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };

  try {
    await AuditLog.create({
      employeeId: loggedEmployeeId,
      employeeName: session.user.name ?? 'Staff',
      actionType: 'UPDATE_MEETING',
      entityType: 'meeting',
      entityId: updated.id,
      details: `Updated meeting details for ${updated.clientName} on ${updated.date} at ${updated.time}`,
    });
  } catch (e) {
    console.error('Audit log error:', e);
  }

  return NextResponse.json({ meeting: updated });
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
  const loggedEmployeeId = (session.user as any).employeeId;

  await connectToDatabase();

  const meeting = await MeetingModel.findById(params.id);
  if (!meeting) {
    return NextResponse.json({ message: 'Meeting not found' }, { status: 404 });
  }

  if (role !== 'ADMIN' && meeting.assignedEmployeeId !== loggedEmployeeId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  await MeetingModel.findByIdAndDelete(params.id);

  try {
    await AuditLog.create({
      employeeId: loggedEmployeeId,
      employeeName: session.user.name ?? 'Staff',
      actionType: 'CANCEL_MEETING',
      entityType: 'meeting',
      entityId: params.id,
      details: `Cancelled meeting with ${meeting.clientName} on ${meeting.date}`,
    });
  } catch (e) {
    console.error('Audit log error:', e);
  }

  return NextResponse.json({ success: true });
}
