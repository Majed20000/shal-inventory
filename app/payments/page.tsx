'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import { getErrorMessage } from '../../lib/errors';
import { formatDateLatin, exportPaymentsToExcel } from '../../lib/utils';
import { Payment } from '../../lib/types';
import { addPayment, deletePayment, loadPayments, updatePayment } from '../../lib/db';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  const [search, setSearch] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setPayments(await loadPayments());
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const total = useMemo(() => payments.reduce((s, p) => s + Number(p.amount || 0), 0), [payments]);

  const filtered = useMemo(() => {
    const s = search.trim();
    return payments.filter((p) => {
      if (s && !p.note.includes(s)) return false;
      if (minAmount && Number(p.amount) < Number(minAmount)) return false;
      if (maxAmount && Number(p.amount) > Number(maxAmount)) return false;
      if (dateFrom && new Date(p.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(p.createdAt) > new Date(dateTo)) return false;
      return true;
    });
  }, [payments, search, minAmount, maxAmount, dateFrom, dateTo]);

  const handleAdd = async () => {
    const value = Number(amount);
    if (!value || isNaN(value)) return window.alert('أدخل قيمة صالحة للمبلغ');
    try {
      // add and use returned payment to update UI immediately
      const newPayment = await addPayment(value, note.trim(), date ? new Date(date).toISOString() : undefined);
      // prepend to list (addPayment may return null on failure)
      if (newPayment) {
        setPayments((prev) => [newPayment, ...prev]);
      } else {
        // fallback: reload list
        setPayments(await loadPayments());
      }
      setAmount('');
      setDate('');
      setNote('');
      window.alert('تم إضافة الدفعة بنجاح.');
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const handleEdit = async (p: Payment) => {
    const newAmount = prompt('المبلغ', String(p.amount));
    if (newAmount === null) return;
    const parsed = Number(newAmount);
    if (!parsed || isNaN(parsed)) return window.alert('قيمة المبلغ غير صالحة');
    const newDate = prompt('تاريخ الدفع (YYYY-MM-DD أو اترك فارغاً)', new Date(p.createdAt).toISOString().slice(0, 10));
    const newNote = prompt('الوصف / الملاحظة', p.note || '') ?? '';
    try {
      const updated = await updatePayment(p.id, parsed, newNote.trim(), newDate ? new Date(newDate).toISOString() : undefined);
      // update local state
      setPayments((prev) => prev.map((it) => (it.id === p.id ? updated ?? it : it)));
      window.alert('تم تحديث الدفعة.');
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const handleDelete = async (p: Payment) => {
    const confirmed = window.confirm('هل أنت متأكد من حذف هذه الدفعة؟');
    if (!confirmed) return;
    try {
      await deletePayment(p.id);
      setPayments((prev) => prev.filter((it) => it.id !== p.id));
      window.alert('تم حذف الدفعة.');
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const handleExport = () => {
    const rows = filtered.map((p, i) => ({
      'رقم': i + 1,
      'المبلغ': p.amount,
      'التاريخ': formatDateLatin(p.createdAt),
      'الوصف': p.note || '—',
      'آخر تعديل': p.updatedAt ? formatDateLatin(p.updatedAt) : '—',
    }));
    exportPaymentsToExcel(['رقم', 'المبلغ', 'التاريخ', 'الوصف', 'آخر تعديل'], rows);
    window.alert('تم تصدير ملف Excel بنجاح.');
  };

  if (loading) {
    return (
      <AppShell title="المصاريف والمدفوعات">
        <LoadingState />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="المصاريف والمدفوعات">
        <ErrorState message={error} />
      </AppShell>
    );
  }

  return (
    <AppShell title="المصاريف والمدفوعات">
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <div className="md:col-span-1">
          <div className="stat-card">
            <div>
              <div className="text-sm text-sand-200">إجمالي المدفوعات</div>
              <div className="stat-value">{Number(total).toLocaleString('en-US')}</div>
            </div>
            <div className="ml-auto">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1v22" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 7h14v10H5z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="card">
            <h3 className="mb-3 text-sm text-slate-600">أضف دفعة جديدة</h3>
            <div className="grid gap-3 sm:grid-cols-3 items-end">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="الوصف (اختياري)" className="control" />

              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="المبلغ"
                className="control"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
              />

              <div className="fancy-date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="control" />
                <div className="calendar-icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 10h10M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={handleAdd} className="btn-primary small-btn">
                أضف دفعة
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3 md:gap-4 flex-1">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في الوصف" className="control" />
            <input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="الحد الأدنى للمبلغ" className="control" type="number" />
            <input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="الحد الأقصى للمبلغ" className="control" type="number" />
          </div>

          <div className="flex items-center gap-2">
            <input value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="control" type="date" />
            <input value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="control" type="date" />
            <button type="button" onClick={handleExport} className="btn-primary small-btn">
              تصدير Excel
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500">{filtered.length} دفعة</p>
      </div>

      <section className="card">
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
                <th>الوصف</th>
                <th>آخر تعديل</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    لا توجد دفعات مطابقة.
                  </td>
                </tr>
              ) : (
                filtered.map((p, index) => (
                  <tr key={p.id} className="hover:shadow-sm">
                    <td>{index + 1}</td>
                    <td className="font-medium text-slate-800">{Number(p.amount).toLocaleString('en-US')}</td>
                    <td className="whitespace-nowrap">{formatDateLatin(p.createdAt)}</td>
                    <td>{p.note || '—'}</td>
                    <td className="whitespace-nowrap">{p.updatedAt ? formatDateLatin(p.updatedAt) : '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button title="تعديل" onClick={() => handleEdit(p)} className="icon-btn" aria-label="edit">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="#1f2937" strokeWidth="0" fill="#374151" />
                            <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="#1f2937" strokeWidth="0" fill="#374151" />
                          </svg>
                        </button>
                        <button title="حذف" onClick={() => handleDelete(p)} className="icon-btn" aria-label="delete">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18" stroke="#b91c1c" strokeWidth="1.2" strokeLinecap="round" />
                            <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="#b91c1c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 11v6M14 11v6" stroke="#b91c1c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </td>
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
