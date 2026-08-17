import { X } from "lucide-react";
import type { AuditEvent } from "@/lib/domain";
import { localDateTime } from "@/lib/utils";

function AuditTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#8290a3]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

export function AuditEventDialog({
  event,
  orderNo,
  onClose,
}: {
  event: AuditEvent;
  orderNo: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/60 p-4"
      onMouseDown={(mouseEvent) =>
        mouseEvent.target === mouseEvent.currentTarget && onClose()
      }
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-event-title"
        className="w-full max-w-lg overflow-hidden card !rounded-2xl"
      >
        <header className="flex items-start gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <p className="font-code text-xs text-body">{orderNo}</p>
            <h2
              id="audit-event-title"
              className="mt-1 text-xl font-semibold text-ink"
            >
              {event.action}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close audit details"
            onClick={onClose}
            className="ml-auto grid size-10 shrink-0 place-items-center rounded-xl text-body hover:bg-[#f3f6fa]"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="space-y-5 p-6">
          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-line bg-canvas p-4">
            <AuditTerm label="Changed by" value={event.actor} />
            <AuditTerm
              label="Date and time"
              value={localDateTime.format(new Date(event.at))}
            />
          </dl>
          {event.detail && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[.08em] text-[#8290a3]">
                Reason or details
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#334155]">
                {event.detail}
              </p>
            </div>
          )}
          {event.changes && event.changes.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[.08em] text-[#8290a3]">
                Changes made
              </h3>
              <div className="mt-2 space-y-2">
                {event.changes.map((change) => (
                  <div
                    key={`${change.label}-${change.after}`}
                    className="rounded-xl border border-line px-4 py-3"
                  >
                    <p className="text-xs text-body">{change.label}</p>
                    <p className="mt-1 text-sm font-medium text-ink">
                      {change.before ? `${change.before} → ` : ""}
                      {change.after}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {event.relatedItems && event.relatedItems.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[.08em] text-[#8290a3]">
                Checklist items reopened
              </h3>
              <ul className="mt-2 space-y-2">
                {event.relatedItems.map((item) => (
                  <li
                    key={item}
                    className="rounded-xl border border-[#fde4ad] bg-[#fffaf0] px-4 py-3 text-sm text-[#7c4a03]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
