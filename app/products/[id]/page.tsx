'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import ErrorState from '../../../components/ErrorState';
import LoadingState from '../../../components/LoadingState';
import { getErrorMessage } from '../../../lib/errors';
import { formatDate, exportToExcel, exportTransactionsToExcel } from '../../../lib/utils';
import { Product, Transaction } from '../../../lib/types';
import { getProductById, loadCategories, loadProductTransactions, updateProduct } from '../../../lib/db';


interface ProductDetailsProps {
  params: { id: string };
}

export default function ProductDetailsPage({ params }: ProductDetailsProps) {
  return <ProductDetailsClient productId={params.id} />;
}

function ProductDetailsClient({ productId }: { productId: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [unit, setUnit] = useState('حبة');
  const [unitSize, setUnitSize] = useState('1');
  const [cost, setCost] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const item = await getProductById(productId);
        if (item) {
          setProduct(item);
          setName(item.name);
          setCategory(item.category);
          setUnit(item.unit ?? 'حبة');
          setUnitSize(String(item.unitSize ?? 1));
          setCost(item.cost !== undefined && item.cost !== null ? String(item.cost) : '');
          setQuantity(String(item.quantity));
          setNotes(item.notes);
        }
        setCategories(await loadCategories());
        setTransactions(await loadProductTransactions(productId));
      } catch (err) {
        setLoadError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [productId]);

  const selectedCategory = useMemo(
    () => (category === 'أخرى' ? customCategory.trim() || 'أخرى' : category),
    [category, customCategory],
  );

  if (loading) {
    return (
      <AppShell title="تفاصيل المنتج">
        <LoadingState />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="تفاصيل المنتج">
        <ErrorState message={loadError} />
      </AppShell>
    );
  }

  if (!product) {
    return (
      <AppShell title="تفاصيل المنتج">
        <div className="card text-right">لا يوجد منتج بهذا المعرف.</div>
      </AppShell>
    );
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const currentQuantity = Number(quantity);
    if (!trimmedName) {
      setError('الرجاء إدخال اسم المنتج.');
      return;
    }
    if (!selectedCategory) {
      setError('الرجاء اختيار التصنيف.');
      return;
    }
    if (!quantity || isNaN(currentQuantity) || currentQuantity < 0) {
      setError('الرجاء إدخال كمية صحيحة.');
      return;
    }

    if (!product) {
      setError('المنتج غير موجود.');
      return;
    }

    try {
      const parsedCost = cost ? Number(cost) : 0;
      const result = await updateProduct(
        product.id,
        trimmedName,
        selectedCategory,
        currentQuantity,
        notes.trim(),
        product.quantity,
        parsedCost,
        unit,
        Number(unitSize),
      );

      if (result.product) {
        setMessage('تم تعديل المنتج بنجاح.');
        setProduct(result.product);
        setTransactions([...(await loadProductTransactions(product.id))]);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'duplicate') {
        setError('يوجد منتج آخر بنفس الاسم.');
      } else {
        setError('حدث خطأ أثناء التعديل.');
      }
    }
  };

  const handleExportProduct = () => {
    exportToExcel(
      ['رقم المنتج', 'اسم المنتج', 'التصنيف', 'الكمية', 'تاريخ الإضافة', 'آخر تحديث', 'الملاحظات'],
      [
        {
          'رقم المنتج': product.id,
          'اسم المنتج': product.name,
          التصنيف: product.category,
          الكمية: product.quantity,
          الوحدة: product.unit ?? 'حبة',
          'حجم الوحدة': product.unitSize ?? 1,
          'سعر/تكلفة': Number(product.cost ?? 0),
          'تاريخ الإضافة': formatDate(product.createdAt),
          'آخر تحديث': formatDate(product.updatedAt),
          الملاحظات: product.notes,
        },
      ],
    );
    window.alert('تم تصدير منتج واحد إلى Excel بنجاح.');
  };

  const handleExportTransactions = () => {
    exportTransactionsToExcel(
      ['رقم العملية', 'اسم المنتج', 'التصنيف', 'نوع العملية', 'الكمية قبل', 'التغيير', 'الكمية بعد', 'التاريخ', 'الملاحظات'],
      transactions.map((txn, index) => ({
        'رقم العملية': index + 1,
        'اسم المنتج': txn.productName,
        التصنيف: txn.category,
        'نوع العملية': txn.operationType,
        'الكمية قبل': txn.quantityBefore,
        'التغيير': txn.quantityChange,
        'الكمية بعد': txn.quantityAfter,
        التاريخ: formatDate(txn.createdAt),
        الملاحظات: txn.notes,
      })),
    );
    window.alert('تم تصدير سجل المنتج بنجاح.');
  };

  return (
    <AppShell title="تفاصيل المنتج">
      <section className="card">
        <form onSubmit={handleSave} className="grid gap-6">
          {error ? <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">{error}</div> : null}
          {message ? <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-green-700">{message}</div> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-right text-sm font-medium text-slate-700">
              اسم المنتج
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="input-field"
              />
            </label>
            <label className="space-y-2 text-right text-sm font-medium text-slate-700">
              التصنيف
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="input-field"
              >
                {categories.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
                <option>أخرى</option>
              </select>
            </label>
            <label className="space-y-2 text-right text-sm font-medium text-slate-700">
              الوحدة
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="input-field">
                <option>حبة</option>
                <option>نص درزن</option>
                <option>درزن</option>
                <option>كرتون</option>
                <option>كورجة</option>
                <option>أخرى</option>
              </select>
            </label>

            <label className="space-y-2 text-right text-sm font-medium text-slate-700">
              حجم الوحدة (عدد القطع)
              <input value={unitSize} onChange={(e) => setUnitSize(e.target.value)} className="input-field" />
            </label>

            <label className="space-y-2 text-right text-sm font-medium text-slate-700">
              سعر/تكلفة الوحدة
              <input value={cost} onChange={(e) => setCost(e.target.value)} className="input-field" type="number" step="0.01" min="0" />
            </label>
            {category === 'أخرى' ? (
              <label className="space-y-2 text-right text-sm font-medium text-slate-700">
                اسم التصنيف الجديد
                <input
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  className="input-field"
                />
              </label>
            ) : null}
            <label className="space-y-2 text-right text-sm font-medium text-slate-700">
              الكمية
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="input-field"
              />
            </label>
          </div>

          <label className="space-y-2 text-right text-sm font-medium text-slate-700">
            الملاحظات
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="input-field"
              rows={4}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary !px-6 !py-3">حفظ التغييرات</button>
            <button type="button" onClick={() => router.push('/products')} className="btn-secondary !px-6 !py-3">
              العودة للمنتجات
            </button>
          </div>
        </form>
      </section>

      <section className="card mt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">السجل الخاص بالمنتج</h2>
            <p className="mt-2 text-sm text-slate-500">عرض جميع العمليات المتعلقة بهذا المنتج.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleExportProduct} className="btn-primary">
              تصدير المنتج
            </button>
            <button type="button" onClick={handleExportTransactions} className="btn-secondary">
              تصدير السجل
            </button>
          </div>
        </div>

        <div className="mt-6 table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>نوع العملية</th>
                <th>قبل</th>
                <th>التغيير</th>
                <th>بعد</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    لا توجد عمليات لهذا المنتج.
                  </td>
                </tr>
              ) : (
                transactions
                  .slice()
                  .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                  .map((txn) => (
                    <tr key={txn.id}>
                      <td className="whitespace-nowrap">{formatDate(txn.createdAt)}</td>
                      <td>{txn.operationType}</td>
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
