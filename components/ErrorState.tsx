interface ErrorStateProps {
  message?: string;
}

export default function ErrorState({
  message = 'تعذر الاتصال بقاعدة البيانات. تأكد من إعداد Supabase في متغيرات البيئة.',
}: ErrorStateProps) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-soft">
      <p className="text-lg font-semibold text-red-800">خطأ في تحميل البيانات</p>
      <p className="mt-3 text-sm text-red-700">{message}</p>
    </div>
  );
}
