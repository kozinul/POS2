import mongoose, { Document, Schema } from 'mongoose';

export interface IFamilyDoc extends Document {
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
}

const familySchema = new Schema<IFamilyDoc>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: String,
  },
  { timestamps: true }
);

export const Family = mongoose.model<IFamilyDoc>('Family', familySchema);
