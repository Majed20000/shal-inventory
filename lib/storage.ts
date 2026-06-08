import { Product, Transaction } from './types';
import { defaultCategories, normalizeName, createId } from './utils';

const PRODUCTS_KEY = 'alshal_alarabi_products';
const TRANSACTIONS_KEY = 'alshal_alarabi_transactions';
const CATEGORIES_KEY = 'alshal_alarabi_categories';

export function loadProducts(): Product[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(PRODUCTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

export function saveProducts(products: Product[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function loadTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(TRANSACTIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Transaction[];
  } catch {
    return [];
  }
}

export function saveTransactions(transactions: Transaction[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export function loadCategories(): string[] {
  if (typeof window === 'undefined') return defaultCategories;
  const raw = window.localStorage.getItem(CATEGORIES_KEY);
  if (!raw) return defaultCategories;
  try {
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) && list.length ? list : defaultCategories;
  } catch {
    return defaultCategories;
  }
}

export function saveCategories(categories: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function findProductByNormalizedName(products: Product[], name: string) {
  const normalized = normalizeName(name);
  return products.find((item) => item.normalizedName === normalized && !item.deletedAt);
}

export function buildProductName(name: string) {
  return normalizeName(name);
}

export function createTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  return {
    id: createId('txn'),
    createdAt: new Date().toISOString(),
    ...data,
  };
}
