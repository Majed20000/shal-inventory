'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { formatDate, normalizeName, exportToExcel, exportTransactionsToExcel } from '../../../lib/utils';
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
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    async function loadData() {
      const item = await getProductById(productId);
      if (item) {
        setProduct(item);
        setName(item.name);
        setCategory(item.category);
        setQuantity(String(item.quantity));
        setNotes(item.notes);
      }
      setCategories(await loadCategories());
      setTransactions(await loadProductTransactions(productId));
    }
    loadData();
  }, [productId]);

  const selectedCategory = useMemo(
    () => (category === 'أخرى' ? customCategory.trim() || 'أخرى' : category),
    [category, customCategory],
  );

  if (!product) {
    return (
      <AppShell title="تفاصيل المنتج">
        <div className="rounded-3xl bg-white p-6 shadow-soft text-right">لا يوجد منتج بهذا المعرف.</div>
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
      const result = await updateProduct(
        product.id,
        trimmedName,
        selectedCategory,
        currentQuantity,
        notes.trim(),
        product.quantity,
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
      <section className="rounded-3xl bg-white p-6 shadow-soft">
        <form onSubmit={handleSave} className="grid gap-6">
          {error ? <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-700">{error}</div> : null}
          {message ? <div className="rounded-2xl border border-green-300 bg-green-50 p-4 text-green-700">{message}</div> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-right text-sm font-medium text-slate-700">
              اسم المنتج
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-right outline-none focus:border-sand-400"
              />
            </label>
            <label className="space-y-2 text-right text-sm font-medium text-slate-700">
              التصنيف
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-right outline-none focus:border-sand-400"
              >
                {categories.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
                <option>أخرى</option>
              </select>
            </label>
            {category === 'أخرى' ? (
              <label className="space-y-2 text-right text-sm font-medium text-slate-700">
                اسم التصنيف الجديد
                <input
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-right outline-none focus:border-sand-400"
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
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-right outline-none focus:border-sand-400"
              />
            </label>
          </div>

          <label className="space-y-2 text-right text-sm font-medium text-slate-700">
            الملاحظات
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-right outline-none focus:border-sand-400"
              rows={4}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button className="rounded-3xl bg-sand-500 px-6 py-3 text-white transition hover:bg-sand-600">حفظ التغييرات</button>
            <button
              type="button"
              onClick={() => router.push('/products')}
              className="rounded-3xl border border-slate-300 bg-white px-6 py-3 text-slate-700 transition hover:bg-slate-50"
            >
              العودة للمنتجات
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-3xl bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">السجل الخاص بالمنتج</h2>
            <p className="mt-2 text-sm text-slate-500">عرض جميع العمليات المتعلقة بهذا المنتج.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportProduct}
              className="rounded-3xl bg-sand-500 px-4 py-3 text-white transition hover:bg-sand-600"
            >
              تصدير المنتج
            </button>
            <button
              type="button"
              onClick={handleExportTransactions}
              className="rounded-3xl border border-sand-300 bg-white px-4 py-3 text-slate-700 transition hover:bg-sand-100"
            >
              تصدير السجل
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-right">
            <thead className="bg-sand-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-sm">التاريخ</th>
                <th className="px-4 py-3 text-sm">نوع العملية</th>
                <th className="px-4 py-3 text-sm">الكمية قبل</th>
                <th className="px-4 py-3 text-sm">التغيير</th>
                <th className="px-4 py-3 text-sm">الكمية بعد</th>
                <th className="px-4 py-3 text-sm">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    لا توجد عمليات لهذا المنتج.
                  </td>
                </tr>
              ) : (
                transactions
                  .slice()
                  .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                  .map((txn) => (
                    <tr key={txn.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{formatDate(txn.createdAt)}</td>
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
        </div>
      </section>
    </AppShell>
  );
}
