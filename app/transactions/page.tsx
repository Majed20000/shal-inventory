'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import { formatDate, exportTransactionsToExcel } from '../../lib/utils';
import { Transaction } from '../../lib/types';
import { loadTransactions } from '../../lib/db';    

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [operation, setOperation] = useState('الكل');

  useEffect(() => {
    async function load() {
      setTransactions(await loadTransactions());
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
        'التغيير': txn.quantityChange,
        'الكمية بعد': txn.quantityAfter,
        التاريخ: formatDate(txn.createdAt),
        الملاحظات: txn.notes,
      }))
    );
    window.alert('تم تصدير سجل العمليات بنجاح.');
  };

  return (
    <AppShell title="سجل العمليات">
      <section className="mb-6 rounded-3xl bg-white p-6 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث عن منتج أو ملاحظة"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-sand-400 focus:outline-none"
          />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <option>الكل</option>
            <option>شماغ</option>
            <option>ملابس</option>
            <option>سبح</option>
          </select>
          <select value={operation} onChange={(event) => setOperation(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <option>الكل</option>
            <option>إضافة منتج</option>
            <option>زيادة كمية</option>
            <option>تعديل كمية</option>
            <option>تعديل بيانات</option>
            <option>حذف منتج</option>
          </select>
          <button type="button" onClick={handleExport} className="rounded-2xl bg-sand-500 px-5 py-3 text-white transition hover:bg-sand-600">
            تصدير Excel
          </button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-3xl bg-white p-6 shadow-soft">
        <table className="min-w-full text-right">
          <thead className="bg-sand-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-sm">التاريخ</th>
              <th className="px-4 py-3 text-sm">المنتج</th>
              <th className="px-4 py-3 text-sm">التصنيف</th>
              <th className="px-4 py-3 text-sm">نوع العملية</th>
              <th className="px-4 py-3 text-sm">الكمية قبل</th>
              <th className="px-4 py-3 text-sm">التغيير</th>
              <th className="px-4 py-3 text-sm">الكمية بعد</th>
              <th className="px-4 py-3 text-sm">الملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  لا توجد عمليات مطابقة.
                </td>
              </tr>
            ) : (
              filtered
                .slice()
                .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                .map((txn) => (
                  <tr key={txn.id}>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{formatDate(txn.createdAt)}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{txn.productName}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{txn.category}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{txn.operationType}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{txn.quantityBefore}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{txn.quantityChange}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{txn.quantityAfter}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{txn.notes}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
