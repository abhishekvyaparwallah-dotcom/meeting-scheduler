import mongoose, { Schema, Document, Model } from 'mongoose';
import { ClientType } from '@/lib/types';

export interface IClientRecord extends Document {
  meetingId: string;
  clientName: string;
  clientType: ClientType;
  phone: string;
  businessAddress?: string;
  dealAmount: number;
  contractDuration: string;
  acquisitionExpense: number;
  nextFollowUp: string;
  convertedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ClientRecordSchema = new Schema<IClientRecord>(
  {
    meetingId: { type: String, required: true, index: true },
    clientName: { type: String, required: true, trim: true },
    clientType: {
      type: String,
      enum: ['School / Coaching', 'Clinic / Hospital'],
      default: 'Clinic / Hospital',
    },
    phone: { type: String, required: true, trim: true },
    businessAddress: { type: String, default: '' },
    dealAmount: { type: Number, required: true, default: 0 },
    contractDuration: { type: String, required: true },
    acquisitionExpense: { type: Number, required: true, default: 0 },
    nextFollowUp: { type: String, required: true },
    convertedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ClientRecordModel: Model<IClientRecord> =
  mongoose.models.ClientRecord || mongoose.model<IClientRecord>('ClientRecord', ClientRecordSchema);

export default ClientRecordModel;
