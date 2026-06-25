import mongoose, { Document, Schema } from 'mongoose';

export interface ISettingDoc extends Document {
  key: string;
  value: any;
  description?: string;
}

const settingSchema = new Schema<ISettingDoc>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: String,
  },
  { timestamps: true }
);

export const Setting = mongoose.model<ISettingDoc>('Setting', settingSchema);
