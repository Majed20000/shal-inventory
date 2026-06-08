'use client';

import Link from 'next/link';

interface AppShellProps {
  title: string;
  children: React.ReactNode;
}

export default function AppShell({ title, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-sand-50 text-slate-900">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6 rounded-3xl border border-sand-200 bg-white/90 p-6 shadow-soft backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-slate-600">نظام إدارة منتجات ومخزون</p>
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              <p className="mt-2 text-sm text-slate-500">الشال العربي - لوحة تحكم المخزون</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="rounded-full bg-sand-500 px-4 py-2 text-white transition hover:bg-sand-600">
                لوحة التحكم
              </Link>
              <Link href="/products" className="rounded-full border border-sand-300 bg-white px-4 py-2 text-slate-700 transition hover:bg-sand-100">
                المنتجات
              </Link>
              <Link href="/products/new" className="rounded-full bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-800">
                إضافة منتج
              </Link>
              <Link href="/transactions" className="rounded-full border border-sand-300 bg-white px-4 py-2 text-slate-700 transition hover:bg-sand-100">
                سجل العمليات
              </Link>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
