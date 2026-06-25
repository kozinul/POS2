import mongoose, { Document, Schema } from 'mongoose';

export interface IUserDoc extends Document {
  userId: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'cashier';
  roleRef?: mongoose.Types.ObjectId;
  outlets: mongoose.Types.ObjectId[];
  defaultStartingCash: number;
}

const userSchema = new Schema<IUserDoc>(
  {
    userId: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'cashier'], default: 'cashier' },
    roleRef: { type: Schema.Types.ObjectId, ref: 'Role' },
    outlets: [{ type: Schema.Types.ObjectId, ref: 'Outlet' }],
    defaultStartingCash: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUserDoc>('User', userSchema);
