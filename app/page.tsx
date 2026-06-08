'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import StatCard from '../components/StatCard';
import { countByCategory, formatDate, lowStockProducts, totalQuantity } from '../lib/utils';
import { Product, Transaction } from '../lib/types';
import { loadProducts, loadTransactions } from '../lib/db';


export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    async function fetchData() {
      setProducts(await loadProducts());
      setTransactions(await loadTransactions());
    }
    fetchData();
  }, []);

  const activeProducts = useMemo(() => products.filter((item) => !item.deletedAt), [products]);
  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5),
    [transactions],
  );

  return (
    <AppShell title="لوحة التحكم">
      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard label="إجمالي المنتجات" value={activeProducts.length} />
        <StatCard label="إجمالي الكمية" value={totalQuantity(activeProducts)} />
        <StatCard label="منتجات الشماغ" value={countByCategory(activeProducts, 'شماغ')} />
        <StatCard label="منتجات الملابس" value={countByCategory(activeProducts, 'ملابس')} />
        <StatCard label="منتجات السبح" value={countByCategory(activeProducts, 'سبح')} />
        <StatCard label="المنتجات منخفضة الكمية" value={lowStockProducts(activeProducts).length} />
      </section>
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-slate-900">آخر العمليات</h2>
        {recentTransactions.length === 0 ? (
          <p className="mt-4 text-slate-600">لا توجد عمليات بعد.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead className="bg-sand-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-sm">التاريخ</th>
                  <th className="px-4 py-3 text-sm">المنتج</th>
                  <th className="px-4 py-3 text-sm">العملية</th>
                  <th className="px-4 py-3 text-sm">الكمية قبل</th>
                  <th className="px-4 py-3 text-sm">التغيير</th>
                  <th className="px-4 py-3 text-sm">الكمية بعد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentTransactions.map((txn) => (
                  <tr key={txn.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{formatDate(txn.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{txn.productName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{txn.operationType}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{txn.quantityBefore}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{txn.quantityChange}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{txn.quantityAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
