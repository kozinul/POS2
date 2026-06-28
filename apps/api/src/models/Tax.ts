import mongoose, { Document, Schema } from 'mongoose';

export interface IDppFraction {
  numerator: number;
  denominator: number;
}

export interface ITaxDoc extends Document {
  name: string;
  code: string;
  description?: string;
  rate: number;
  rateType: 'percentage' | 'nominal';
  taxType: 'vat' | 'withholding' | 'service_charge' | 'other';
  dppFormula: {
    type: 'full' | 'fraction';
    fraction?: IDppFraction;
  };
  rounding: 'math' | 'floor' | 'ceil';
  roundingPrecision: number;
  scope: 'all' | 'category' | 'product' | 'transaction_type';
  categoryIds: mongoose.Types.ObjectId[];
  productIds: mongoose.Types.ObjectId[];
  transactionTypes: string[];
  includedByDefault: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  priority: number;
  outlets: mongoose.Types.ObjectId[];
  exemptUpTo: number;
  active: boolean;
  createdAt: Date;
}

const taxSchema = new Schema<ITaxDoc>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: String,
    rate: { type: Number, required: true },
    rateType: { type: String, enum: ['percentage', 'nominal'], default: 'percentage' },
    taxType: { type: String, enum: ['vat', 'withholding', 'service_charge', 'other'], default: 'vat' },
    dppFormula: {
      type: { type: String, enum: ['full', 'fraction'], default: 'full' },
      fraction: {
        numerator: { type: Number, default: 11 },
        denominator: { type: Number, default: 12 },
      },
    },
    rounding: { type: String, enum: ['math', 'floor', 'ceil'], default: 'math' },
    roundingPrecision: { type: Number, default: 0 },
    scope: { type: String, enum: ['all', 'category', 'product', 'transaction_type'], default: 'all' },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    transactionTypes: [{ type: String, enum: ['dine_in', 'takeaway', 'delivery', 'online'] }],
    includedByDefault: { type: Boolean, default: true },
    effectiveFrom: Date,
    effectiveTo: Date,
    priority: { type: Number, default: 0 },
    outlets: [{ type: Schema.Types.ObjectId, ref: 'Outlet' }],
    exemptUpTo: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Tax = mongoose.model<ITaxDoc>('Tax', taxSchema);
