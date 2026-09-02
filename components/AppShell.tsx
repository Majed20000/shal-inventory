'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppShellProps {
  title: string;
  children: React.ReactNode;
}

const navItems = [
  { href: '/', label: 'لوحة التحكم' },
  { href: '/products', label: 'المنتجات' },
  { href: '/products/new', label: 'إضافة منتج' },
  { href: '/transactions', label: 'سجل العمليات' },
  { href: '/payments', label: 'المصاريف والمدفوعات' },
  { href: '/sales', label: 'المبيعات' },
  { href: '/analytics', label: 'الأرباح والتحليلات' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (pathname === href) return true;
  // if pathname starts with href + '/' then it's a nested route —
  // mark parent active only when there is no exact nav item for the pathname
  if (pathname.startsWith(`${href}/`)) {
    return !navItems.some((n) => n.href === pathname);
  }
  return false;
}

export default function AppShell({ title, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-50 to-sand-100 text-slate-900">
      <div className="container mx-auto px-4 py-6 lg:px-6">
        <header className="mb-6 overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-soft">
          <div className="bg-gradient-to-l from-sand-600 to-sand-800 px-6 py-5 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-sand-200">نظام إدارة المخزون المشترك</p>
                <h1 className="mt-1 text-2xl font-bold lg:text-3xl">{title}</h1>
                <p className="mt-1 text-sm text-sand-200">الشال العربي</p>
              </div>
              <div className="flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur-sm lg:self-center">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                متصل بالسحابة — بيانات مشتركة
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 border-t border-sand-100 bg-white/80 p-4 backdrop-blur-sm">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-sand-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-sand-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main>{children}</main>

        <footer className="mt-8 pb-4 text-center text-xs text-slate-400">
          الشال العربي — نظام المخزون
        </footer>
      </div>
    </div>
  );
}
