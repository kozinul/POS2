import mongoose, { Document, Schema } from 'mongoose';

export type DiscountType = 'percentage' | 'nominal' | 'buy_x_get_y' | 'min_purchase';
export type DiscountScope = 'all' | 'category' | 'family';

export interface IDiscountDoc extends Document {
  name: string;
  description?: string;
  outlets: mongoose.Types.ObjectId[];
  type: DiscountType;
  value?: number;
  scope?: DiscountScope;
  targetId?: mongoose.Types.ObjectId;
  targetModel?: 'Category' | 'Family';
  buyQty?: number;
  freeQty?: number;
  minAmount?: number;
  discountValue?: number;
  discountUnit?: 'percentage' | 'nominal';
  startDate?: Date;
  endDate?: Date;
  active: boolean;
  createdAt: Date;
}

const discountSchema = new Schema<IDiscountDoc>(
  {
    name: { type: String, required: true },
    description: String,
    outlets: [{ type: Schema.Types.ObjectId, ref: 'Outlet' }],
    type: {
      type: String,
      enum: ['percentage', 'nominal', 'buy_x_get_y', 'min_purchase'],
      required: true,
    },
    value: Number,
    scope: { type: String, enum: ['all', 'category', 'family'] },
    targetId: { type: Schema.Types.ObjectId, refPath: 'targetModel' },
    targetModel: { type: String, enum: ['Category', 'Family'] },
    buyQty: Number,
    freeQty: Number,
    minAmount: Number,
    discountValue: Number,
    discountUnit: { type: String, enum: ['percentage', 'nominal'] },
    startDate: Date,
    endDate: Date,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Discount = mongoose.model<IDiscountDoc>('Discount', discountSchema);
