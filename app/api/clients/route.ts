import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ClientRecordModel from '@/models/ClientRecord';
import MeetingModel from '@/models/Meeting';
import AuditLog from '@/models/AuditLog';
import { ClientRecord } from '@/lib/types';

import { memoryStore } from '@/lib/in-memory-store';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== 'ADMIN') {
    return NextResponse.json({ clients: [] });
  }

  try {
    await connectToDatabase();

    const docs = await ClientRecordModel.find().sort({ convertedAt: -1 }).lean();

    const clients: ClientRecord[] = docs.map((doc: any) => ({
      id: doc._id.toString(),
      meetingId: doc.meetingId,
      clientName: doc.clientName,
      clientType: doc.clientType,
      phone: doc.phone,
      businessAddress: doc.businessAddress || '',
      dealAmount: doc.dealAmount,
      contractDuration: doc.contractDuration,
      acquisitionExpense: doc.acquisitionExpense,
      nextFollowUp: doc.nextFollowUp,
      convertedAt: doc.convertedAt?.toISOString?.() || new Date().toISOString(),
    }));

    return NextResponse.json({ clients });
  } catch (err) {
    console.warn('[API CLIENTS] Fallback to in-memory clients:', (err as Error).message);
    return NextResponse.json({ clients: memoryStore.clients });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role;
  const loggedEmployeeId = (session.user as any).employeeId;

  if (role !== 'ADMIN') {
    return NextResponse.json({ message: 'Only Admin can convert clients and set deals.' }, { status: 403 });
  }

  const body = (await request.json()) as Partial<ClientRecord> & { meetingId?: string };

  if (
    !body.meetingId ||
    !body.clientName ||
    body.dealAmount == null ||
    !body.contractDuration ||
    body.acquisitionExpense == null ||
    !body.nextFollowUp
  ) {
    return NextResponse.json({ message: 'Missing required conversion fields.' }, { status: 400 });
  }

  await connectToDatabase();

  const meeting = await MeetingModel.findById(body.meetingId);
  if (!meeting) {
    return NextResponse.json({ message: 'Linked meeting not found.' }, { status: 404 });
  }

  if (role !== 'ADMIN' && meeting.assignedEmployeeId !== loggedEmployeeId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const newClientDoc = await ClientRecordModel.create({
    meetingId: body.meetingId,
    clientName: body.clientName,
    clientType: meeting.clientType,
    phone: body.phone ?? meeting.phone,
    businessAddress: body.businessAddress ?? meeting.businessAddress ?? '',
    dealAmount: Number(body.dealAmount),
    contractDuration: body.contractDuration,
    acquisitionExpense: Number(body.acquisitionExpense),
    nextFollowUp: body.nextFollowUp,
    convertedAt: new Date(),
  });

  // Update meeting record
  meeting.convertedToClient = true;
  meeting.dealAmount = newClientDoc.dealAmount;
  meeting.contractDuration = newClientDoc.contractDuration;
  meeting.acquisitionExpense = newClientDoc.acquisitionExpense;
  meeting.nextFollowUp = newClientDoc.nextFollowUp;
  await meeting.save();

  const client: ClientRecord = {
    id: newClientDoc._id.toString(),
    meetingId: newClientDoc.meetingId,
    clientName: newClientDoc.clientName,
    clientType: newClientDoc.clientType,
    phone: newClientDoc.phone,
    businessAddress: newClientDoc.businessAddress,
    dealAmount: newClientDoc.dealAmount,
    contractDuration: newClientDoc.contractDuration,
    acquisitionExpense: newClientDoc.acquisitionExpense,
    nextFollowUp: newClientDoc.nextFollowUp,
    convertedAt: newClientDoc.convertedAt.toISOString(),
  };

  try {
    await AuditLog.create({
      employeeId: loggedEmployeeId,
      employeeName: session.user.name ?? 'Staff',
      actionType: 'CONVERT_CLIENT',
      entityType: 'client',
      entityId: client.id,
      details: `Converted ${client.clientName} to client with deal ₹${client.dealAmount.toLocaleString('en-IN')}`,
    });
  } catch (e) {
    console.error('Audit log error:', e);
  }

  return NextResponse.json({ client }, { status: 201 });
}
