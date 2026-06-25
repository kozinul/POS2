import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPaymentBreakdown {
  method: string;
  code: string;
  total: number;
}

export interface ICashPickup {
  _id?: Types.ObjectId;
  amount: number;
  reason: string;
  pickedAt: Date;
  pickedBy: Types.ObjectId;
  pickedByName?: string;
}

export interface IClosingDoc extends Document {
  outlet: Types.ObjectId;
  cashier: Types.ObjectId;
  openedAt: Date;
  closedAt?: Date;
  startingCash: number;
  physicalCash: number;
  expectedCash: number;
  totalCashPickups: number;
  difference: number;
  totalSales: number;
  cashSales: number;
  nonCashSales: number;
  totalTransactions: number;
  paymentBreakdown: IPaymentBreakdown[];
  cashPickups: ICashPickup[];
  status: 'open' | 'closed';
}

const cashPickupSchema = new Schema<ICashPickup>(
  {
    amount: { type: Number, required: true },
    reason: { type: String, default: '' },
    pickedAt: { type: Date, default: Date.now },
    pickedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pickedByName: String,
  },
  { _id: true }
);

const closingSchema = new Schema<IClosingDoc>(
  {
    outlet: { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    openedAt: { type: Date, default: Date.now },
    closedAt: Date,
    startingCash: { type: Number, default: 0 },
    physicalCash: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    totalCashPickups: { type: Number, default: 0 },
    difference: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    cashSales: { type: Number, default: 0 },
    nonCashSales: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    paymentBreakdown: [{ method: String, code: String, total: Number }],
    cashPickups: [cashPickupSchema],
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  { timestamps: true }
);

export const Closing = mongoose.model<IClosingDoc>('Closing', closingSchema);
