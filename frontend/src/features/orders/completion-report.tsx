import { AlertTriangle, Wallet } from "lucide-react";
import { PrivateEvidenceLink } from "@/components/private-evidence-link";
import type { ServiceOrder } from "@/lib/domain";
import { orderPaymentSummary } from "@/lib/payments";
import { localDateTime, money } from "@/lib/utils";

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-body">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}

export function CompletionReport({ order }: { order: ServiceOrder }) {
  if (!order.completion) return null;
  const completion = order.completion;
  const payment = orderPaymentSummary(order);
  return (
    <section className="card !rounded-xl p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Completion report</h2>
        <span className="text-sm text-body">
          {localDateTime.format(new Date(completion.completedAt))}
        </span>
      </div>
      {completion.finalAmount > order.quotedPrice && (
        <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          <AlertTriangle className="size-5 shrink-0" />
          Final amount is{" "}
          {money.format(completion.finalAmount - order.quotedPrice)} above
          quote.
        </div>
      )}
      {!completion.evidence.some((evidence) => evidence.type === "image") && (
        <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          <AlertTriangle className="size-5 shrink-0" />
          No image evidence attached.
        </div>
      )}
      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        <Term label="Work done" value={completion.workDone} />
        <Term
          label="Final amount"
          value={money.format(completion.finalAmount)}
        />
        <Term
          label="Extra charges"
          value={money.format(completion.extraCharges)}
        />
        <Term label="Remarks" value={completion.remarks || "—"} />
        <Term label="Payment status" value={payment.status} />
      </dl>
      {completion.evidence.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-body">
            Evidence
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {completion.evidence.map((evidence) => (
              <PrivateEvidenceLink
                key={evidence.id}
                name={evidence.name}
                storagePath={evidence.storagePath}
              />
            ))}
          </div>
        </div>
      )}
      <div
        className={`mt-5 rounded-xl border p-4 ${payment.status === "Paid" ? "border-emerald-200 bg-emerald-50" : payment.status === "Partially paid" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}
      >
        <p className="flex items-center gap-2 font-semibold text-[#1e293b]">
          <Wallet className="size-4" />
          {payment.status}
        </p>
        <p className="mt-1 text-sm text-body">
          Received {money.format(payment.received)} · Outstanding{" "}
          {money.format(payment.outstanding)}
        </p>
        {payment.payments.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-current/10 pt-3">
            {payment.payments.map((record) => (
              <div key={record.id} className="text-xs text-body">
                <p>
                  {money.format(record.amount)} via {record.method} ·{" "}
                  {record.recordedBy} ·{" "}
                  {localDateTime.format(new Date(record.receivedAt))}
                </p>
                {record.notes && (
                  <p className="mt-1 leading-relaxed text-body">
                    Note: {record.notes}
                  </p>
                )}
                {record.receipt && (
                  <div className="mt-2">
                    <PrivateEvidenceLink
                      name={record.receipt.name}
                      storagePath={record.receipt.storagePath}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
