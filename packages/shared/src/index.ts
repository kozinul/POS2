export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier';
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategory {
  _id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProduct {
  _id: string;
  name: string;
  barcode?: string;
  price: number;
  costPrice?: number;
  stock: number;
  category: ICategory | string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItem {
  product: IProduct | string;
  qty: number;
  price: number;
  subtotal: number;
}

export interface IOrder {
  _id: string;
  items: IOrderItem[];
  total: number;
  paymentMethod: 'cash' | 'qris' | 'debit';
  cashAmount?: number;
  change?: number;
  cashier: IUser | string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateProductInput = {
  name: string;
  barcode?: string;
  price: number;
  costPrice?: number;
  stock: number;
  category: string;
  image?: string;
};

export type CreateOrderInput = {
  items: { product: string; qty: number; price: number }[];
  paymentMethod: 'cash' | 'qris' | 'debit';
  cashAmount?: number;
};
