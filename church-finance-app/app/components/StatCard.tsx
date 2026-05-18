import { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
};

export default function StatCard({
  title,
  value,
  helper,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </h2>
          <p className="mt-2 text-xs font-medium text-slate-400">{helper}</p>
        </div>

        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}