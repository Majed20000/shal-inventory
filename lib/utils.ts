/* eslint-disable @typescript-eslint/no-explicit-any */
import { Category, Product, Transaction } from './types';

declare const require: any;

export const defaultCategories: Category[] = ['شماغ', 'ملابس', 'سبح'];

export function normalizeName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateLatin(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function createId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function countByCategory(products: Product[], category: Category) {
  return products.filter((item) => item.category === category && !item.deletedAt).length;
}

export function totalQuantity(products: Product[]) {
  return products.reduce((sum, item) => (item.deletedAt ? sum : sum + item.quantity), 0);
}

export function lowStockProducts(products: Product[], threshold = 5) {
  return products.filter((item) => !item.deletedAt && item.quantity <= threshold);
}

export function filterProducts(
  products: Product[],
  search: string,
  category: Category,
  maxQuantity: number | null,
) {
  const normalizedSearch = normalizeName(search);
  return products.filter((product) => {
    if (product.deletedAt) return false;
    if (category && category !== 'الكل' && product.category !== category) return false;
    if (maxQuantity !== null && product.quantity > maxQuantity) return false;
    if (!normalizedSearch) return true;
    const searchIn = normalizeName(`${product.name} ${product.category} ${product.notes}`);
    return searchIn.includes(normalizedSearch);
  });
}

export function exportToExcel(columns: string[], rows: Array<Record<string, string | number>>) {
  const XLSX = require('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المنتجات');
  const filename = `alshal_alarabi_products_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportTransactionsToExcel(columns: string[], rows: Array<Record<string, string | number>>) {
  const XLSX = require('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل العمليات');
  const filename = `alshal_alarabi_transactions_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportPaymentsToExcel(columns: string[], rows: Array<Record<string, string | number>>) {
  const XLSX = require('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المصاريف والمدفوعات');
  const filename = `alshal_alarabi_payments_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportSalesToExcel(columns: string[], rows: Array<Record<string, string | number>>) {
  const XLSX = require('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المبيعات');
  const filename = `alshal_alarabi_sales_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/** الوصف المعروض للبيع — يجمع بين الحقل المحفوظ وأسماء العناصر */
export function getSaleDescription(sale: {
  type?: string;
  description?: string;
  totalAmount?: number;
  items?: { productName?: string }[];
}): string {
  const saved = sale.description?.trim();
  if (saved) return saved;

  const itemNames = (sale.items || [])
    .map((item) => item.productName?.trim())
    .filter(Boolean) as string[];
  if (itemNames.length) return itemNames.join('، ');

  if (sale.type === 'quick') {
    const amount = Number(sale.totalAmount || 0);
    return amount ? `بيع سريع - ${amount.toLocaleString('en-US')}` : 'بيع سريع';
  }

  return '';
}

/** الوصف المعروض للدفعة — يدعم note و description */
export function getPaymentNote(payment: { note?: string }): string {
  return payment.note?.trim() || '';
}
