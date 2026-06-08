# Alshal Alarabi Inventory System

نظام إدارة منتجات ومخزون محل الشال العربي.

## الوصف

تطبيق ويب لإدارة المنتجات والكميات وسجل العمليات مع دعم اللغة العربية واتجاه RTL.

## التقنيات المستخدمة

- Next.js
- React
- TypeScript
- Tailwind CSS
- XLSX لتصدير Excel

## التشغيل محليًا

1. افتح الطرفية في مجلد المشروع.
2. ثبّت الحزم:
   ```bash
   npm install
   ```
3. شغّل التطبيق:
   ```bash
   npm run dev
   ```
4. افتح المتصفح على:
   ```bash
   http://localhost:3000
   ```

## ملاحظات

- التطبيق يستخدم `localStorage` لحفظ البيانات محليًا إذا لم يكن Supabase مفعلاً.
- لإضافة دعم قاعدة بيانات، يمكن ربط التطبيق مع Supabase.

## إعداد Supabase

1. أنشئ حسابًا في https://supabase.com.
2. أنشئ مشروع جديد واختر Free Tier.
3. في علامة `Table Editor` أنشئ جدولًا باسم `products` وحقول:
   - `id` (text, primary key)
   - `name` (text)
   - `normalized_name` (text)
   - `category` (text)
   - `quantity` (integer)
   - `notes` (text)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)
   - `deleted_at` (timestamp, nullable)
4. أنشئ جدولًا باسم `transactions` وحقول:
   - `id` (text, primary key)
   - `product_id` (text)
   - `product_name` (text)
   - `category` (text)
   - `operation_type` (text)
   - `quantity_before` (integer)
   - `quantity_change` (integer)
   - `quantity_after` (integer)
   - `notes` (text)
   - `created_at` (timestamp)
5. انسخ `SUPABASE_URL` و `SUPABASE_ANON_KEY` من إعدادات المشروع.
6. أنشئ ملف `.env.local` في جذر المشروع وضع القيم:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## النشر

يمكن رفع هذا المشروع إلى GitHub ثم نشره على Vercel.

## ملفات مهمة

- `app/page.tsx`: لوحة التحكم.
- `app/products/page.tsx`: عرض المنتجات.
- `app/products/new/page.tsx`: إضافة منتج.
- `app/products/[id]/page.tsx`: تفاصيل المنتج.
- `app/transactions/page.tsx`: سجل العمليات.
