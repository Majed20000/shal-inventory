import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'نظام الشال العربي',
  description: 'نظام إدارة منتجات ومخزون محل الشال العربي',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
      </body>
    </html>
  );
}
