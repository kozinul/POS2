import mongoose, { Document, Schema } from 'mongoose';

const TIERS = ['regular', 'silver', 'gold', 'platinum'] as const;
export type MemberTier = typeof TIERS[number];

export interface IMemberDoc extends Document {
  name: string;
  phone: string;
  email?: string;
  tier: MemberTier;
  totalOrders: number;
  totalSpend: number;
  notes?: string;
  createdAt: Date;
}

const memberSchema = new Schema<IMemberDoc>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, lowercase: true },
    tier: { type: String, enum: TIERS, default: 'regular' },
    totalOrders: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    notes: String,
  },
  { timestamps: true }
);

memberSchema.index({ name: 'text', phone: 'text' });

export const Member = mongoose.model<IMemberDoc>('Member', memberSchema);
