import mongoose, { Schema, Document, Model } from 'mongoose';
import { ClientType } from '@/lib/types';

export interface IMeeting extends Document {
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
  convertedToClient: boolean;
  dealAmount?: number;
  contractDuration?: string;
  acquisitionExpense?: number;
  nextFollowUp?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },
    clientName: { type: String, required: true, trim: true },
    clientType: {
      type: String,
      enum: ['School / Coaching', 'Clinic / Hospital'],
      default: 'Clinic / Hospital',
      required: true,
    },
    phone: { type: String, required: true, trim: true, index: true },
    businessAddress: { type: String, default: '' },
    mapsLink: { type: String, default: '' },
    assignedEmployeeId: { type: String, required: true, index: true },
    createdByEmployeeId: { type: String },
    leadId: { type: String },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    convertedToClient: { type: Boolean, default: false },
    dealAmount: { type: Number },
    contractDuration: { type: String },
    acquisitionExpense: { type: Number },
    nextFollowUp: { type: String },
  },
  { timestamps: true }
);

// Compound index on date and time for fast slot clash checks
MeetingSchema.index({ date: 1, time: 1 });

const MeetingModel: Model<IMeeting> =
  mongoose.models.Meeting || mongoose.model<IMeeting>('Meeting', MeetingSchema);

export default MeetingModel;
