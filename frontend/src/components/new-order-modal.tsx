"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/components/demo-provider";
import { composeAddress, orderSchema } from "@/lib/validation";
import type { ServiceOrder } from "@/lib/domain";
import { money } from "@/lib/utils";
import { encodeOrderId } from "@/lib/order-id";
import { OrderFields } from "@/features/orders";
import {
  AiExtractButton,
  AiExtractUploadStrip,
  useDocumentExtraction,
} from "@/components/ai-extract-button";
import {
  applyOrderDraftToForm,
  extractionToOrderDraft,
} from "@/lib/document-draft";

export function NewOrderModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { users, createOrder } = useDemo();
  const [result, setResult] = useState<ServiceOrder>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [extractOpen, setExtractOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const {
    busy: extractBusy,
    upload: extractUpload,
    done: extractDone,
  } = useDocumentExtraction(fillFromExtraction);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [open, onClose]);
  if (!open) return null;
  function dismiss() {
    setResult(undefined);
    setErrors({});
    onClose();
  }
  async function submit(formData: FormData) {
    const raw = Object.fromEntries(formData);
    const parsed = orderSchema.safeParse({
      ...raw,
      address: composeAddress(raw as Record<string, string>),
      technicianId: raw.technicianId || undefined,
      scheduledAt: raw.scheduledAt
        ? new Date(String(raw.scheduledAt)).toISOString()
        : undefined,
    });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      toast.error("Check the highlighted fields.");
      return;
    }
    try {
      const order = await createOrder(parsed.data);
      setResult(order);
      setErrors({});
      toast.success(`${order.orderNo} created`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create order",
      );
    }
  }
  function fillFromExtraction(fields: Record<string, string>) {
    const form = formRef.current;
    if (form) applyOrderDraftToForm(form, extractionToOrderDraft(fields));
  }
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/70 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-order-title"
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white sm:max-h-[calc(100vh-3rem)]"
      >
        <header className="flex shrink-0 flex-col gap-3 border-b border-[#dce7e3] px-5 py-4 sm:px-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-teal-700"></p>
              <h2 id="new-order-title" className="mt-1 text-2xl font-black">
                {result ? "Order created" : "Create service order"}
              </h2>
              <p className="mt-1 text-sm text-[#60716e]">
                {result
                  ? "The request is now visible in the service queue."
                  : "Capture the customer issue, quote, and field assignment."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!result && (
                <AiExtractButton
                  open={extractOpen}
                  onOpenChange={setExtractOpen}
                  busy={extractBusy}
                  done={extractDone}
                />
              )}
              <button
                type="button"
                aria-label="Close new order"
                onClick={dismiss}
                className="grid size-11 shrink-0 place-items-center rounded-xl text-[#60716e] hover:bg-slate-100 hover:text-[#102925]"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
          {!result && extractOpen && (
            <AiExtractUploadStrip
              busy={extractBusy}
              done={extractDone}
              onFile={(file) => void extractUpload(file)}
            />
          )}
        </header>
        {result ? (
          <div className="overflow-y-auto p-5 sm:p-7">
            <div className="flex items-center gap-3 rounded-xl bg-teal-50 p-4 text-teal-800">
              <CheckCircle2 />
              <strong>Order saved successfully</strong>
            </div>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              {[
                ["Order", result.orderNo],
                ["Customer", result.customerName],
                ["Phone", result.customerPhone],
                ["Service", result.serviceType],
                ["Quoted", money.format(result.quotedPrice)],
                ["Address", result.address],
                ["Status", result.status],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-bold uppercase tracking-wide text-[#60716e]">
                    {label}
                  </dt>
                  <dd className="mt-1 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                className="btn-primary"
              href={`/portal/orders/${encodeOrderId(result.id)}`}
                onClick={dismiss}
              >
                Open order
              </Link>
              <button
                className="btn-secondary"
                onClick={() => setResult(undefined)}
              >
                Create another
              </button>
              <button className="btn-secondary" onClick={dismiss}>
                Back to orders
              </button>
            </div>
          </div>
        ) : (
          <form
            ref={formRef}
            onSubmit={(event) => {
              event.preventDefault();
              submit(new FormData(event.currentTarget));
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <OrderFields users={users} errors={errors} autoFocus />
            </div>
            <footer className="flex shrink-0 justify-end gap-3 border-t border-[#dce7e3] bg-slate-50 px-5 py-4 sm:px-7">
              <button type="button" onClick={dismiss} className="btn-secondary">
                Cancel
              </button>
              <button className="btn-primary" type="submit">
                Create order
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
