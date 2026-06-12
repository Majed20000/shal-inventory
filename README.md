# Alshal Alarabi Inventory System

نظام إدارة منتجات ومخزون محل الشال العربي — **بيانات مشتركة عبر السحابة**.

## الوصف

تطبيق ويب لإدارة المنتجات والكميات وسجل العمليات مع دعم اللغة العربية واتجاه RTL.  
البيانات محفوظة في **Supabase** حتى يتمكن أكثر من شخص من استخدام نفس المخزون عبر الرابط المباشر.

## التقنيات المستخدمة

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase (قاعدة بيانات سحابية)
- XLSX لتصدير Excel

## إعداد Supabase (مطلوب)

1. أنشئ حسابًا في [supabase.com](https://supabase.com).
2. أنشئ مشروعًا جديدًا (Free Tier).
3. من **SQL Editor** نفّذ محتوى الملف `supabase/schema.sql`.
4. من **Project Settings → API** انسخ:
   - `Project URL`
   - `anon public` key
5. أنشئ ملف `.env.local` (محليًا) أو أضف المتغيرات في **Vercel → Environment Variables**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

6. أعد نشر المشروع على Vercel بعد إضافة المتغيرات.

## المشاركة مع آخرين

شارك الرابط المباشر للتطبيق (مثل `https://shal-inventory.vercel.app`) — أي شخص يفتحه يرى ويعدّل **نفس البيانات** لأنها في قاعدة بيانات مشتركة.

## التشغيل للتطوير المحلي

```bash
npm install
cp .env.example .env.local
# عدّل القيم في .env.local
npm run dev
```

ثم افتح `http://localhost:3000` — يستخدم نفس قاعدة البيانات السحابية (ليس تخزينًا محليًا).

## النشر

المشروع منشور على GitHub و Vercel. أي تعديل على فرع `main` يُحدّث الموقع تلقائيًا.

## ملفات مهمة

- `app/page.tsx`: لوحة التحكم
- `app/products/page.tsx`: عرض المنتجات
- `app/products/new/page.tsx`: إضافة منتج
- `app/products/[id]/page.tsx`: تفاصيل المنتج
- `app/transactions/page.tsx`: سجل العمليات
- `lib/db.ts`: عمليات قاعدة البيانات
- `supabase/schema.sql`: إنشاء الجداول
