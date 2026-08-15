import { Search } from "lucide-react";

export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  maxLength = 120,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  maxLength?: number;
}) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <Search
        aria-hidden="true"
        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}
