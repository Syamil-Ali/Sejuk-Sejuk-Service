export type FilterOption<T extends string> = { value: T; label: string };

export function StatusFilter<T extends string>({
  value,
  onChange,
  options,
  label = "Filter status",
}: {
  value: T;
  onChange: (value: T) => void;
  options: FilterOption<T>[];
  label?: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-11 min-w-36 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
