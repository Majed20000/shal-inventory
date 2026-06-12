interface StatCardProps {
  label: string;
  value: string | number;
  accent?: 'default' | 'warning' | 'primary' | 'dark';
}

const accents = {
  default: 'border-sand-200 bg-gradient-to-br from-white to-sand-50',
  warning: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',
  primary: 'border-sand-300 bg-gradient-to-br from-sand-100 to-white',
  dark: 'border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 text-white',
};

const labelColors = {
  default: 'text-slate-500',
  warning: 'text-amber-700',
  primary: 'text-sand-700',
  dark: 'text-sand-200',
};

const valueColors = {
  default: 'text-slate-900',
  warning: 'text-amber-900',
  primary: 'text-sand-900',
  dark: 'text-white',
};

export default function StatCard({ label, value, accent = 'default' }: StatCardProps) {
  return (
    <div className={`rounded-2xl border p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-md ${accents[accent]}`}>
      <p className={`text-sm font-medium ${labelColors[accent]}`}>{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${valueColors[accent]}`}>{value}</p>
    </div>
  );
}
