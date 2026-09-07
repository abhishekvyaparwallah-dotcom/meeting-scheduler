import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  employeeId: string;
  employeeName: string;
  actionType: string;
  entityType: string;
  entityId?: string;
  details: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true },
    actionType: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    details: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLogModel;
