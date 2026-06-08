'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '../../components/AppShell';
import { filterProducts, formatDate, exportToExcel } from '../../lib/utils';
import { Product } from '../../lib/types';
import { deleteProduct, loadProducts } from '../../lib/db';


export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [quantityFilter, setQuantityFilter] = useState('');

  useEffect(() => {
    async function load() {
      setProducts(await loadProducts());
    }
    load();
  }, []);

  const filteredProducts = useMemo(
    () => filterProducts(products, search, category, quantityFilter ? Number(quantityFilter) : null),
    [products, search, category, quantityFilter],
  );

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm('هل أنت متأكد من حذف هذا المنتج؟');
    if (!confirmed) return;

    await deleteProduct(product.id, product);
    setProducts(await loadProducts());
    window.alert('تم حذف المنتج بنجاح.');
  };

  const handleExport = () => {
    const rows = filteredProducts.map((product, index) => ({
      'رقم المنتج': index + 1,
      'اسم المنتج': product.name,
      التصنيف: product.category,
      الكمية: product.quantity,
      'تاريخ الإضافة': formatDate(product.createdAt),
      'آخر تحديث': formatDate(product.updatedAt),
      الملاحظات: product.notes,
    }));
    exportToExcel(
      ['رقم المنتج', 'اسم المنتج', 'التصنيف', 'الكمية', 'تاريخ الإضافة', 'آخر تحديث', 'الملاحظات'],
      rows,
    );
    window.alert('تم تصدير ملف Excel بنجاح.');
  };

  return (
    <AppShell title="المنتجات">
      <section className="mb-6 rounded-3xl bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم المنتج أو التصنيف"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-sand-400 focus:outline-none"
            />
            <select
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>الكل</option>
              <option>شماغ</option>
              <option>ملابس</option>
              <option>سبح</option>
            </select>
            <input
              type="number"
              min="0"
              value={quantityFilter}
              onChange={(event) => setQuantityFilter(event.target.value)}
              placeholder="أقل من كمية"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right focus:border-sand-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleExport}
              className="rounded-2xl bg-sand-500 px-5 py-3 text-white transition hover:bg-sand-600"
            >
              تصدير Excel
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-3xl bg-white p-6 shadow-soft">
        <table className="min-w-full text-right">
          <thead className="bg-sand-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-sm">رقم</th>
              <th className="px-4 py-3 text-sm">اسم المنتج</th>
              <th className="px-4 py-3 text-sm">التصنيف</th>
              <th className="px-4 py-3 text-sm">الكمية</th>
              <th className="px-4 py-3 text-sm">آخر تحديث</th>
              <th className="px-4 py-3 text-sm">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  لا توجد منتجات مطابقة.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product, index) => (
                <tr key={product.id}>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{index + 1}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{product.name}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{product.category}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{product.quantity}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{formatDate(product.updatedAt)}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/products/${product.id}`} className="rounded-full border border-sand-300 bg-white px-3 py-2 text-slate-700 transition hover:bg-sand-100">
                        عرض
                      </Link>
                      <Link href={`/products/${product.id}`} className="rounded-full border border-sand-300 bg-white px-3 py-2 text-slate-700 transition hover:bg-sand-100">
                        تعديل
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(product)}
                        className="rounded-full bg-red-500 px-3 py-2 text-white transition hover:bg-red-600"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
