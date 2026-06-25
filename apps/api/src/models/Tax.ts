import mongoose, { Document, Schema } from 'mongoose';

export interface ITaxDoc extends Document {
  name: string;
  rate: number;
  description?: string;
  active: boolean;
  outlets: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const taxSchema = new Schema<ITaxDoc>(
  {
    name: { type: String, required: true },
    rate: { type: Number, required: true },
    description: String,
    active: { type: Boolean, default: true },
    outlets: [{ type: Schema.Types.ObjectId, ref: 'Outlet' }],
  },
  { timestamps: true }
);

export const Tax = mongoose.model<ITaxDoc>('Tax', taxSchema);
