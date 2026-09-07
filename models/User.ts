import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from '@/lib/types';

export interface IUser extends Document {
  employeeId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  customScript?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'TELECALLER'], default: 'TELECALLER' },
    phone: { type: String, default: '' },
    customScript: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Prevent mongoose model overwrite in dev mode
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
