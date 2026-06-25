import mongoose, { Document, Schema } from 'mongoose';

export interface ICategoryDoc extends Document {
  name: string;
  description?: string;
  family: mongoose.Types.ObjectId;
  active: boolean;
}

const categorySchema = new Schema<ICategoryDoc>(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    family: { type: Schema.Types.ObjectId, ref: 'Family', required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Category = mongoose.model<ICategoryDoc>('Category', categorySchema);
