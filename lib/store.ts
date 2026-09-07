import { randomUUID } from 'crypto';
import { AppUser, AuditLog, CallingLead, ClientRecord, Meeting } from '@/lib/types';
import { seedClients, seedLeads, seedMeetings, seedUsers } from '@/lib/mock-data';

type Store = {
  meetings: Meeting[];
  leads: CallingLead[];
  clients: ClientRecord[];
  users: AppUser[];
  auditLogs: AuditLog[];
};

declare global {
  // eslint-disable-next-line no-var
  var vyaparStore: Store | undefined;
}

function createStore(): Store {
  return {
    meetings: [...seedMeetings],
    leads: [...seedLeads],
    clients: [...seedClients],
    users: [...seedUsers],
    auditLogs: [],
  };
}

export function getStore(): Store {
  if (!globalThis.vyaparStore) {
    globalThis.vyaparStore = createStore();
  }
  return globalThis.vyaparStore;
}

export function getUserByEmail(email: string) {
  return getStore().users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function getUserByEmployeeId(employeeId: string) {
  return getStore().users.find((user) => user.employeeId === employeeId);
}

export function getActiveUsers() {
  return getStore().users.filter((user) => user.active);
}

export function addUser(user: Omit<AppUser, 'id'>) {
  const store = getStore();
  const record: AppUser = { id: randomUUID(), ...user };
  store.users = [record, ...store.users];
  return record;
}

export function removeUser(userId: string) {
  const store = getStore();
  const before = store.users.length;
  store.users = store.users.filter((user) => user.id !== userId);
  return store.users.length !== before;
}

export function pushAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>) {
  const store = getStore();
  const record: AuditLog = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  store.auditLogs = [record, ...store.auditLogs];
  return record;
}
