'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import ErrorState from '../../../components/ErrorState';
import LoadingState from '../../../components/LoadingState';
import ProductNameInput from '../../../components/ProductNameInput';
import { getErrorMessage } from '../../../lib/errors';
import { addOrUpdateProduct, loadCategories, loadProducts } from '../../../lib/db';
import { Product } from '../../../lib/types';
import { normalizeName } from '../../../lib/utils';

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('شماغ');
  const [customCategory, setCustomCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('حبة');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [loadedCategories, loadedProducts] = await Promise.all([loadCategories(), loadProducts()]);
        setCategories(loadedCategories);
        setProducts(loadedProducts);
      } catch (err) {
        setLoadError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const selectedCategory = useMemo(
    () => (category === 'أخرى' ? customCategory.trim() || 'أخرى' : category),
    [category, customCategory],
  );

  const matchedProduct = useMemo(() => {
    const normalized = normalizeName(name);
    if (!normalized) return null;
    return products.find((product) => !product.deletedAt && normalizeName(product.name) === normalized) ?? null;
  }, [name, products]);

  const handleSelectProduct = (product: Product) => {
    setCategory(categories.includes(product.category) ? product.category : 'أخرى');
    if (!categories.includes(product.category)) {
      setCustomCategory(product.category);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
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
    const currentCost = cost ? Number(cost) : undefined;
    if (!quantity || isNaN(currentQuantity) || currentQuantity <= 0) {
      setError('الرجاء إدخال كمية صحيحة.');
      return;
    }

    if (cost && (isNaN(Number(cost)) || Number(cost) < 0)) {
      setError('الرجاء إدخال سعر/تكلفة صحيحة أو اتركها فارغة.');
      return;
    }

    const unitSizes: Record<string, number> = {
      'حبة': 1,
      'نص درزن': 6,
      'درزن': 12,
      'كرتون': 5,
      'كورجة': 20,
    };
    const selectedUnitSize = unitSizes[unit] ?? 1;
    const totalPieces = currentQuantity * selectedUnitSize;

    const result = await addOrUpdateProduct(
      trimmedName,
      selectedCategory,
      totalPieces,
      notes.trim(),
      currentCost,
      unit,
      selectedUnitSize,
    );

    if (result.product) {
      setMessage(
        result.transaction?.operationType === 'زيادة كمية'
          ? 'المنتج موجود مسبقًا، وتم تحديث الكمية.'
          : 'تم إضافة المنتج بنجاح.',
      );
      setName('');
      setQuantity('');
      setNotes('');
      setCustomCategory('');
      setTimeout(() => {
        router.push('/products');
      }, 800);
    } else {
      setError(result.error || 'حدث خطأ أثناء حفظ المنتج.');
    }
  };

  if (loading) {
    return (
      <AppShell title="إضافة منتج جديد">
        <LoadingState />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="إضافة منتج جديد">
        <ErrorState message={loadError} />
      </AppShell>
    );
  }

  return (
    <AppShell title="إضافة منتج جديد">
      <section className="card">
        <form onSubmit={handleSubmit} className="grid gap-5">
          {error ? <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">{error}</div> : null}
          {message ? <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-green-700">{message}</div> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-right text-sm font-medium text-slate-700">
              اسم المنتج
              <ProductNameInput
                value={name}
                onChange={setName}
                products={products}
                onSelectProduct={handleSelectProduct}
              />
              <span className="block text-xs font-normal text-slate-500">
                اكتب الاسم لعرض منتجات موجودة — اختر واحدًا لإضافة كمية له
              </span>
            </label>

            {matchedProduct ? (
              <div className="rounded-xl border border-sand-300 bg-sand-50 p-4 text-sm text-sand-900 lg:col-span-2">
                <p className="font-semibold">منتج موجود في المخزون</p>
                <p className="mt-1 text-sand-800">
                  التصنيف: {matchedProduct.category} · الكمية الحالية: {matchedProduct.quantity}
                </p>
                <p className="mt-1 text-xs text-sand-700">سيتم إضافة الكمية المدخلة إلى المخزون الحالي عند الحفظ.</p>
              </div>
            ) : null}

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
              الكمية {matchedProduct ? '(تُضاف إلى المخزون)' : ''}
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="input-field"
              />
            </label>

            <label className="space-y-2 text-right text-sm font-medium text-slate-700">
              الوحدة
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="input-field">
                <option>حبة</option>
                <option>نص درزن</option>
                <option>درزن</option>
                <option>كرتون</option>
                <option>كورجة</option>
              </select>
              <span className="block text-xs font-normal text-slate-500">اختر وحدة التعبئة للكمية المدخلة</span>
            </label>

            <label className="space-y-2 text-right text-sm font-medium text-slate-700">
              سعر/تكلفة الوحدة (اختياري)
              <input
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                className="input-field"
              />
            </label>
          </div>

          <label className="space-y-2 text-right text-sm font-medium text-slate-700">
            الملاحظات (اختياري)
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="input-field"
              rows={4}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary !px-6 !py-3">
              {matchedProduct ? 'إضافة الكمية' : 'إضافة المنتج'}
            </button>
            <button type="button" onClick={() => router.push('/products')} className="btn-secondary !px-6 !py-3">
              إلغاء
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
