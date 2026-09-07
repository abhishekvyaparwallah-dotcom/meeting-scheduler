import bcrypt from 'bcryptjs';
import { AppUser, CallingLead, ClientRecord, Meeting } from '@/lib/types';

export const seedUsers: AppUser[] = [
  {
    id: 'user-admin',
    employeeId: 'EMP-1001',
    name: 'Avinash Jha',
    email: 'avinashjhacode@gmail.com',
    passwordHash: bcrypt.hashSync('Admin@111', 10),
    role: 'ADMIN',
    phone: '+91 98000 10001',
    active: true,
  },
  {
    id: 'user-telecaller-1',
    employeeId: 'EMP-1002',
    name: 'Rohit Sharma (Telecaller)',
    email: 'rohit@vyaparwallah.com',
    passwordHash: bcrypt.hashSync('Employee@123', 10),
    role: 'TELECALLER',
    phone: '+91 98000 10002',
    active: true,
  },
  {
    id: 'user-telecaller-2',
    employeeId: 'EMP-1003',
    name: 'Neha Gupta (Telecaller)',
    email: 'neha@vyaparwallah.com',
    passwordHash: bcrypt.hashSync('Employee@123', 10),
    role: 'TELECALLER',
    phone: '+91 98000 10003',
    active: true,
  },
];

// Clean fresh start - Example leads, meetings, and clients removed
export const seedLeads: CallingLead[] = [];

export const seedMeetings: Meeting[] = [];

export const seedClients: ClientRecord[] = [];
