interface StatCardProps {
  label: string;
  value: string | number;
  accent?: string;
}

export default function StatCard({ label, value, accent = 'bg-sand-100' }: StatCardProps) {
  return (
    <div className={`rounded-3xl border border-sand-200 p-5 shadow-soft ${accent}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
