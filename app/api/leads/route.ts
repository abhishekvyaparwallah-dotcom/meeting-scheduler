import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb';
import CallingLeadModel from '@/models/CallingLead';
import AuditLog from '@/models/AuditLog';
import { CallingLead } from '@/lib/types';
import { memoryStore } from '@/lib/in-memory-store';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role;
  const loggedEmployeeId = (session.user as any).employeeId;

  try {
    await connectToDatabase();

    const query = role === 'ADMIN' ? {} : { assignedEmployeeId: loggedEmployeeId };
    const docs = await CallingLeadModel.find(query).sort({ createdAt: -1 }).lean();

    const leads: CallingLead[] = docs.map((doc: any) => ({
      id: doc._id.toString(),
      clientName: doc.clientName,
      institutionName: doc.institutionName || '',
      doctorName: doc.doctorName || '',
      clientType: doc.clientType,
      phone: doc.phone,
      city: doc.city || 'Indore',
      assignedEmployeeId: doc.assignedEmployeeId,
      status: doc.status || 'NEW',
      notes: doc.notes || '',
      callbackTime: doc.callbackTime,
      createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString(),
    }));

    return NextResponse.json({ leads });
  } catch (err) {
    console.warn('[API LEADS GET] Fallback to in-memory leads:', (err as Error).message);
    const filtered =
      role === 'ADMIN'
        ? memoryStore.leads
        : memoryStore.leads.filter((l) => l.assignedEmployeeId === loggedEmployeeId);
    return NextResponse.json({ leads: filtered });
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
    return NextResponse.json(
      { message: 'Only Admin can add/assign calling leads.' },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (parseErr) {
    return NextResponse.json({ message: 'Invalid JSON request payload.' }, { status: 400 });
  }

  const incomingLeads: Partial<CallingLead>[] = Array.isArray(body)
    ? body
    : body?.leads && Array.isArray(body.leads)
    ? body.leads
    : [body];

  const docsToInsert = incomingLeads
    .filter((item) => item && item.clientName && item.phone)
    .map((item) => ({
      clientName: item.clientName!.trim(),
      doctorName: item.doctorName?.trim() || '',
      clientType: item.clientType === 'School / Coaching' ? 'School / Coaching' : 'Clinic / Hospital',
      phone: item.phone!.toString().trim().replace(/[^\d+]/g, ''),
      city: item.city?.trim() || 'Indore',
      assignedEmployeeId: item.assignedEmployeeId?.trim() || loggedEmployeeId,
      status: item.status ?? 'NEW',
      notes: item.notes?.trim() || '',
      callbackTime: item.callbackTime,
    }));

  if (docsToInsert.length === 0) {
    return NextResponse.json(
      { message: 'No valid leads found in submission. Please ensure Client Name and Phone are provided.' },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
    const inserted = await CallingLeadModel.insertMany(docsToInsert);

    const newRecords: CallingLead[] = inserted.map((doc: any) => ({
      id: doc._id.toString(),
      clientName: doc.clientName,
      doctorName: doc.doctorName || '',
      clientType: doc.clientType,
      phone: doc.phone,
      city: doc.city,
      assignedEmployeeId: doc.assignedEmployeeId,
      status: doc.status,
      notes: doc.notes,
      callbackTime: doc.callbackTime,
      createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString(),
    }));

    try {
      await AuditLog.create({
        employeeId: loggedEmployeeId,
        employeeName: session.user.name ?? 'Admin',
        actionType: 'ASSIGN_LEADS',
        entityType: 'calling_lead',
        details: `Added and assigned ${newRecords.length} calling leads to telecalling team.`,
      });
    } catch (e) {
      console.warn('Audit log write skipped:', e);
    }

    return NextResponse.json(
      { success: true, count: newRecords.length, leads: newRecords },
      { status: 201 }
    );
  } catch (dbErr: any) {
    console.warn('[API LEADS POST] MongoDB unreachable or errored, using in-memory store fallback:', dbErr?.message || dbErr);

    const fallbackRecords: CallingLead[] = docsToInsert.map((item, index) => ({
      id: `LEAD-${Date.now()}-${index}`,
      clientName: item.clientName,
      doctorName: item.doctorName || '',
      clientType: item.clientType as any,
      phone: item.phone,
      city: item.city,
      assignedEmployeeId: item.assignedEmployeeId,
      status: item.status as any,
      notes: item.notes,
      callbackTime: item.callbackTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    memoryStore.leads.unshift(...fallbackRecords);

    return NextResponse.json(
      { success: true, count: fallbackRecords.length, leads: fallbackRecords, fallback: true },
      { status: 201 }
    );
  }
}
