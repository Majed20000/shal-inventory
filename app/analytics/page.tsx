'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '../../components/AppShell';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import { loadProducts, loadSales, loadTransactions } from '../../lib/db';
import { Product, Sale, SaleItem, Transaction } from '../../lib/types';
import { getErrorMessage } from '../../lib/errors';

type SaleWithItems = Sale & { items?: SaleItem[] };
type Period = 'all' | 'today' | 'week' | 'month' | 'year';
type Grouping = 'day' | 'week' | 'month';

type HistoryRow = {
  date: string;
  added: number;
  sold: number;
  remaining: number;
};

interface ProductMetric {
  id: string;
  name: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface TimeMetric {
  label: string;
  revenue: number;
  profit: number;
}

const currency = (value: number) => `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س`;
const integer = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 });

function startOfPeriod(period: Period) {
  const now = new Date();
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') {
    const day = now.getDay();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1));
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  return null;
}

function formatDate(date: Date, grouping: Grouping) {
  if (grouping === 'month') return date.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' });
  return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}

function groupDate(date: Date, grouping: Grouping) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (grouping === 'month') return new Date(result.getFullYear(), result.getMonth(), 1).getTime();
  if (grouping === 'week') {
    const day = result.getDay();
    result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  }
  return result.getTime();
}

function matchesPeriod(date: Date, period: Period | 'custom', customFrom?: string, customTo?: string) {
  if (period !== 'all' && period !== 'custom') {
    const start = startOfPeriod(period);
    if (start && date < start) return false;
  }
  if (customFrom && new Date(date) < new Date(customFrom)) return false;
  if (customTo && new Date(date) > new Date(customTo)) return false;
  return true;
}

