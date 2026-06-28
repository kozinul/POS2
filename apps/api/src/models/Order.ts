import mongoose, { Document, Schema } from 'mongoose';

interface IPerItemTaxDetail {
  productId: mongoose.Types.ObjectId;
  productName?: string;
  dpp: number;
  taxAmount: number;
}

interface ITaxDetail {
  taxId: mongoose.Types.ObjectId;
  taxCode: string;
  name: string;
  rate: number;
  effectiveRate: number;
  dppType: string;
  dppFraction?: { numerator: number; denominator: number };
  dppAmount: number;
  taxableAmount: number;
  amount: number;
  amountRounded: number;
  included: boolean;
  rounding: string;
  roundingPrecision: number;
  perItem: IPerItemTaxDetail[];
}

interface IPromotionBreakdown {
  name: string;
  code: string;
  discount: number;
  freeItems?: { productId: string; qty: number }[];
}

interface IOrderItemModifier {
  name: string;
  price: number;
}

interface IOrderItem {
  product: mongoose.Types.ObjectId;
  qty: number;
  price: number;
  subtotal: number;
  modifiers?: IOrderItemModifier[];
}

interface IVoidedItem {
  itemId: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  productName?: string;
  qty: number;
  price: number;
  reason?: string;
  voidedAt: Date;
  voidedBy: mongoose.Types.ObjectId;
  voidedByName?: string;
}

interface IPaymentBreakdownEntry {
  paymentMethodId: mongoose.Types.ObjectId;
  paymentMethodCode: string;
  paymentMethodName: string;
  amount: number;
  roundedAmount: number;
  type: 'cash' | 'non-cash';
}

export interface IOrderDoc extends Document {
  orderNumber?: string;
  items: IOrderItem[];
  total: number;
  originalTotal: number;
  roundedPayable: number;
  roundingAdjustment: number;
  roundingMethod: string;
  subtotal?: number;
  discountTotal?: number;
  dppTotal?: number;
  taxTotal?: number;
  taxDetails?: ITaxDetail[];
  serviceCharge?: number;
  serviceChargeRate?: number;
  promotions?: IPromotionBreakdown[];
  paymentMethod: mongoose.Types.ObjectId;
  paymentMethodCode?: string;
  paymentMethodName?: string;
  paymentBreakdown: IPaymentBreakdownEntry[];
  cashAmount?: number;
  change?: number;
  cardLastFour?: string;
  cashier: mongoose.Types.ObjectId;
  cashierName?: string;
  outlet?: mongoose.Types.ObjectId;
  outletName?: string;
  member?: mongoose.Types.ObjectId;
  memberName?: string;
  memberTier?: string;
  tableNumber?: string;
  customerName?: string;
  transactionType?: string;
  splitGroup?: string;
  splitIndex?: number;
  status: 'completed' | 'voided' | 'partially-voided' | 'open';
  voidedItems?: IVoidedItem[];
  voidedAt?: Date;
  voidedBy?: mongoose.Types.ObjectId;
  voidedByName?: string;
  voidReason?: string;
  createdAt: Date;
}

const perItemTaxDetailSchema = new Schema<IPerItemTaxDetail>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    dpp: Number,
    taxAmount: Number,
  },
  { _id: false }
);

const taxDetailSchema = new Schema<ITaxDetail>(
  {
    taxId: { type: Schema.Types.ObjectId, ref: 'Tax' },
    taxCode: String,
    name: String,
    rate: Number,
    effectiveRate: Number,
    dppType: String,
    dppFraction: {
      numerator: Number,
      denominator: Number,
    },
    dppAmount: Number,
    taxableAmount: Number,
    amount: Number,
    amountRounded: Number,
    included: Boolean,
    rounding: String,
    roundingPrecision: Number,
    perItem: [perItemTaxDetailSchema],
  },
  { _id: false }
);

const orderItemModifierSchema = new Schema<IOrderItemModifier>(
  {
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    modifiers: [orderItemModifierSchema],
  },
  { _id: true }
);

const voidedItemSchema = new Schema<IVoidedItem>(
  {
    itemId: { type: Schema.Types.ObjectId, required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: String,
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    reason: String,
    voidedAt: { type: Date, default: Date.now },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voidedByName: String,
  },
  { _id: true }
);

const paymentBreakdownEntrySchema = new Schema<IPaymentBreakdownEntry>(
  {
    paymentMethodId: { type: Schema.Types.ObjectId, ref: 'PaymentMethod' },
    paymentMethodCode: String,
    paymentMethodName: String,
    amount: Number,
    roundedAmount: Number,
    type: { type: String, enum: ['cash', 'non-cash'] },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrderDoc>(
  {
    orderNumber: { type: String, unique: true },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    originalTotal: { type: Number, required: true },
    roundedPayable: { type: Number, required: true },
    roundingAdjustment: { type: Number, default: 0 },
    roundingMethod: { type: String, default: 'no_rounding' },
    subtotal: Number,
    discountTotal: Number,
    dppTotal: Number,
    taxTotal: Number,
    taxDetails: [taxDetailSchema],
    serviceCharge: Number,
    serviceChargeRate: Number,
    promotions: [Schema.Types.Mixed],
    paymentMethod: { type: Schema.Types.ObjectId, ref: 'PaymentMethod' },
    paymentMethodCode: String,
    paymentMethodName: String,
    paymentBreakdown: [paymentBreakdownEntrySchema],
    cashAmount: Number,
    change: Number,
    cardLastFour: String,
    cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cashierName: String,
    outlet: { type: Schema.Types.ObjectId, ref: 'Outlet' },
    outletName: String,
    member: { type: Schema.Types.ObjectId, ref: 'Member' },
    memberName: String,
    memberTier: String,
    tableNumber: String,
    customerName: String,
    transactionType: { type: String, enum: ['dine_in', 'takeaway', 'delivery', 'online'] },
    splitGroup: String,
    splitIndex: Number,
    status: { type: String, enum: ['completed', 'voided', 'partially-voided', 'open'], default: 'completed' },
    voidedItems: [voidedItemSchema],
    voidedAt: Date,
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidedByName: String,
    voidReason: String,
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model<IOrderDoc>('Order', orderSchema);
