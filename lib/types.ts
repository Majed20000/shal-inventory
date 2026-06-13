export type Category = string;

export interface Product {
  id: string;
  name: string;
  normalizedName: string;
  category: Category;
  quantity: number;
  cost?: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  category: Category;
  operationType: string;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  notes: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  note: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId?: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Sale {
  id: string;
  type: 'detailed' | 'quick';
  items?: SaleItem[];
  description: string;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}
