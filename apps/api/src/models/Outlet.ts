import mongoose, { Document, Schema } from 'mongoose';

export interface IOutletDoc extends Document {
  name: string;
  code: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

const outletSchema = new Schema<IOutletDoc>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export const Outlet = mongoose.model<IOutletDoc>('Outlet', outletSchema);
