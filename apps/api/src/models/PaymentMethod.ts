import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentMethodDoc extends Document {
  name: string;
  code: string;
  type: 'cash' | 'non-cash';
  requiresCardLastFour: boolean;
  description?: string;
  active: boolean;
  outlets: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const paymentMethodSchema = new Schema<IPaymentMethodDoc>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: ['cash', 'non-cash'], required: true },
    requiresCardLastFour: { type: Boolean, default: false },
    description: String,
    active: { type: Boolean, default: true },
    outlets: [{ type: Schema.Types.ObjectId, ref: 'Outlet' }],
  },
  { timestamps: true }
);

export const PaymentMethod = mongoose.model<IPaymentMethodDoc>('PaymentMethod', paymentMethodSchema);
