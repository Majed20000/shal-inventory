'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import { getErrorMessage } from '../../lib/errors';
import { formatDate, exportTransactionsToExcel } from '../../lib/utils';
import { Transaction } from '../../lib/types';
import { loadTransactions } from '../../lib/db';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [operation, setOperation] = useState('الكل');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setTransactions(await loadTransactions());
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim();
    return transactions.filter((txn) => {
      if (category !== 'الكل' && txn.category !== category) return false;
      if (operation !== 'الكل' && txn.operationType !== operation) return false;
      if (!normalizedSearch) return true;
      return txn.productName.includes(normalizedSearch) || txn.notes.includes(normalizedSearch);
    });
  }, [transactions, category, operation, search]);

  const handleExport = () => {
    exportTransactionsToExcel(
      ['رقم العملية', 'اسم المنتج', 'التصنيف', 'نوع العملية', 'الكمية قبل', 'التغيير', 'الكمية بعد', 'التاريخ', 'الملاحظات'],
      filtered.map((txn, index) => ({
        'رقم العملية': index + 1,
        'اسم المنتج': txn.productName,
        التصنيف: txn.category,
        'نوع العملية': txn.operationType,
        'الكمية قبل': txn.quantityBefore,
        التغيير: txn.quantityChange,
        'الكمية بعد': txn.quantityAfter,
        التاريخ: formatDate(txn.createdAt),
        الملاحظات: txn.notes,
      })),
    );
    window.alert('تم تصدير سجل العمليات بنجاح.');
  };

  if (loading) {
    return (
      <AppShell title="سجل العمليات">
        <LoadingState />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="سجل العمليات">
        <ErrorState message={error} />
      </AppShell>
    );
  }

  return (
    <AppShell title="سجل العمليات">
      <section className="card mb-6">
        <div className="grid gap-3 lg:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث عن منتج أو ملاحظة"
            className="input-field"
          />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="input-field">
            <option>الكل</option>
            <option>شماغ</option>
            <option>ملابس</option>
            <option>سبح</option>
          </select>
          <select value={operation} onChange={(event) => setOperation(event.target.value)} className="input-field">
            <option>الكل</option>
            <option>إضافة منتج</option>
            <option>زيادة كمية</option>
            <option>تعديل كمية</option>
            <option>تعديل بيانات</option>
            <option>حذف منتج</option>
          </select>
          <button type="button" onClick={handleExport} className="btn-primary">
            تصدير Excel
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">{filtered.length} عملية</p>
      </section>

      <section className="card">
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>المنتج</th>
                <th>التصنيف</th>
                <th>نوع العملية</th>
                <th>قبل</th>
                <th>التغيير</th>
                <th>بعد</th>
                <th>الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    لا توجد عمليات مطابقة.
                  </td>
                </tr>
              ) : (
                filtered
                  .slice()
                  .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                  .map((txn) => (
                    <tr key={txn.id}>
                      <td className="whitespace-nowrap">{formatDate(txn.createdAt)}</td>
                      <td className="font-medium text-slate-800">{txn.productName}</td>
                      <td>{txn.category}</td>
                      <td>
                        <span className="rounded-lg bg-sand-100 px-2 py-1 text-xs">{txn.operationType}</span>
                      </td>
                      <td>{txn.quantityBefore}</td>
                      <td className={txn.quantityChange >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {txn.quantityChange > 0 ? `+${txn.quantityChange}` : txn.quantityChange}
                      </td>
                      <td className="font-medium">{txn.quantityAfter}</td>
                      <td>{txn.notes || '—'}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
