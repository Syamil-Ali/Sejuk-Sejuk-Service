"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useDemo } from "@/components/demo-provider";
import { composeAddress, orderSchema } from "@/lib/validation";
import type { ServiceOrder } from "@/lib/domain";
import { money } from "@/lib/utils";
import { orderUrl } from "@/lib/order-id";
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
export default function NewOrderPage() {
  const { user, users, createOrder } = useDemo();
  const [result, setResult] = useState<ServiceOrder>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>();
  const [extractOpen, setExtractOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const {
    busy: extractBusy,
    upload: extractUpload,
    done: extractDone,
  } = useDocumentExtraction(fillFromExtraction);
  useEffect(() => {
    const raw = window.sessionStorage.getItem("sejuk-order-draft");
    if (!raw) return;
    window.sessionStorage.removeItem("sejuk-order-draft");
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === "object")
        void Promise.resolve().then(() => setDraft(parsed));
    } catch {
      // Ignore malformed drafts; the form starts empty.
    }
  }, []);
  if (user?.role !== "admin")
    return <p className="card p-6">Admin access required.</p>;
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
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create order");
    }
  }
  function fillFromExtraction(fields: Record<string, string>) {
    const form = formRef.current;
    if (form) applyOrderDraftToForm(form, extractionToOrderDraft(fields));
  }
  if (result)
    return (
      <>
        <PageHeader
          eyebrow="Order created"
          title={result.orderNo}
          description="The request is now visible in the service queue."
        />
        <div className="card max-w-3xl p-6">
          <div className="flex items-center gap-3 text-teal-800">
            <CheckCircle2 />
            <strong>Order saved successfully</strong>
          </div>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            {[
              ["Customer", result.customerName],
              ["Phone", result.customerPhone],
              ["Service", result.serviceType],
              ["Quoted", money.format(result.quotedPrice)],
              ["Address", result.address],
              ["Status", result.status],
            ].map(([a, b]) => (
              <div key={a}>
                <dt className="text-xs font-bold uppercase tracking-wide text-body">
                  {a}
                </dt>
                <dd className="mt-1 font-semibold">{b}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-7 flex flex-wrap gap-3">
          <Link className="btn-primary" href={orderUrl(result)}>
              Open order
            </Link>
            <button
              className="btn-secondary"
              onClick={() => setResult(undefined)}
            >
              Create another
            </button>
          </div>
        </div>
      </>
    );
  return (
    <>
      <PageHeader
        title="Create service order"
        description="Capture the customer issue, quote, and field assignment."
        action={
          <AiExtractButton
            open={extractOpen}
            onOpenChange={setExtractOpen}
            busy={extractBusy}
            done={extractDone}
          />
        }
      />
      {extractOpen && (
        <AiExtractUploadStrip
          busy={extractBusy}
          done={extractDone}
          onFile={(file) => void extractUpload(file)}
        />
      )}
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          submit(new FormData(event.currentTarget));
        }}
        className="card max-w-4xl p-5 sm:p-7"
      >
        <OrderFields users={users} errors={errors} defaults={draft} />
        <div className="mt-7 flex justify-end gap-3">
          <Link href="/portal/orders" className="btn-secondary">
            Cancel
          </Link>
          <button className="btn-primary" type="submit">
            Create order
          </button>
        </div>
      </form>
    </>
  );
}
