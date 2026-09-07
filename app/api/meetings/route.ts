import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb';
import MeetingModel from '@/models/Meeting';
import CallingLead from '@/models/CallingLead';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { sendFast2SMSMessage, sendFast2SMSWhatsAppTemplate } from '@/utils/fast2sms';
import { formatTime12h, validateMeetingSlot } from '@/lib/meeting-utils';
import { sendAdminMeetingNotification } from '@/lib/email-service';
import { Meeting } from '@/lib/types';

import { memoryStore } from '@/lib/in-memory-store';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role;
  const employeeId = (session.user as any).employeeId;

  try {
    await connectToDatabase();

    const query = role === 'ADMIN' ? {} : { assignedEmployeeId: employeeId };
    const docs = await MeetingModel.find(query).sort({ date: 1, time: 1 }).lean();

    const meetings: Meeting[] = docs.map((doc: any) => ({
      id: doc._id.toString(),
      date: doc.date,
      time: doc.time,
      clientName: doc.clientName,
      clientType: doc.clientType,
      phone: doc.phone,
      businessAddress: doc.businessAddress || '',
      mapsLink: doc.mapsLink || '',
      assignedEmployeeId: doc.assignedEmployeeId,
      createdByEmployeeId: doc.createdByEmployeeId,
      leadId: doc.leadId,
      notes: doc.notes || '',
      status: doc.status || 'scheduled',
      convertedToClient: doc.convertedToClient || false,
      dealAmount: doc.dealAmount,
      contractDuration: doc.contractDuration,
      acquisitionExpense: doc.acquisitionExpense,
      nextFollowUp: doc.nextFollowUp,
      createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString(),
    }));

    return NextResponse.json({ meetings });
  } catch (err) {
    console.warn('[API MEETINGS] Fallback to in-memory store:', (err as Error).message);
    const filtered =
      role === 'ADMIN'
        ? memoryStore.meetings
        : memoryStore.meetings.filter((m) => m.assignedEmployeeId === employeeId);
    return NextResponse.json({ meetings: filtered });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role;
  const loggedEmployeeId = (session.user as any).employeeId;
  const body = (await request.json()) as Partial<Meeting>;

  if (!body.date || !body.time || !body.clientName || !body.phone) {
    return NextResponse.json(
      { message: 'Missing required fields: Date, Time, Client Name, and Phone Number.' },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const targetEmployeeId =
    role === 'ADMIN' ? body.assignedEmployeeId ?? loggedEmployeeId : loggedEmployeeId;

  let meeting: Meeting;

  try {
    await connectToDatabase();

    // Validate slot conflicts against all existing active meetings in DB
    const existingDocs = await MeetingModel.find({ status: { $ne: 'cancelled' } }).lean();
    const existingMeetings: Meeting[] = existingDocs.map((doc: any) => ({
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

    const validation = validateMeetingSlot(existingMeetings, body.date, body.time);
    if (!validation.valid) {
      return NextResponse.json({ message: validation.message }, { status: 400 });
    }

    const newMeetingDoc = await MeetingModel.create({
      date: body.date,
      time: body.time,
      clientName: body.clientName,
      clientType: body.clientType ?? 'Clinic / Hospital',
      phone: body.phone,
      businessAddress: body.businessAddress ?? '',
      mapsLink: body.mapsLink ?? '',
      assignedEmployeeId: targetEmployeeId,
      createdByEmployeeId: loggedEmployeeId,
      leadId: body.leadId,
      notes: body.notes ?? '',
      status: body.status ?? 'scheduled',
      convertedToClient: body.convertedToClient ?? false,
      dealAmount: body.dealAmount,
      contractDuration: body.contractDuration,
      acquisitionExpense: body.acquisitionExpense,
      nextFollowUp: body.nextFollowUp,
    });

    meeting = {
      id: newMeetingDoc._id.toString(),
      date: newMeetingDoc.date,
      time: newMeetingDoc.time,
      clientName: newMeetingDoc.clientName,
      clientType: newMeetingDoc.clientType,
      phone: newMeetingDoc.phone,
      businessAddress: newMeetingDoc.businessAddress || '',
      mapsLink: newMeetingDoc.mapsLink || '',
      assignedEmployeeId: newMeetingDoc.assignedEmployeeId,
      createdByEmployeeId: newMeetingDoc.createdByEmployeeId,
      leadId: newMeetingDoc.leadId,
      notes: newMeetingDoc.notes || '',
      status: newMeetingDoc.status,
      convertedToClient: newMeetingDoc.convertedToClient,
      dealAmount: newMeetingDoc.dealAmount,
      contractDuration: newMeetingDoc.contractDuration,
      acquisitionExpense: newMeetingDoc.acquisitionExpense,
      nextFollowUp: newMeetingDoc.nextFollowUp,
      createdAt: newMeetingDoc.createdAt.toISOString(),
      updatedAt: newMeetingDoc.updatedAt.toISOString(),
    };

    if (body.leadId) {
      try {
        await CallingLead.findByIdAndUpdate(body.leadId, {
          status: 'MEETING_BOOKED',
          updatedAt: new Date(),
        });
      } catch (e) {
        console.error('Failed to update linked lead status:', e);
      }
    }

    try {
      await AuditLog.create({
        employeeId: loggedEmployeeId,
        employeeName: session.user.name ?? 'Staff',
        actionType: 'CREATE_MEETING',
        entityType: 'meeting',
        entityId: meeting.id,
        details: `Booked meeting with ${meeting.clientName} (${meeting.clientType}) on ${meeting.date} at ${formatTime12h(meeting.time)}`,
      });
    } catch (e) {
      console.error('Failed to save audit log:', e);
    }
  } catch (dbErr) {
    console.warn('[API MEETINGS POST] DB error, using fallback in-memory store:', (dbErr as Error).message);

    const validation = validateMeetingSlot(memoryStore.meetings, body.date, body.time);
    if (!validation.valid) {
      return NextResponse.json({ message: validation.message }, { status: 400 });
    }

    meeting = {
      id: `MEET-${Date.now()}`,
      date: body.date,
      time: body.time,
      clientName: body.clientName,
      clientType: body.clientType ?? 'Clinic / Hospital',
      phone: body.phone,
      businessAddress: body.businessAddress || '',
      mapsLink: body.mapsLink || '',
      assignedEmployeeId: targetEmployeeId,
      createdByEmployeeId: loggedEmployeeId,
      leadId: body.leadId,
      notes: body.notes || '',
      status: body.status ?? 'scheduled',
      convertedToClient: body.convertedToClient ?? false,
      dealAmount: body.dealAmount,
      contractDuration: body.contractDuration,
      acquisitionExpense: body.acquisitionExpense,
      nextFollowUp: body.nextFollowUp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryStore.meetings.unshift(meeting);
    if (body.leadId) {
      const targetLead = memoryStore.leads.find((l) => l.id === body.leadId);
      if (targetLead) {
        targetLead.status = 'MEETING_BOOKED';
        targetLead.updatedAt = new Date().toISOString();
      }
    }
  }

  // Get assigned user phone for SMS
  const assignee = await User.findOne({ employeeId: targetEmployeeId });
  const notificationTargets = [meeting.phone, assignee?.phone].filter(Boolean) as string[];

  const timeFormatted = formatTime12h(meeting.time);

  // 1. Send Fast2SMS WhatsApp Template to Client & Assignee
  await sendFast2SMSWhatsAppTemplate({
    numbers: notificationTargets,
    clientName: meeting.clientName,
    date: meeting.date,
    time: timeFormatted,
    repName: 'Abhishek Kumar',
    notes: meeting.notes,
  });

  // 2. Send SMS fallback / confirmation via Fast2SMS
  await sendFast2SMSMessage({
    numbers: notificationTargets,
    message: `Vyapar Wallah: Meeting confirmed with ${meeting.clientName} on ${meeting.date} at ${timeFormatted}.${meeting.mapsLink ? ` Maps: ${meeting.mapsLink}` : ''}`,
    route: 'q',
  });

  // 3. Send Real-time Email Notification to Admin
  await sendAdminMeetingNotification({
    meeting,
    bookedByName: session.user.name ?? 'Staff',
    bookedByRole: role,
  });

  return NextResponse.json({ meeting }, { status: 201 });
}
