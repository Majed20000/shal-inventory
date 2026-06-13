'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { getErrorMessage } from '../../lib/errors';
import { formatDateLatin, exportSalesToExcel } from '../../lib/utils';
import { Sale, SaleItem } from '../../lib/types';
import { loadProducts, loadSales, addDetailedSale, addQuickSale, deleteSale } from '../../lib/db';

export default function SalesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<(Sale & { items?: SaleItem[] })[]>([]);

  // quick sale
  const [quickAmount, setQuickAmount] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [quickDate, setQuickDate] = useState('');

  // detailed sale
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [items, setItems] = useState<{ productId?: string; productName: string; quantity: number; price: number }[]>([]);
  const [description, setDescription] = useState('');

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'detailed' | 'quick'>('all');

  useEffect(() => {
    async function load() {
      try {
        setProducts(await loadProducts());
        setSales(await loadSales());
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalSales = useMemo(() => sales.reduce((s, sale) => s + Number(sale.totalAmount || 0), 0), [sales]);

  const today = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    return sales.filter((s) => s.createdAt >= start).reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);
  }, [sales]);

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (filterType !== 'all' && s.type !== filterType) return false;
      if (search && !String(s.description || '').includes(search)) return false;
      if (dateFrom && new Date(s.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(s.createdAt) > new Date(dateTo)) return false;
      return true;
    });
  }, [sales, search, dateFrom, dateTo, filterType]);

  const handleAddQuick = async () => {
    const value = Number(quickAmount);
    if (!value || isNaN(value)) return window.alert('أدخل مبلغ صالح');
    try {
      await addQuickSale(value, quickNote.trim(), quickDate ? new Date(quickDate).toISOString() : undefined);
      setSales(await loadSales());
      setQuickAmount('');
      setQuickNote('');
      setQuickDate('');
      window.alert('تم حفظ البيع السريع.');
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const handleAddItem = () => {
    const product = products.find((p) => p.id === selectedProduct);
    const quantity = Number(qty);
    const p = Number(price);
    if (!product && !selectedProduct) {
      return window.alert('اختر منتجاً أو اكتب اسم المنتج.');
    }
    if (!quantity || isNaN(quantity) || quantity <= 0) return window.alert('كمية غير صحيحة');
    if (!p || isNaN(p) || p <= 0) return window.alert('سعر غير صحيح');
    if (product && quantity > product.quantity) return window.alert('الكمية المطلوبة أكبر من المخزون');
    setItems([...items, { productId: product?.id, productName: product?.name || selectedProduct, quantity, price: p }]);
    setSelectedProduct('');
    setQty('1');
    setPrice('');
  };

  const handleSubmitDetailed = async () => {
    if (items.length === 0) return window.alert('أضف عناصر للبيع أولاً');
    try {
      await addDetailedSale(items.map((it) => ({ productId: it.productId, productName: it.productName, quantity: it.quantity, price: it.price })), description || '', undefined);
      setSales(await loadSales());
      setItems([]);
      setDescription('');
      window.alert('تم حفظ البيع المفصل.');
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const handleDeleteSale = async (s: Sale) => {
    if (!confirm('هل أنت متأكد من حذف السجل؟')) return;
    try {
      await deleteSale(s.id);
      setSales(await loadSales());
      window.alert('تم حذف البيع.');
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const handleExport = () => {
    const rows = filtered.map((s, i) => ({
      'رقم': i + 1,
      'معرف البيع': s.id,
      'النوع': s.type,
      'الوصف': s.description || '—',
      'المبلغ الإجمالي': s.totalAmount,
      'التاريخ': formatDateLatin(s.createdAt),
    }));
    exportSalesToExcel(['رقم', 'معرف البيع', 'النوع', 'الوصف', 'المبلغ الإجمالي', 'التاريخ'], rows);
    window.alert('تم تصدير المبيعات إلى Excel');
  };

  if (loading) return (
    <AppShell title="إدارة المبيعات اليومية">
      <LoadingState />
    </AppShell>
  );

  if (error) return (
    <AppShell title="إدارة المبيعات اليومية">
      <ErrorState message={error} />
    </AppShell>
  );

  return (
    <AppShell title="إدارة المبيعات اليومية (إدارة المبيعات اليومية)">
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <div className="md:col-span-1">
          <div className="stat-card">
            <div>
              <div className="text-sm text-sand-200">مجموع المبيعات</div>
              <div className="stat-value">{Number(totalSales).toLocaleString('en-US')}</div>
            </div>
          </div>

          <div className="card mt-4">
            <h3 className="mb-3 text-sm text-slate-600">بيع سريع</h3>
            <div className="grid gap-2">
              <input value={quickAmount} onChange={(e) => setQuickAmount(e.target.value)} placeholder="المبلغ" className="control" type="number" />
              <input value={quickDate} onChange={(e) => setQuickDate(e.target.value)} className="control" type="date" />
              <input value={quickNote} onChange={(e) => setQuickNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="control" />
              <div className="flex justify-end">
                <button onClick={handleAddQuick} className="btn-primary small-btn">سجل سريع</button>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="card">
            <h3 className="mb-3 text-sm text-slate-600">بيع مفصل</h3>
            <div className="grid gap-3 sm:grid-cols-4 items-end">
              <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="control">
                <option value="">-- اختر منتج (أو اكتب اسم) --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — ({p.quantity})</option>
                ))}
              </select>
              <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="الكمية" className="control" type="number" />
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="سعر الوحدة" className="control" type="number" />
              <div>
                <button type="button" onClick={handleAddItem} className="btn-primary small-btn">أضف عنصر</button>
              </div>
            </div>

            {items.length > 0 && (
              <div className="mt-4">
                <table className="data-table w-full">
                  <thead>
                    <tr><th>المنتج</th><th>كمية</th><th>سعر</th><th>المجموع</th></tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td>{it.productName}</td>
                        <td>{it.quantity}</td>
                        <td>{it.price}</td>
                        <td>{(it.quantity * it.price).toLocaleString('en-US')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex justify-between items-center">
                  <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ملاحظة عامة (اختياري)" className="control" />
                  <div>
                    <button onClick={handleSubmitDetailed} className="btn-primary small-btn">حفظ البيع</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث" className="control" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="control">
            <option value="all">الكل</option>
            <option value="detailed">مفصل</option>
            <option value="quick">سريع</option>
          </select>
          <input value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="control" type="date" />
          <input value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="control" type="date" />
          <div className="ml-auto">
            <button onClick={handleExport} className="btn-primary small-btn">تصدير</button>
          </div>
        </div>
      </div>

      <section className="card">
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم</th>
                <th>النوع</th>
                <th>الوصف</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">لا توجد مبيعات.</td>
                </tr>
              ) : (
                filtered.map((s, idx) => (
                  <tr key={s.id} className="hover:shadow-sm">
                    <td>{idx + 1}</td>
                    <td>{s.type === 'detailed' ? 'مفصل' : 'سريع'}</td>
                    <td>{s.description || (s.items && s.items.length ? s.items.map((it) => it.productName).join(', ') : '—')}</td>
                    <td className="font-medium">{Number(s.totalAmount).toLocaleString('en-US')}</td>
                    <td className="whitespace-nowrap">{formatDateLatin(s.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button title="حذف" onClick={() => handleDeleteSale(s)} className="icon-btn" aria-label="delete">حذف</button>
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
