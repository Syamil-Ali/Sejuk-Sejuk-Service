import Link from "next/link";
import { CalendarDays } from "lucide-react";

export type ResultValue = string | number | boolean | null;
export type StructuredResult = {
  columns: string[];
  rows: Record<string, ResultValue>[];
  truncated?: boolean;
};

const labels: Record<string, string> = {
  order_no: "Order",
  customer_name: "Customer",
  service_type: "Service",
  status: "Status",
  quoted_price: "Quote",
  technician_name: "Technician",
  scheduled_at: "Scheduled",
  task_count: "Tasks",
  jobs: "Jobs",
  final_amount: "Final amount",
  amount: "Amount",
};

function formatValue(key: string, value: ResultValue) {
  if (value === null || value === "") return "—";
  if (key.endsWith("_at") && typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime()))
      return new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
  }
  if (
    ["quoted_price", "final_amount", "amount", "outstanding"].includes(key) &&
    typeof value === "number"
  ) {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
    }).format(value);
  }
  return String(value).replaceAll("_", " ");
}

export function StructuredResults({ result }: { result: StructuredResult }) {
  if (!result.rows.length) return null;
  const isOrderResult =
    result.rows.some((row) => "order_no" in row || "order_id" in row) &&
    result.rows.some((row) => "customer_name" in row || "status" in row);
  if (isOrderResult) return <OrderResults result={result} />;
  return <TabularResults result={result} />;
}

function OrderResults({ result }: { result: StructuredResult }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {result.rows.map((row, index) => (
        <article
          className="rounded-xl border border-slate-200 bg-white p-4"
          key={String(row.order_id ?? row.order_no ?? index)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-slate-500">
                {formatValue("order_no", row.order_no ?? row.order_id)}
              </p>
              <h3 className="mt-1 font-medium text-slate-900">
                {formatValue("customer_name", row.customer_name)}
              </h3>
            </div>
            {row.status !== undefined && (
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700">
                {formatValue("status", row.status)}
              </span>
            )}
          </div>
          <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
            {row.service_type !== undefined && (
              <ResultDetail
                label="Service"
                value={formatValue("service_type", row.service_type)}
              />
            )}
            {row.scheduled_at !== undefined && (
              <ResultDetail
                label={
                  <>
                    <CalendarDays className="size-3" />
                    Scheduled
                  </>
                }
                value={formatValue("scheduled_at", row.scheduled_at)}
              />
            )}
            {row.technician_name !== undefined && (
              <ResultDetail
                label="Technician"
                value={formatValue("technician_name", row.technician_name)}
              />
            )}
          </dl>
          {row.order_id && (
            <Link
              className="mt-3 inline-flex text-xs font-medium text-sky-700 hover:text-sky-900"
              href={`/portal/orders/${row.order_id}`}
            >
              Open job →
            </Link>
          )}
        </article>
      ))}
      {result.truncated && (
        <p className="text-xs text-amber-700 sm:col-span-2">
          Only the first matching records are shown.
        </p>
      )}
    </div>
  );
}

function ResultDetail({
  label,
  value,
}: {
  label: React.ReactNode;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="flex items-center gap-1">{label}</dt>
      <dd className="text-right text-slate-800">{value}</dd>
    </div>
  );
}

function TabularResults({ result }: { result: StructuredResult }) {
  const columns = result.columns.length
    ? result.columns
    : Object.keys(result.rows[0] ?? {});
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-max text-left text-xs">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {columns.map((column) => (
              <th className="px-3 py-2 font-medium" key={column}>
                {labels[column] ?? column.replaceAll("_", " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {result.rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td className="px-3 py-2.5 text-slate-800" key={column}>
                  {formatValue(column, row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.truncated && (
        <p className="border-t border-slate-100 px-3 py-2 text-xs text-amber-700">
          Only the first matching records are shown.
        </p>
      )}
    </div>
  );
}
