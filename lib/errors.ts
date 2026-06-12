export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === 'SUPABASE_NOT_CONFIGURED') {
      return 'قاعدة البيانات غير مُعدّة. أضف مفاتيح Supabase في إعدادات Vercel.';
    }
    return error.message;
  }
  return 'حدث خطأ غير متوقع.';
}
