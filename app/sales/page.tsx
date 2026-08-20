'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { getErrorMessage } from '../../lib/errors';
import { formatDateLatin, exportSalesToExcel, getSaleDescription } from '../../lib/utils';
import { Sale, SaleItem } from '../../lib/types';
import { loadProducts, loadSales, addDetailedSale, addQuickSale, deleteSale } from '../../lib/db';
import ProductNameInput from '../../components/ProductNameInput';

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
  const [productName, setProductName] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [items, setItems] = useState<{ productId?: string; productName: string; quantity: number; price: number }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [description, setDescription] = useState('');

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'detailed' | 'quick'>('all');
  const [showSalesTotals, setShowSalesTotals] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [salesPassword, setSalesPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const prods = await loadProducts();
        setProducts(prods);
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

  // daily/filtered total will be computed from the filtered list below
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filtered = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    return sales.filter((s) => {
      if (dateFrom && new Date(s.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(s.createdAt) > new Date(dateTo)) return false;

      if (filterType !== 'all' && s.type !== filterType) return false;

      if (!q) return true;

      // match description, sale id, or any item productName
      if (getSaleDescription(s).toLowerCase().includes(q)) return true;
      if ((s.id || '').toLowerCase().includes(q)) return true;
      if (s.items && s.items.some((it) => (it.productName || '').toLowerCase().includes(q))) return true;
      return false;
    });
  }, [sales, search, dateFrom, dateTo, filterType]);

  const filteredTotal = useMemo(() => filtered.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0), [filtered]);

  const handleToggleSalesTotals = () => {
    if (showSalesTotals) {
      setShowSalesTotals(false);
      return;
    }
    setPasswordError('');
    setSalesPassword('');
    setShowPasswordDialog(true);
  };

  const handleSalesPasswordChange = (value: string) => {
    setSalesPassword(value);
    setPasswordError('');
    if (value === '2000') {
      setShowSalesTotals(true);
      setShowPasswordDialog(false);
      setSalesPassword('');
    } else if (value.length >= 4) {
      setPasswordError('الرمز غير صحيح');
    }
  };

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
    const product = products.find((p) => p.id === selectedProduct) || products.find((p) => p.name === productName);
    const quantity = Number(qty);
    // determine per-unit price: prefer explicit price, otherwise derive from totalPrice
    let p = price ? Number(price) : undefined;
    const t = totalPrice ? Number(totalPrice) : undefined;
    if (!product && !selectedProduct) {
      return window.alert('اختر منتجاً أو اكتب اسم المنتج.');
    }
    if (!quantity || isNaN(quantity) || quantity <= 0) return window.alert('كمية غير صحيحة');
    if ((p === undefined || isNaN(p) || p <= 0) && (t === undefined || isNaN(t) || t <= 0)) return window.alert('أدخل سعرًا للوحدة أو السعر الكلي');
    if (product && quantity > product.quantity) return window.alert('الكمية المطلوبة أكبر من المخزون');

    if (p === undefined || isNaN(p) || p <= 0) {
      // derive unit price from total
      p = Number((t! / quantity).toFixed(4));
    }

    const newItem = { productId: product?.id, productName: product?.name || productName || selectedProduct, quantity, price: p };
    if (editingIndex !== null && editingIndex >= 0 && editingIndex < items.length) {
      const copy = [...items];
      copy[editingIndex] = newItem;
      setItems(copy);
      setEditingIndex(null);
    } else {
      setItems([...items, newItem]);
    }

    setSelectedProduct('');
    setQty('1');
    setPrice('');
    setTotalPrice('');
    setProductName('');
  };

  const handleEditItem = (idx: number) => {
    const it = items[idx];
    setEditingIndex(idx);
    setSelectedProduct(it.productId || '');
    setQty(String(it.quantity));
    setPrice(String(it.price));
    setTotalPrice('');
    setProductName(it.productName || '');
  };

  const handleRemoveItem = (idx: number) => {
    const copy = items.filter((_, i) => i !== idx);
    setItems(copy);
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
      'الوصف': getSaleDescription(s) || '—',
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
    <AppShell title="إدارة المبيعات اليومية">
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <div className="md:col-span-1">
          <div className="stat-card">
            <div className="flex-1">
              <div className="text-sm text-sand-200">مجموع المبيعات</div>
              <div className="stat-value">{showSalesTotals ? Number(totalSales).toLocaleString('en-US') : '••••••'}</div>
            </div>
            <button
              type="button"
              onClick={handleToggleSalesTotals}
              className="icon-btn border-white/20 bg-white/10 text-white hover:bg-white/20"
              aria-label={showSalesTotals ? 'إخفاء مجموع المبيعات' : 'إظهار مجموع المبيعات'}
              title={showSalesTotals ? 'إخفاء المجموع' : 'إظهار المجموع'}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                {showSalesTotals ? <circle cx="12" cy="12" r="2.5" /> : <path d="m4 4 16 16" />}
              </svg>
            </button>
          </div>
          <div  className="daily-sales-card mt-4">
            <div className="flex-1">
              <div className="text-sm text-sand-200">مجموع المبيعات (اليومية)</div>
              <div className="stat-value">{showSalesTotals ? Number(filteredTotal).toLocaleString('en-US') : '••••••'}</div>
            </div>
            <button
              type="button"
              onClick={handleToggleSalesTotals}
              className="icon-btn border-white/20 bg-white/10 text-white hover:bg-white/20"
              aria-label={showSalesTotals ? 'إخفاء مجموع المبيعات اليومية' : 'إظهار مجموع المبيعات اليومية'}
              title={showSalesTotals ? 'إخفاء المجموع' : 'إظهار المجموع'}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                {showSalesTotals ? <circle cx="12" cy="12" r="2.5" /> : <path d="m4 4 16 16" />}
              </svg>
            </button>
          </div>

          {showPasswordDialog ? (
            <div className="mt-4" role="dialog" aria-label="رمز الدخول">
              <input
                autoFocus
                value={salesPassword}
                onChange={(event) => handleSalesPasswordChange(event.target.value)}
                className="control border-sand-300 shadow-sm"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="اكتب الرمز"
                aria-label="رمز الدخول"
              />
              {passwordError ? <p className="mt-1 text-sm text-red-600">{passwordError}</p> : null}
            </div>
          ) : null}

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
            <div className="grid gap-3 sm:grid-cols-5 items-end">
              <div className="sm:col-span-2">
                <ProductNameInput
                  value={productName}
                  onChange={(v) => {
                    setProductName(v);
                    // clear selectedProduct id when typing
                    setSelectedProduct('');
                  }}
                  products={products}
                  onSelectProduct={(p) => {
                    setProductName(p.name);
                    setSelectedProduct(p.id);
                  }}
                  placeholder="ابحث عن منتج أو اكتب اسم"
                />
              </div>
              <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="الكمية" className="control" type="number" />
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="سعر الوحدة" className="control" type="number" />
              <input value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} placeholder="السعر الكلي (اختياري)" className="control" type="number" />
              <div>
                <button type="button" onClick={handleAddItem} className="btn-primary add-large-btn">{editingIndex !== null ? 'تحديث عنصر' : 'أضف عنصر'}</button>
              </div>
            </div>

            {items.length > 0 && (
              <div className="mt-4">
                <table className="data-table w-full">
                  <thead>
                    <tr><th>المنتج</th><th>كمية</th><th>سعر الوحدة</th><th>المجموع</th><th>إجراءات</th></tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td>{it.productName}</td>
                        <td>{it.quantity}</td>
                        <td>{it.price}</td>
                        <td>{(it.quantity * it.price).toLocaleString('en-US')}</td>
                        <td>
                          <div className="table-actions">
                            <button title="تعديل" onClick={() => handleEditItem(idx)} className="icon-btn">تعديل</button>
                            <button title="حذف" onClick={() => handleRemoveItem(idx)} className="icon-btn">حذف</button>
                          </div>
                        </td>
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
                  <tr key={s.id} className="hover:shadow-sm cursor-pointer" onClick={() => setSelectedSale(s)}>
                    <td>{idx + 1}</td>
                    <td>{s.type === 'detailed' ? 'مفصل' : 'سريع'}</td>
                    <td>{getSaleDescription(s) || '—'}</td>
                    <td className="font-medium">{Number(s.totalAmount).toLocaleString('en-US')}</td>
                    <td className="whitespace-nowrap">{formatDateLatin(s.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button title="حذف" onClick={(e) => { e.stopPropagation(); handleDeleteSale(s); }} className="icon-btn" aria-label="delete">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {selectedSale ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card max-w-3xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">تفاصيل البيع — {selectedSale.id}</h3>
              <div>
                <button onClick={() => setSelectedSale(null)} className="btn-secondary small-btn">إغلاق</button>
              </div>
            </div>
            <div className="mb-4 text-sm text-slate-600">النوع: {selectedSale.type === 'detailed' ? 'مفصل' : 'سريع'} · التاريخ: {formatDateLatin(selectedSale.createdAt)}</div>
            {selectedSale.items && selectedSale.items.length > 0 ? (
              <table className="data-table w-full">
                <thead>
                  <tr><th>المنتج</th><th>كمية</th><th>سعر</th><th>المجموع</th></tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.productName}</td>
                      <td>{it.quantity}</td>
                      <td>{it.price}</td>
                      <td>{Number(it.total).toLocaleString('en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-slate-500">لا توجد عناصر في هذا البيع.</div>
            )}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
