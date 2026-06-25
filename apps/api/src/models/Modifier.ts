import mongoose, { Document, Schema } from 'mongoose';

export interface IModifierOption {
  name: string;
  price: number;
}

export interface IModifierDoc extends Document {
  name: string;
  options: IModifierOption[];
  productId?: mongoose.Types.ObjectId;
  family?: mongoose.Types.ObjectId;
  required: boolean;
  createdAt: Date;
}

const modifierOptionSchema = new Schema<IModifierOption>(
  {
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const modifierSchema = new Schema<IModifierDoc>(
  {
    name: { type: String, required: true },
    options: [modifierOptionSchema],
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    family: { type: Schema.Types.ObjectId, ref: 'Family' },
    required: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Modifier = mongoose.model<IModifierDoc>('Modifier', modifierSchema);
