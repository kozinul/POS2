import mongoose, { Document, Schema } from 'mongoose';

interface IPromotionBreakdown {
  name: string;
  code: string;
  discount: number;
  freeItems?: { productId: string; qty: number }[];
}

interface ITaxDetail {
  name: string;
  rate: number;
  amount: number;
  included?: boolean;
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

export interface IOrderDoc extends Document {
  orderNumber?: string;
  items: IOrderItem[];
  total: number;
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  taxDetails?: ITaxDetail[];
  serviceCharge?: number;
  serviceChargeRate?: number;
  promotions?: IPromotionBreakdown[];
  paymentMethod: mongoose.Types.ObjectId;
  paymentMethodCode?: string;
  paymentMethodName?: string;
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
  status: 'completed' | 'voided' | 'partially-voided';
  voidedItems?: IVoidedItem[];
  voidedAt?: Date;
  voidedBy?: mongoose.Types.ObjectId;
  voidedByName?: string;
  voidReason?: string;
  createdAt: Date;
}

const taxDetailSchema = new Schema<ITaxDetail>(
  {
    name: String,
    rate: Number,
    amount: Number,
    included: Boolean,
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

const orderSchema = new Schema<IOrderDoc>(
  {
    orderNumber: { type: String, unique: true },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    subtotal: Number,
    discountTotal: Number,
    taxTotal: Number,
    taxDetails: [taxDetailSchema],
    serviceCharge: Number,
    serviceChargeRate: Number,
    promotions: [Schema.Types.Mixed],
    paymentMethod: { type: Schema.Types.ObjectId, ref: 'PaymentMethod', required: true },
    paymentMethodCode: String,
    paymentMethodName: String,
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
    status: { type: String, enum: ['completed', 'voided', 'partially-voided'], default: 'completed' },
    voidedItems: [voidedItemSchema],
    voidedAt: Date,
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidedByName: String,
    voidReason: String,
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

export const Order = mongoose.model<IOrderDoc>('Order', orderSchema);
