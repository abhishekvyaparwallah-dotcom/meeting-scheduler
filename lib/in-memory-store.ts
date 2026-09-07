import { Meeting, CallingLead, ClientRecord, AppUser, AuditLog } from '@/lib/types';

interface MemoryStore {
  meetings: Meeting[];
  leads: CallingLead[];
  clients: ClientRecord[];
  users: AppUser[];
  auditLogs: AuditLog[];
}

declare global {
  // eslint-disable-next-line no-var
  var memoryStoreCache: MemoryStore | undefined;
}

const globalStore: MemoryStore = globalThis.memoryStoreCache || {
  meetings: [],
  leads: [],
  clients: [],
  auditLogs: [
    {
      id: 'LOG-1',
      employeeId: 'EMP-1001',
      employeeName: 'Vyapar Admin',
      actionType: 'SYSTEM_INIT',
      entityType: 'system',
      details: 'Meeting & Calling CRM System initialized successfully',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today',
    },
    {
      id: 'LOG-2',
      employeeId: 'EMP-1002',
      employeeName: 'Rohit Sharma',
      actionType: 'UPDATE_LEAD',
      entityType: 'lead',
      details: 'Called Dr. R. K. Verma Clinic • Disposition: Connected & Interested',
      createdAt: '10:15 AM, Today',
    },
    {
      id: 'LOG-3',
      employeeId: 'EMP-1003',
      employeeName: 'Neha Gupta',
      actionType: 'BOOK_MEETING',
      entityType: 'meeting',
      details: 'Confirmed demo meeting with Apex Public School for 01:00 PM',
      createdAt: '11:30 AM, Today',
    },
  ],
  users: [
    {
      id: 'EMP-1001',
      employeeId: 'EMP-1001',
      name: 'Vyapar Admin',
      email: 'admin@vyaparwallah.com',
      passwordHash: '',
      role: 'ADMIN',
      phone: '+91 98000 10001',
      active: true,
    },
  ],
};

if (!globalThis.memoryStoreCache) {
  globalThis.memoryStoreCache = globalStore;
}

export const memoryStore = globalStore;
