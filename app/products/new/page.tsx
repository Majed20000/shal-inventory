'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { addOrUpdateProduct, loadCategories } from '../../../lib/db';


export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('شماغ');
  const [customCategory, setCustomCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setCategories(await loadCategories());
    }
    load();
  }, []);

  const selectedCategory = useMemo(() => (category === 'أخرى' ? customCategory.trim() || 'أخرى' : category), [category, customCategory]);

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
    if (!quantity || isNaN(currentQuantity) || currentQuantity <= 0) {
      setError('الرجاء إدخال كمية صحيحة.');
      return;
    }

    const categoryValue = selectedCategory;
    const result = await addOrUpdateProduct(trimmedName, categoryValue, currentQuantity, notes.trim());

    if (result.product) {
      setMessage(result.transaction?.operationType === 'زيادة كمية' ? 'المنتج موجود مسبقًا، وتم تحديث الكمية.' : 'تم إضافة المنتج بنجاح.');
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

  return (
    <AppShell title="إضافة منتج جديد">
      <section className="rounded-3xl bg-white p-6 shadow-soft">
        <form onSubmit={handleSubmit} className="grid gap-5">
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
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-right outline-none focus:border-sand-400"
              />
            </label>
          </div>

          <label className="space-y-2 text-right text-sm font-medium text-slate-700">
            الملاحظات (اختياري)
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-right outline-none focus:border-sand-400"
              rows={4}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button className="rounded-3xl bg-sand-500 px-6 py-3 text-white transition hover:bg-sand-600">
              إضافة المنتج
            </button>
            <button type="button" onClick={() => router.push('/products')} className="rounded-3xl border border-slate-300 bg-white px-6 py-3 text-slate-700 transition hover:bg-slate-50">
              إلغاء
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
