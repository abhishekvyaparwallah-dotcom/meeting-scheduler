import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOtpToken extends Document {
  email: string;
  otpHash: string;
  challengeId: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const OtpTokenSchema = new Schema<IOtpToken>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    challengeId: { type: String, required: true, unique: true, index: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, expires: 300 }, // MongoDB TTL: deletes document 5 mins after expiresAt
  },
  { timestamps: true }
);

const OtpToken: Model<IOtpToken> =
  mongoose.models.OtpToken || mongoose.model<IOtpToken>('OtpToken', OtpTokenSchema);

export default OtpToken;
