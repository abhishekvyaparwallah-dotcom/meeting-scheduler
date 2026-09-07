export type UserRole = 'ADMIN' | 'TELECALLER';

export type ClientType =
  | 'School / Coaching'
  | 'Clinic / Hospital';

export type CallDisposition =
  | 'NEW'
  | 'CONNECTED'
  | 'BUSY'
  | 'CALL_CUT'
  | 'CALLBACK'
  | 'NOT_INTERESTED'
  | 'MEETING_BOOKED';

export type AppUser = {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  customScript?: string;
  active: boolean;
};

export type CallingLead = {
  id: string;
  clientName: string;
  clientType: ClientType;
  phone: string;
  city: string;
  assignedEmployeeId: string;
  status: CallDisposition;
  callbackTime?: string;
  notes?: string;
  updatedAt: string;
  createdAt: string;
};

export type Meeting = {
  id: string;
  date: string;
  time: string;
  clientName: string;
  clientType: ClientType;
  phone: string;
  businessAddress?: string;
  mapsLink?: string;
  assignedEmployeeId: string;
  createdByEmployeeId?: string;
  leadId?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  convertedToClient?: boolean;
  dealAmount?: number;
  contractDuration?: string;
  acquisitionExpense?: number;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientRecord = {
  id: string;
  meetingId: string;
  clientName: string;
  clientType?: ClientType;
  phone: string;
  businessAddress?: string;
  dealAmount: number;
  contractDuration: string;
  acquisitionExpense: number;
  nextFollowUp: string;
  convertedAt: string;
};

export type AuditLog = {
  id: string;
  employeeId: string;
  employeeName: string;
  actionType:
    | 'CREATE_MEETING'
    | 'UPDATE_MEETING'
    | 'CANCEL_MEETING'
    | 'BOOK_MEETING'
    | 'UPDATE_LEAD_STATUS'
    | 'UPDATE_LEAD'
    | 'ASSIGN_LEADS'
    | 'CONVERT_CLIENT'
    | 'CREATE_USER'
    | 'DELETE_USER'
    | 'UPDATE_PASSWORD'
    | 'SYSTEM_INIT'
    | 'LOGIN'
    | (string & {});
  entityType: string;
  entityId?: string;
  details: string;
  createdAt: string;
};

export type DateSlotInfo = {
  date: string;
  isPast: boolean;
  isTuesday: boolean;
  maxMeetings: number;
  bookedCount: number;
  remainingSlots: number;
  status: 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'PAST';
  meetings: Meeting[];
};
