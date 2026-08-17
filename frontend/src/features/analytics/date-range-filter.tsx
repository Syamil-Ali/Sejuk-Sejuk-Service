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
    <label className="block min-w-0 flex-1">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-muted sm:text-xs">
        {label}
      </span>
      <input
        aria-label={label}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-sm text-[#1e293b] focus:border-[#3b82f6] focus:outline-none sm:px-3 sm:py-2"
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
    <section className="card mb-6 flex flex-col gap-4 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-end lg:mb-4 lg:shrink-0 lg:py-3">
      <div className="flex w-full items-end gap-2 sm:w-auto sm:gap-3">
        <DateField label="From" value={from} onChange={onFromChange} />
        <span className="pb-2.5 text-[#cbd5e1]">→</span>
        <DateField label="To" value={to} onChange={onToChange} />
      </div>
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted sm:pb-2">
        <Clock3 className="size-3" /> Asia/Kuala_Lumpur
      </span>
      <div className="flex gap-2 sm:ml-auto">
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
      className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-body hover:bg-canvas"
    >
      {children}
    </button>
  );
}
