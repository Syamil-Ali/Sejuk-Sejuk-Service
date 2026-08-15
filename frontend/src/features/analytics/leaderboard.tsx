import { formatCurrency } from "@/lib/formatters";

export type LeaderboardEntry = {
  name: string;
  initials: string;
  jobs: number;
  amount: number;
};
function rankTone(index: number) {
  if (index === 0) return "bg-[#f59e0b] text-white";
  if (index === 1) return "bg-[#cbd5e1] text-[#334155]";
  if (index === 2) return "bg-[#fdba74] text-white";
  return "bg-[#f1f5f9] text-[#64748b]";
}

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white lg:min-h-0">
      <header className="border-b border-[#f1f5f9] px-5 py-5 lg:py-3.5">
        <h2 className="font-semibold text-[#0f172a]">Leaderboard</h2>
        <p className="mt-0.5 text-xs text-[#94a3b8]">
          Ranked by jobs completed
        </p>
      </header>
      <ol className="divide-y divide-[#f1f5f9]">
        {entries.map((entry, index) => (
          <li
            key={entry.name}
            className={`flex items-center gap-3 px-5 py-4 lg:py-3 ${index === 0 && entry.jobs > 0 ? "bg-[#fffbeb]" : ""}`}
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${rankTone(index)}`}
            >
              {index + 1}
            </span>
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${entry.jobs > 0 ? "bg-[#0f172a] text-white" : "bg-[#f1f5f9] text-[#94a3b8]"}`}
            >
              {entry.initials}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="font-display block truncate text-sm font-semibold text-[#1e293b]">
                {entry.name}
              </strong>
              <small className="text-xs text-[#94a3b8]">
                {entry.jobs} job{entry.jobs === 1 ? "" : "s"}
              </small>
            </span>
            <strong
              className={`font-display text-right text-sm font-semibold ${entry.jobs > 0 ? "text-[#047857]" : "text-[#94a3b8]"}`}
            >
              {formatCurrency(entry.amount)}
            </strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
