import { Clock3 } from "lucide-react";

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
        {label}
      </span>
      <input
        aria-label={label}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-sm text-[#1e293b] focus:border-[#3b82f6] focus:outline-none"
      />
    </label>
  );
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onThisWeek,
  onThisMonth,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onThisWeek: () => void;
  onThisMonth: () => void;
}) {
  return (
    <section className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-[#e2e8f0] bg-white px-5 py-4 lg:mb-4 lg:shrink-0 lg:py-3">
      <div className="flex items-center gap-3">
        <DateField label="From" value={from} onChange={onFromChange} />
        <span className="pt-5 text-[#cbd5e1]">→</span>
        <DateField label="To" value={to} onChange={onToChange} />
      </div>
      <span className="flex items-center gap-1.5 pb-2 text-xs font-medium text-[#94a3b8]">
        <Clock3 className="size-3" /> Asia/Kuala_Lumpur
      </span>
      <div className="ml-auto flex gap-2">
        <PresetButton onClick={onThisWeek}>This week</PresetButton>
        <PresetButton onClick={onThisMonth}>This month</PresetButton>
      </div>
    </section>
  );
}

function PresetButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#f8fafc]"
    >
      {children}
    </button>
  );
}
