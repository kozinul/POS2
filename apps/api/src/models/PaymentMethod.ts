import mongoose, { Document, Schema } from 'mongoose';

export interface IRoundingPolicy {
  enabled: boolean;
  method: 'nearest_100' | 'nearest_500' | 'nearest_1000' | 'round_up_100' | 'round_down_100' | 'no_rounding';
  maxRoundingAdjustment: number;
}

export interface IPaymentMethodDoc extends Document {
  name: string;
  code: string;
  type: 'cash' | 'non-cash';
  requiresCardLastFour: boolean;
  description?: string;
  roundingPolicy: IRoundingPolicy;
  active: boolean;
  outlets: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const roundingPolicySchema = new Schema<IRoundingPolicy>(
  {
    enabled: { type: Boolean, default: false },
    method: {
      type: String,
      enum: ['nearest_100', 'nearest_500', 'nearest_1000', 'round_up_100', 'round_down_100', 'no_rounding'],
      default: 'no_rounding',
    },
    maxRoundingAdjustment: { type: Number, default: 0 },
  },
  { _id: false }
);

const paymentMethodSchema = new Schema<IPaymentMethodDoc>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: ['cash', 'non-cash'], required: true },
    requiresCardLastFour: { type: Boolean, default: false },
    description: String,
    roundingPolicy: { type: roundingPolicySchema, default: () => ({ enabled: false, method: 'no_rounding', maxRoundingAdjustment: 0 }) },
    active: { type: Boolean, default: true },
    outlets: [{ type: Schema.Types.ObjectId, ref: 'Outlet' }],
  },
  { timestamps: true }
);

export const PaymentMethod = mongoose.model<IPaymentMethodDoc>('PaymentMethod', paymentMethodSchema);
