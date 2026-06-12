export type Category = string;

export interface Product {
  id: string;
  name: string;
  normalizedName: string;
  category: Category;
  quantity: number;
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
