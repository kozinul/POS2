import mongoose, { Document, Schema } from 'mongoose';

export const PERMISSIONS = [
  // Sales
  'sales.create',
  'sales.void',
  'sales.view',
  'sales.discount',
  // Products
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',
  // Categories
  'categories.view',
  'categories.edit',
  // Members
  'members.view',
  'members.edit',
  // Promotions
  'promotions.view',
  'promotions.edit',
  // Reports
  'reports.sales',
  'reports.finance',
  // Settings
  'settings.edit',
  // Users
  'users.view',
  'users.edit',
  // Outlets
  'outlets.view',
  'outlets.edit',
  // Modifiers
  'modifiers.view',
  'modifiers.edit',
  // Taxes
  'taxes.view',
  'taxes.edit',
  // Payment Methods
  'payment-methods.view',
  'payment-methods.edit',
  // Families
  'families.view',
  'families.edit',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface IRoleDoc extends Document {
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Date;
}

const roleSchema = new Schema<IRoleDoc>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    permissions: [{ type: String, enum: PERMISSIONS }],
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Role = mongoose.model<IRoleDoc>('Role', roleSchema);
