import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  EmptyState,
  SearchField,
  StatusFilter,
  type FilterOption,
} from "@/components/data-display";

export function OrderQueue<TFilter extends string>({
  title,
  resultCount,
  query,
  onQueryChange,
  searchLabel,
  searchPlaceholder,
  filter,
  onFilterChange,
  filterLabel,
  filterOptions,
  columns,
  gridClassName,
  children,
  emptyTitle,
  emptyDescription,
  icon = false,
}: {
  title: string;
  resultCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  filter: TFilter;
  onFilterChange: (value: TFilter) => void;
  filterLabel: string;
  filterOptions: FilterOption<TFilter>[];
  columns: string[];
  gridClassName: string;
  children: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  icon?: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden card">
      <div className="flex h-[52px] shrink-0 items-center border-b border-line px-5">
        {icon && <SlidersHorizontal className="mr-3 size-4 text-body" />}
        <h2 className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#52627a] lg:text-xs">
          {title}
        </h2>
        <span className="ml-auto text-[10px] text-body lg:text-xs">
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid shrink-0 gap-3 border-b border-line p-3 sm:grid-cols-[1fr_190px] sm:px-5">
        <SearchField
          value={query}
          onChange={onQueryChange}
          label={searchLabel}
          placeholder={searchPlaceholder}
        />
        <StatusFilter
          value={filter}
          onChange={onFilterChange}
          label={filterLabel}
          options={filterOptions}
        />
      </div>
      <div
        className={`hidden shrink-0 gap-4 border-b border-line px-5 py-2 text-[10px] font-semibold uppercase tracking-[.08em] text-muted lg:grid ${gridClassName}`}
      >
        {columns.map((column, index) => (
          <span
            key={column}
            className={
              index === columns.length - 1 && column === "Action"
                ? "text-right"
                : undefined
            }
          >
            {column}
          </span>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {resultCount ? (
          <div className="divide-y divide-line">{children}</div>
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </div>
    </section>
  );
}
