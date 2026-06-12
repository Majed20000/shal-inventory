'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '../../components/AppShell';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import { getErrorMessage } from '../../lib/errors';
import { filterProducts, formatDate, exportToExcel } from '../../lib/utils';
import { Product } from '../../lib/types';
import { deleteProduct, loadProducts } from '../../lib/db';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [quantityFilter, setQuantityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setProducts(await loadProducts());
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
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

    try {
      await deleteProduct(product.id, product);
      setProducts(await loadProducts());
      window.alert('تم حذف المنتج بنجاح.');
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
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

  if (loading) {
    return (
      <AppShell title="المنتجات">
        <LoadingState />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="المنتجات">
        <ErrorState message={error} />
      </AppShell>
    );
  }

  return (
    <AppShell title="المنتجات">
      <section className="card mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم المنتج أو التصنيف"
            className="input-field"
          />
          <select className="input-field" value={category} onChange={(event) => setCategory(event.target.value)}>
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
            className="input-field"
          />
          <button type="button" onClick={handleExport} className="btn-primary">
            تصدير Excel
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          {filteredProducts.length} منتج من أصل {products.length}
        </p>
      </section>

      <section className="card">
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم</th>
                <th>اسم المنتج</th>
                <th>التصنيف</th>
                <th>الكمية</th>
                <th>آخر تحديث</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    لا توجد منتجات مطابقة.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, index) => (
                  <tr key={product.id}>
                    <td>{index + 1}</td>
                    <td className="font-medium text-slate-800">{product.name}</td>
                    <td>
                      <span className="rounded-lg bg-sand-100 px-2 py-1 text-xs">{product.category}</span>
                    </td>
                    <td className={product.quantity <= 5 ? 'font-semibold text-amber-700' : ''}>{product.quantity}</td>
                    <td className="whitespace-nowrap">{formatDate(product.updatedAt)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/products/${product.id}`} className="btn-secondary !px-3 !py-1.5">
                          عرض
                        </Link>
                        <button type="button" onClick={() => handleDelete(product)} className="btn-danger !px-3 !py-1.5">
                          حذف
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
