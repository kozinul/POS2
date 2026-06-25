import mongoose, { Document, Schema } from 'mongoose';

export interface ITaxEntry {
  tax: mongoose.Types.ObjectId;
  included: boolean;
}

export interface IProductDoc extends Document {
  name: string;
  barcode?: string;
  price: number;
  costPrice?: number;
  stock: number;
  stockManagement: boolean;
  taxes: ITaxEntry[];
  discount: number;
  category: mongoose.Types.ObjectId;
  outlets: mongoose.Types.ObjectId[];
  modifiers: mongoose.Types.ObjectId[];
  image?: string;
  active: boolean;
}

const productSchema = new Schema<IProductDoc>(
  {
    name: { type: String, required: true },
    barcode: { type: String, unique: true, sparse: true },
    price: { type: Number, required: true },
    costPrice: Number,
    stock: { type: Number, default: 0 },
    stockManagement: { type: Boolean, default: true },
    taxes: [{
      tax: { type: Schema.Types.ObjectId, ref: 'Tax' },
      included: { type: Boolean, default: true },
    }],
    discount: { type: Number, default: 0 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    outlets: [{ type: Schema.Types.ObjectId, ref: 'Outlet' }],
    modifiers: [{ type: Schema.Types.ObjectId, ref: 'Modifier' }],
    image: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', barcode: 1 });

export const Product = mongoose.model<IProductDoc>('Product', productSchema);
