interface LoadingStateProps {
  label?: string;
}

export default function LoadingState({ label = 'جاري تحميل البيانات...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-white p-12 shadow-soft">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-sand-200 border-t-sand-600" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
