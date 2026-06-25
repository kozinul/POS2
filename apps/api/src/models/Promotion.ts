import mongoose, { Document, Schema } from 'mongoose';

export interface IRuleCondition {
  scope?: string;
  targetIds?: string[];
  value?: number;
  unit?: string;
  minQty?: number;
  maxQty?: number;
  buyQty?: number;
  freeQty?: number;
  payQty?: number;
  minAmount?: number;
  every?: number;
  nth?: number;
  maxBonus?: number;
  giftProductId?: string;
  giftQty?: number;
  price?: number;
  tier?: string;
  tiers?: string[];
  paymentMethodIds?: string[];
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  items?: { productId: string; qty: number }[];
  bundlePrice?: number;
  operator?: string;
  field?: string;
}

export interface IRule {
  type: string;
  label?: string;
  conditions: IRuleCondition;
}

export interface IPromotionDoc extends Document {
  name: string;
  code: string;
  description?: string;
  outlets: mongoose.Types.ObjectId[];
  customerTiers: string[];
  paymentMethodIds: mongoose.Types.ObjectId[];
  priority: number;
  exclusive: boolean;
  stackable: boolean;
  rules: IRule[];
  ruleLogic: 'AND' | 'OR';
  usageLimit: { perPromotion: number; perCustomer: number };
  usedCount: number;
  minCartValue: number;
  startDate?: Date;
  endDate?: Date;
  active: boolean;
  requiresCode: boolean;
  createdAt: Date;
}

const ruleConditionSchema = new Schema<IRuleCondition>(
  {
    scope: String,
    targetIds: [String],
    value: Schema.Types.Mixed,
    unit: String,
    minQty: Number,
    maxQty: Number,
    buyQty: Number,
    freeQty: Number,
    payQty: Number,
    minAmount: Number,
    every: Number,
    nth: Number,
    maxBonus: Number,
    giftProductId: String,
    giftQty: Number,
    price: Number,
    tier: String,
    tiers: [String],
    paymentMethodIds: [String],
    daysOfWeek: [Number],
    startTime: String,
    endTime: String,
    items: [{ productId: String, qty: Number }],
    bundlePrice: Number,
    operator: String,
    field: String,
  },
  { _id: false }
);

const ruleSchema = new Schema<IRule>(
  {
    type: { type: String, required: true },
    label: String,
    conditions: { type: ruleConditionSchema, required: true },
  },
  { _id: false }
);

const promotionSchema = new Schema<IPromotionDoc>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: String,
    outlets: [{ type: Schema.Types.ObjectId, ref: 'Outlet' }],
    customerTiers: [String],
    paymentMethodIds: [{ type: Schema.Types.ObjectId, ref: 'PaymentMethod' }],
    priority: { type: Number, default: 10 },
    exclusive: { type: Boolean, default: false },
    stackable: { type: Boolean, default: true },
    rules: [ruleSchema],
    ruleLogic: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    usageLimit: {
      perPromotion: { type: Number, default: 0 },
      perCustomer: { type: Number, default: 0 },
    },
    usedCount: { type: Number, default: 0 },
    minCartValue: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    active: { type: Boolean, default: true },
    requiresCode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Promotion = mongoose.model<IPromotionDoc>('Promotion', promotionSchema);