function MetricCard({
  label,
  value,
  accent,
  icon,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  accent: string;
  icon?: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className={`metric-card group rounded-[26px] border p-5 shadow-soft transition-all duration-300 ${accent}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <div className="mt-3 text-2xl font-black tabular-nums text-slate-900">{value}</div>
        </div>
        {icon ? <div className="metric-icon flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 shadow-sm">{icon}</div> : null}
      </div>
    </div>
  );
}

function AnimatedNumber({ value, format = 'number' }: { value: number; format?: 'number' | 'currency' | 'percent' }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 750;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(value * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const text =
    format === 'currency'
      ? currency(display)
      : format === 'percent'
        ? `${display.toFixed(1)}%`
        : `${integer(display)}${display % 1 === 0 ? '' : ''}`;

  return <>{text}</>;
}

export default function AnalyticsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [period, setPeriod] = useState<Period | 'custom'>('all');
  const [grouping, setGrouping] = useState<Grouping>('day');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [loadedProducts, loadedSales, loadedTransactions] = await Promise.all([
          loadProducts(),
          loadSales(),
          loadTransactions(),
        ]);
        setProducts(loadedProducts);
        setSales(loadedSales);
        setTransactions(loadedTransactions);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const visibleSales = useMemo(() => {
    const start = period === 'custom' ? null : startOfPeriod(period);
    return sales.filter((sale) => {
      if (!matchesPeriod(new Date(sale.createdAt), period === 'custom' ? 'all' : period, dateFrom, dateTo)) return false;
      if (start && new Date(sale.createdAt) < start) return false;
      return true;
    });
  }, [sales, period, dateFrom, dateTo]);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const matchingProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      const haystack = `${product.name} ${product.id} ${product.normalizedName || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [products, productSearch]);

  const selectedProduct = useMemo(() => {
    if (matchingProducts.length === 0) return null;
    return matchingProducts[0];
  }, [matchingProducts]);

  const productMetrics = useMemo(() => {
    const byProduct = new Map<string, ProductMetric>();
    let revenue = 0;
    let knownRevenue = 0;
    let cost = 0;
    let units = 0;
    let knownProfitUnits = 0;

    visibleSales.forEach((sale) => {
      revenue += Number(sale.totalAmount || 0);
      (sale.items || []).forEach((item) => {
        const quantity = Number(item.quantity || 0);
        const itemRevenue = Number(item.total || item.price * quantity || 0);
        const product = item.productId ? productMap.get(item.productId) : undefined;
        const itemCost = product ? Number(product.cost || 0) * quantity : 0;
        const key = item.productId || `unmatched-${item.productName}`;
        const previous = byProduct.get(key) || { id: key, name: item.productName, units: 0, revenue: 0, cost: 0, profit: 0 };
        byProduct.set(key, {
          ...previous,
          units: previous.units + quantity,
          revenue: previous.revenue + itemRevenue,
          cost: previous.cost + itemCost,
          profit: previous.profit + (product ? itemRevenue - itemCost : 0),
        });
        units += quantity;
        if (product) {
          knownRevenue += itemRevenue;
          cost += itemCost;
          knownProfitUnits += quantity;
        }
      });
    });

    const productMetricsList = Array.from(byProduct.values()).sort((a, b) => b.profit - a.profit);
    return { revenue, knownRevenue, cost, units, transactions: visibleSales.length, profit: knownRevenue - cost, knownProfitUnits, productMetricsList };
  }, [visibleSales, productMap]);

  const topProfit = productMetrics.productMetricsList.filter((item) => item.cost > 0 || item.profit !== 0).slice(0, 8);
  const topUnits = [...productMetrics.productMetricsList].sort((a, b) => b.units - a.units).slice(0, 5);
  const chartMax = Math.max(...topProfit.map((item) => item.profit), 1);

  const timeMetrics = useMemo(() => {
    const grouped = new Map<number, TimeMetric>();
    visibleSales.forEach((sale) => {
      const date = new Date(sale.createdAt);
      const key = groupDate(date, grouping);
      const previous = grouped.get(key) || { label: formatDate(new Date(key), grouping), revenue: 0, profit: 0 };
      const saleProfit = (sale.items || []).reduce((sum, item) => {
        const product = item.productId ? productMap.get(item.productId) : undefined;
        if (!product) return sum;
        const quantity = Number(item.quantity || 0);
        return sum + Number(item.total || item.price * quantity || 0) - Number(product.cost || 0) * quantity;
      }, 0);
      grouped.set(key, { ...previous, revenue: previous.revenue + Number(sale.totalAmount || 0), profit: previous.profit + saleProfit });
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a - b).slice(-18).map(([, value]) => value);
  }, [visibleSales, grouping, productMap]);
  const timeMax = Math.max(...timeMetrics.map((item) => item.revenue), 1);

  const selectedProductHistory = useMemo<HistoryRow[]>(() => {
    if (!selectedProduct) return [];
    const records = transactions
      .filter((txn) => txn.productId === selectedProduct.id)
      .filter((txn) => matchesPeriod(new Date(txn.createdAt), period === 'custom' ? 'all' : period, dateFrom, dateTo))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let running = 0;
    return records.map((txn) => {
      const added = txn.quantityChange > 0 ? Number(txn.quantityChange) : 0;
      const sold = txn.quantityChange < 0 ? Math.abs(Number(txn.quantityChange)) : 0;
      running += added - sold;
      return {
        date: new Date(txn.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }),
        added,
        sold,
        remaining: running,
      };
    });
  }, [selectedProduct, transactions, period, dateFrom, dateTo]);

  const productStats = useMemo(() => {
    if (!selectedProduct) {
      return { totalAdded: 0, totalSold: 0, remaining: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
    }

    const records = transactions.filter((txn) => txn.productId === selectedProduct.id);
    const totalSold = records.reduce((sum, txn) => sum + (txn.quantityChange < 0 ? Math.abs(Number(txn.quantityChange)) : 0), 0);
    const totalAddedFromTransactions = records.reduce(
      (sum, txn) => sum + (txn.quantityChange > 0 ? Math.abs(Number(txn.quantityChange)) : 0),
      0,
    );
    const currentStock = Number(selectedProduct.quantity || 0);
    const totalIncoming = totalAddedFromTransactions > 0 ? totalAddedFromTransactions : Math.max(currentStock + totalSold, 0);
    const remaining = currentStock > 0 ? currentStock : Math.max(totalIncoming - totalSold, 0);

    const revenueFromSales = visibleSales.reduce((sum, sale) => {
      const saleItems = (sale.items || []).filter((item) => item.productId === selectedProduct.id);
      return sum + saleItems.reduce((sub, item) => sub + Number(item.total || item.price * item.quantity || 0), 0);
    }, 0);
    const costFromSales = selectedProduct.cost ? totalSold * Number(selectedProduct.cost) : 0;
    const profit = revenueFromSales - costFromSales;
    const margin = revenueFromSales > 0 ? (profit / revenueFromSales) * 100 : 0;

    return {
      totalAdded: totalIncoming,
      totalSold,
      remaining,
      revenue: revenueFromSales,
      cost: costFromSales,
      profit,
      margin,
    };
  }, [selectedProduct, transactions, visibleSales]);

  if (loading) return <AppShell title="الأرباح والتحليلات"><LoadingState /></AppShell>;
  if (error) return <AppShell title="الأرباح والتحليلات"><ErrorState message={error} /></AppShell>;

  return (
    <AppShell title="الأرباح والتحليلات">
      <div className="mb-6 rounded-2xl border border-sand-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-slate-600">بحث المنتج</label>
            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="ابحث باسم المنتج أو معرفه"
              className="control"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'today', 'week', 'month', 'year', 'custom'] as Array<Period | 'custom'>).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setPeriod(value);
                  if (value !== 'custom') {
                    setDateFrom('');
                    setDateTo('');
                  }
                }}
                className={`rounded-xl px-3 py-2 text-sm transition ${period === value ? 'bg-sand-600 text-white' : 'bg-sand-50 text-slate-600 hover:bg-sand-100'}`}
              >
                {value === 'all' ? 'كل الفترة' : value === 'today' ? 'اليوم' : value === 'week' ? 'هذا الأسبوع' : value === 'month' ? 'هذا الشهر' : value === 'year' ? 'هذه السنة' : 'مخصصة'}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="control" />
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="control" />
          </div>
        ) : null}

        {matchingProducts.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {matchingProducts.slice(0, 6).map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setProductSearch(product.name)}
                className={`rounded-xl border px-3 py-2 text-sm ${selectedProduct?.id === product.id ? 'border-sand-500 bg-sand-100 text-sand-800' : 'border-sand-200 bg-white text-slate-600'}`}
              >
                {product.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="إجمالي الأرباح المعروفة" value={currency(productMetrics.profit)} accent="border-emerald-200 bg-emerald-50/70" />
        <MetricCard label="إجمالي الإيرادات" value={currency(productMetrics.revenue)} accent="border-sand-200 bg-white" />
        <MetricCard label="إجمالي التكلفة المعروفة" value={currency(productMetrics.cost)} accent="border-amber-200 bg-amber-50/70" />
        <MetricCard label="عدد المنتجات المباعة" value={`${integer(productMetrics.units)} وحدة`} accent="border-slate-200 bg-slate-50" />
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-sand-100 bg-white p-4 shadow-soft"><span className="text-sm text-slate-500">عدد المعاملات</span><strong className="mr-2 text-lg text-slate-900">{integer(productMetrics.transactions)}</strong></div>
        <div className="rounded-2xl border border-sand-100 bg-white p-4 shadow-soft"><span className="text-sm text-slate-500">وحدات مرتبطة بتكلفة</span><strong className="mr-2 text-lg text-slate-900">{integer(productMetrics.knownProfitUnits)}</strong></div>
      </div>

      <section className="card mt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-900">الأرباح حسب المنتج</h2><p className="mt-1 text-sm text-slate-500">ترتيب تنازلي حسب الربح المحسوب</p></div></div>
        {topProfit.length === 0 ? <p className="text-slate-500">لا توجد مبيعات مرتبطة بمنتجات وتكلفة حتى الآن.</p> : <div className="grid gap-4">{topProfit.map((item) => <div key={item.id}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-medium text-slate-800">{item.name}</span><span className="font-semibold text-emerald-700">{currency(item.profit)}</span></div><div className="h-3 overflow-hidden rounded-full bg-sand-100"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${Math.max((item.profit / chartMax) * 100, item.profit > 0 ? 3 : 0)}%` }} /></div></div>)}</div>}
      </section>

      <section className="card mt-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">أفضل المنتجات من حيث الأرباح</h2>
        <div className="table-shell"><table className="data-table"><thead><tr><th>المنتج</th><th>الوحدات</th><th>الإيرادات</th><th>التكلفة</th><th>الربح</th><th>هامش الربح</th></tr></thead><tbody>{topProfit.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-slate-500">لا توجد بيانات كافية.</td></tr> : topProfit.map((item) => <tr key={item.id}><td className="font-medium text-slate-800">{item.name}</td><td>{integer(item.units)}</td><td>{currency(item.revenue)}</td><td>{currency(item.cost)}</td><td className="font-semibold text-emerald-700">{currency(item.profit)}</td><td>{item.revenue ? `${((item.profit / item.revenue) * 100).toFixed(1)}%` : '—'}</td></tr>)}</tbody></table></div>
      </section>

      <section className="card mt-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">الأكثر مبيعًا</h2>
        <div className="grid gap-3 md:grid-cols-5">{topUnits.length === 0 ? <p className="text-slate-500">لا توجد مبيعات مفصلة حتى الآن.</p> : topUnits.map((item, index) => <div key={item.id} className="rounded-2xl border border-sand-100 bg-sand-50 p-4"><div className="text-xs text-sand-700">#{index + 1}</div><div className="mt-2 font-semibold text-slate-900">{item.name}</div><div className="mt-2 text-sm text-slate-600">{integer(item.units)} وحدة</div><div className="mt-1 text-sm text-slate-600">{currency(item.revenue)}</div><div className="mt-1 text-sm font-medium text-emerald-700">{currency(item.profit)} ربح</div></div>)}</div>
      </section>

      <section className="card mt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-900">المبيعات عبر الزمن</h2><p className="mt-1 text-sm text-slate-500">الإيرادات باللون الرملي والربح باللون الأخضر</p></div><div className="flex gap-2">{([['day', 'يومي'], ['week', 'أسبوعي'], ['month', 'شهري']] as [Grouping, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => setGrouping(value)} className={`rounded-xl px-3 py-2 text-sm ${grouping === value ? 'bg-sand-600 text-white' : 'bg-sand-50 text-slate-600'}`}>{label}</button>)}</div></div>
        {timeMetrics.length === 0 ? <p className="text-slate-500">لا توجد مبيعات ضمن الفترة المحددة.</p> : <div className="grid gap-3">{timeMetrics.map((item) => <div key={item.label} className="grid grid-cols-[4.5rem_1fr_5rem] items-center gap-3 text-sm"><span className="text-slate-500">{item.label}</span><div className="h-7 overflow-hidden rounded-lg bg-sand-100"><div className="flex h-full min-w-1 items-center rounded-lg bg-sand-600 px-2 text-xs text-white transition-all" style={{ width: `${Math.max((item.revenue / timeMax) * 100, 3)}%` }}>{currency(item.revenue)}</div></div><span className="text-left text-xs font-medium text-emerald-700">{currency(item.profit)}</span></div>)}</div>}
      </section>

      {selectedProduct ? (
        <section className="card mt-6 overflow-hidden">
          <div className="mb-6 rounded-[28px] border border-sand-200 bg-gradient-to-br from-white via-sand-50 to-sand-100 p-5 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sand-600 to-sand-800 text-xl font-black text-white shadow-lg shadow-sand-200/60">
                  {selectedProduct.name.slice(0, 1)}
                </div>
                <div>
                  <p className="text-xs font-medium text-sand-700">تفاصيل المنتج</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">{selectedProduct.name}</h2>
                </div>
              </div>
              <div className="rounded-2xl border border-sand-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm">
                <p className="text-[11px] text-slate-500">Product ID</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{selectedProduct.id}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="إجمالي الكمية الداخلة للمخزون"
              value={<AnimatedNumber value={productStats.totalAdded} format="number" />}
              accent="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
              delay={0}
              icon={<svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            />
            <MetricCard
              label="إجمالي المبيعات"
              value={<AnimatedNumber value={productStats.totalSold} format="number" />}
              accent="border-amber-200 bg-gradient-to-br from-amber-50 to-white"
              delay={60}
              icon={<svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-700" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16v10H4z" /><path d="M8 11h8M8 15h5" strokeLinecap="round" /></svg>}
            />
            <MetricCard
              label="الكمية المتبقية"
              value={<AnimatedNumber value={productStats.remaining} format="number" />}
              accent="border-sky-200 bg-gradient-to-br from-sky-50 to-white"
              delay={120}
              icon={<svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-700" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9.5V5h16v4.5M6 19h12a2 2 0 0 0 2-2v-6H4v6a2 2 0 0 0 2 2Z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            />
            <MetricCard
              label="إجمالي الإيرادات"
              value={<AnimatedNumber value={productStats.revenue} format="currency" />}
              accent="border-sand-200 bg-gradient-to-br from-sand-50 to-white"
              delay={180}
              icon={<svg viewBox="0 0 24 24" className="h-5 w-5 text-sand-700" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5.5c0-1.93-2.24-3.5-5-3.5S7 3.57 7 5.5 9.24 9 12 9s5 1.57 5 3.5S14.76 16 12 16s-5-1.57-5-3.5" strokeLinecap="round" /></svg>}
            />
            <MetricCard
              label="إجمالي التكلفة"
              value={<AnimatedNumber value={productStats.cost} format="currency" />}
              accent="border-rose-200 bg-gradient-to-br from-rose-50 to-white"
              delay={240}
              icon={<svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-700" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16M12 4v16" strokeLinecap="round" /></svg>}
            />
            <MetricCard
              label="إجمالي الأرباح"
              value={<AnimatedNumber value={productStats.profit} format="currency" />}
              accent="border-violet-200 bg-gradient-to-br from-violet-50 to-white"
              delay={300}
              icon={<svg viewBox="0 0 24 24" className="h-5 w-5 text-violet-700" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 15.5 12 9l6 6.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 9V5M6 19h12" strokeLinecap="round" /></svg>}
            />
            <MetricCard
              label="هامش الربح"
              value={<AnimatedNumber value={productStats.margin} format="percent" />}
              accent="border-cyan-200 bg-gradient-to-br from-cyan-50 to-white"
              delay={360}
              icon={<svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-700" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 18 10 12l4 4 6-8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            />
          </div>

          <div className="mt-6 rounded-[28px] border border-sand-200 bg-gradient-to-br from-sand-50 via-white to-emerald-50/60 p-6 shadow-soft">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-sand-700">ملخص المخزون</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">إجمالي المخزون المضاف</h3>
                <p className="mt-2 text-sm text-slate-500">دخل المخزون + الباقي من المخزون</p>
              </div>
              <div className="rounded-3xl border border-sand-200 bg-white px-8 py-5 text-center shadow-sm">
                <p className="text-4xl font-black tabular-nums text-sand-800">
                  <AnimatedNumber value={productStats.totalAdded + productStats.remaining} format="number" />
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">وحدة</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-xs text-emerald-700">دخل المخزون</p>
                <p className="mt-1 text-2xl font-black text-emerald-900">{integer(productStats.totalAdded)} <span className="text-sm font-medium">وحدة</span></p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                <p className="text-xs text-sky-700">الباقي من المخزون</p>
                <p className="mt-1 text-2xl font-black text-sky-900">{integer(productStats.remaining)} <span className="text-sm font-medium">وحدة</span></p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-lg font-bold text-slate-900">السجل التاريخي</h3>
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>الكمية المضافة</th>
                    <th>المبيعات</th>
                    <th>المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProductHistory.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-500">لا توجد بيانات تاريخية لهذا المنتج في الفترة الحالية.</td></tr>
                  ) : (
                    selectedProductHistory.map((row) => (
                      <tr key={`${row.date}-${row.added}-${row.sold}`}>
                        <td>{row.date}</td>
                        <td>{row.added > 0 ? integer(row.added) : '—'}</td>
                        <td>{row.sold > 0 ? integer(row.sold) : '—'}</td>
                        <td className="font-medium text-slate-800">{integer(row.remaining)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : (
        <div className="card mt-6">
          <p className="text-slate-500">لا يوجد منتج مطابق للبحث الحالي. جرّب اسم منتج أو معرفه.</p>
        </div>
      )}

      <p className="mt-4 text-xs leading-6 text-slate-500">ملاحظة: التوزيع الحقيقي ل"إجمالي الكمية المضافة" يتم من جدول المعاملات، حيث نجمع كل الزيادات الموجبة فقط. لا يتم استخدام الرصيد الحالي كإجمالي للإضافة، ولا يتم استخدام عدد الوحدات المباعة كإجمالي للإضافة.</p>
    </AppShell>
  );
}