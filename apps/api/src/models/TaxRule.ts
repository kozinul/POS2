import mongoose, { Document, Schema } from 'mongoose';

export interface ITaxRuleCondition {
  applicableFrom?: Date;
  applicableTo?: Date;
  minTransactionValue?: number;
  maxTransactionValue?: number;
  outletIds: mongoose.Types.ObjectId[];
  categoryIds: mongoose.Types.ObjectId[];
  productIds: mongoose.Types.ObjectId[];
  transactionTypes: string[];
  customerTiers: string[];
}

export interface ITaxRuleAction {
  rateOverride?: number;
  dppFractionOverride?: { numerator: number; denominator: number };
  roundingOverride?: 'math' | 'floor' | 'ceil';
  statusOverride?: 'active' | 'inactive';
  includedOverride?: boolean;
}

export interface ITaxRuleDoc extends Document {
  name: string;
  description?: string;
  taxCode: string;
  regulationReference?: string;
  conditions: ITaxRuleCondition;
  actions: ITaxRuleAction;
  priority: number;
  active: boolean;
  createdAt: Date;
}

const taxRuleSchema = new Schema<ITaxRuleDoc>(
  {
    name: { type: String, required: true },
    description: String,
    taxCode: { type: String, required: true },
    regulationReference: String,
    conditions: {
      applicableFrom: Date,
      applicableTo: Date,
      minTransactionValue: Number,
      maxTransactionValue: Number,
      outletIds: [{ type: Schema.Types.ObjectId, ref: 'Outlet' }],
      categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
      productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
      transactionTypes: [String],
      customerTiers: [String],
    },
    actions: {
      rateOverride: Number,
      dppFractionOverride: {
        numerator: Number,
        denominator: Number,
      },
      roundingOverride: { type: String, enum: ['math', 'floor', 'ceil'] },
      statusOverride: { type: String, enum: ['active', 'inactive'] },
      includedOverride: Boolean,
    },
    priority: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const TaxRule = mongoose.model<ITaxRuleDoc>('TaxRule', taxRuleSchema);
