'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import StatCard from '../components/StatCard';
import { getErrorMessage } from '../lib/errors';
import { countByCategory, formatDate, lowStockProducts, totalQuantity } from '../lib/utils';
import { Product, Transaction } from '../lib/types';
import { loadProducts, loadTransactions } from '../lib/db';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [loadedProducts, loadedTransactions] = await Promise.all([loadProducts(), loadTransactions()]);
        setProducts(loadedProducts);
        setTransactions(loadedTransactions);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const activeProducts = useMemo(() => products.filter((item) => !item.deletedAt), [products]);
  const lowStock = useMemo(() => lowStockProducts(activeProducts), [activeProducts]);
  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5),
    [transactions],
  );

  if (loading) {
    return (
      <AppShell title="لوحة التحكم">
        <LoadingState />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="لوحة التحكم">
        <ErrorState message={error} />
      </AppShell>
    );
  }

  return (
    <AppShell title="لوحة التحكم">
      {/* Removed duplicated header buttons (they are available in the main header) */}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="إجمالي المنتجات" value={activeProducts.length} accent="primary" />
        <StatCard label="إجمالي الكمية" value={totalQuantity(activeProducts)} accent="dark" />
        <StatCard label="منتجات الشماغ" value={countByCategory(activeProducts, 'شماغ')} />
        <StatCard label="منتجات الملابس" value={countByCategory(activeProducts, 'ملابس')} />
        <StatCard label="منتجات السبح" value={countByCategory(activeProducts, 'سبح')} />
        <StatCard label="منخفضة الكمية (≤5)" value={lowStock.length} accent={lowStock.length > 0 ? 'warning' : 'default'} />
      </section>

      {lowStock.length > 0 ? (
        <section className="card mt-6 border-amber-200 bg-amber-50/50">
          <h2 className="text-lg font-semibold text-amber-900">تنبيه: منتجات تحتاج إعادة تخزين</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {lowStock.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm text-amber-900 transition hover:bg-amber-100"
              >
                {product.name} — {product.quantity} متبقي
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">آخر العمليات</h2>
          <Link href="/transactions" className="text-sm text-sand-700 hover:text-sand-900">
            عرض الكل ←
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-slate-500">لا توجد عمليات بعد. ابدأ بإضافة منتج جديد.</p>
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المنتج</th>
                  <th>العملية</th>
                  <th>قبل</th>
                  <th>التغيير</th>
                  <th>بعد</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((txn) => (
                  <tr key={txn.id}>
                    <td className="whitespace-nowrap">{formatDate(txn.createdAt)}</td>
                    <td>{txn.productName}</td>
                    <td>
                      <span className="rounded-lg bg-sand-100 px-2 py-1 text-xs font-medium text-sand-800">
                        {txn.operationType}
                      </span>
                    </td>
                    <td>{txn.quantityBefore}</td>
                    <td className={txn.quantityChange >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {txn.quantityChange > 0 ? `+${txn.quantityChange}` : txn.quantityChange}
                    </td>
                    <td className="font-medium text-slate-800">{txn.quantityAfter}</td>
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
