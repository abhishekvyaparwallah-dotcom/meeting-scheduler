import mongoose, { Schema, Document, Model } from 'mongoose';
import { CallDisposition, ClientType } from '@/lib/types';

export interface ICallingLead extends Document {
  clientName: string;
  doctorName?: string;
  clientType: ClientType;
  phone: string;
  city: string;
  assignedEmployeeId: string;
  status: CallDisposition;
  notes?: string;
  callbackTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CallingLeadSchema = new Schema<ICallingLead>(
  {
    clientName: { type: String, required: true, trim: true },
    doctorName: { type: String, default: '', trim: true },
    clientType: {
      type: String,
      enum: ['School / Coaching', 'Clinic / Hospital'],
      default: 'Clinic / Hospital',
      required: true,
    },
    phone: { type: String, required: true, trim: true, index: true },
    city: { type: String, default: 'Indore', trim: true },
    assignedEmployeeId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['NEW', 'CONNECTED', 'CALLBACK', 'MEETING_BOOKED', 'BUSY', 'CALL_CUT', 'NOT_INTERESTED'],
      default: 'NEW',
      index: true,
    },
    notes: { type: String, default: '' },
    callbackTime: { type: String },
  },
  { timestamps: true }
);

const CallingLead: Model<ICallingLead> =
  mongoose.models.CallingLead || mongoose.model<ICallingLead>('CallingLead', CallingLeadSchema);

export default CallingLead;
