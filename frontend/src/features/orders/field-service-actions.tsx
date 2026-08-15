"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { EvidenceUploader } from "@/components/evidence-uploader";
import {
  AiExtractButton,
  AiExtractUploadStrip,
  useDocumentExtraction,
} from "@/components/ai-extract-button";
import { stageReceiptEvidence } from "@/lib/evidence";
import type { ServiceOrder } from "@/lib/domain";
import { money } from "@/lib/utils";

export type CompletionDraft = {
  workDone: string;
  extraCharges: number;
  remarks?: string;
  paymentAmount?: number;
  paymentMethod?: string;
  receiptEvidenceId?: string;
};

export function TechnicianActions({
  order,
  files,
  setFiles,
  start,
  reschedule,
  complete,
}: {
  order: ServiceOrder;
  files: File[];
  setFiles: (files: File[]) => void;
  start: () => void;
  reschedule: (to: string, reason: string) => void;
  complete: (draft: CompletionDraft) => void;
}) {
  const [mode, setMode] = useState<"none" | "reschedule" | "complete">("none");
  const [extraCharges, setExtraCharges] = useState("0");
  const [extractOpen, setExtractOpen] = useState(false);
  const [receiptEvidenceId, setReceiptEvidenceId] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const { busy: extractBusy, upload: extractUpload, done: extractDone } =
    useDocumentExtraction(
      applyPaymentExtraction,
      "/api/documents/extract-payment-upload",
    );
  async function applyPaymentExtraction(
    fields: Record<string, string>,
    _confidence: number,
    file?: File,
  ) {
    const form = formRef.current;
    if (!form) return;
    const amount = form.elements.namedItem("paymentAmount");
    if (fields.paymentAmount && amount instanceof HTMLInputElement)
      amount.value = fields.paymentAmount;
    const method = form.elements.namedItem("paymentMethod");
    if (
      fields.paymentMethod &&
      ["Cash", "Card", "Bank Transfer", "E-Wallet"].includes(
        fields.paymentMethod,
      ) &&
      method instanceof HTMLSelectElement
    )
      method.value = fields.paymentMethod;
    if (file) {
      try {
        const evidenceId = await stageReceiptEvidence(order.id, file);
        setReceiptEvidenceId(evidenceId);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Receipt was extracted but could not be attached to the payment.",
        );
      }
    }
  }
  if (order.status === "Assigned")
    return (
      <section className="card p-5">
        <h2 className="font-black">Ready to begin?</h2>
        <p className="mt-1 text-sm text-[#60716e]">
          Start the job when you arrive on site.
        </p>
        <button className="btn-primary mt-4 w-full" onClick={start}>
          Start work
        </button>
        <button
          className="btn-secondary mt-2 w-full"
          onClick={() => setMode("reschedule")}
        >
          Reschedule visit
        </button>
        {mode === "reschedule" && <RescheduleForm submit={reschedule} />}
      </section>
    );
  if (order.status !== "In Progress") return null;
  return (
    <section className="card !rounded-xl overflow-hidden p-5 sm:p-6">
      <div className="-mx-5 -mt-5 border-b border-[#edf0f4] px-5 py-4 sm:-mx-6 sm:-mt-6 sm:px-6">
        <h2 className="text-sm font-semibold text-[#0f1f38]">
          Complete field service
        </h2>
        <p className="mt-0.5 text-xs text-[#60738f]">
          Fill in all required fields before marking the job done
        </p>
      </div>
      <button
        className="mt-4 text-xs font-medium text-[#2563eb]"
        onClick={() =>
          setMode(mode === "reschedule" ? "complete" : "reschedule")
        }
      >
        {mode === "reschedule"
          ? "Back to completion"
          : "Need to reschedule instead?"}
      </button>
      {mode === "reschedule" ? (
        <RescheduleForm submit={reschedule} />
      ) : (
        <form
          ref={formRef}
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const payment = String(data.get("paymentAmount") || "");
            complete({
              workDone: String(data.get("workDone")),
              extraCharges: Number(data.get("extraCharges") || 0),
              remarks: String(data.get("remarks") || ""),
              paymentAmount: payment ? Number(payment) : undefined,
              paymentMethod:
                String(data.get("paymentMethod") || "") || undefined,
              receiptEvidenceId,
            });
          }}
        >
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#60738f]">
              Work done
            </span>
            <textarea
              required
              name="workDone"
              maxLength={2_000}
              className="field !rounded-lg !border !border-[#dfe5ec] !bg-[#f8fafc] !px-4 !py-3"
              rows={4}
              placeholder="Describe the work completed during this service visit..."
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#60738f]">
                Extra charges (RM)
              </span>
              <input
                required
                min="0"
                step="0.01"
                type="number"
                name="extraCharges"
                value={extraCharges}
                onChange={(event) => setExtraCharges(event.target.value)}
                className="field !rounded-lg !border !border-[#dfe5ec] !bg-[#f8fafc]"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#60738f]">
                Final amount
              </span>
              <output className="field block !rounded-lg !border !border-[#dfe5ec] !bg-[#f1f5f9]">
                {money.format(order.quotedPrice + Number(extraCharges || 0))}
              </output>
            </label>
          </div>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#60738f]">
              Evidence (up to 6)
            </span>
            <EvidenceUploader
              orderId={order.id}
              files={files}
              onFilesChange={setFiles}
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#60738f]">
              Remarks
            </span>
            <textarea
              name="remarks"
              maxLength={1_000}
              className="field !rounded-lg !border !border-[#dfe5ec] !bg-[#f8fafc]"
              rows={2}
              placeholder="Any additional remarks..."
            />
          </label>
          <fieldset className="rounded-xl border border-[#dfe5ec] bg-[#f8fafc] p-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-[#60738f]">
              Payment received (optional)
            </legend>
            <div className="mb-3 flex justify-end">
              <AiExtractButton
                open={extractOpen}
                onOpenChange={setExtractOpen}
                busy={extractBusy}
                done={extractDone}
                label="Extract from receipt"
              />
            </div>
            {extractOpen && (
              <AiExtractUploadStrip
                busy={extractBusy}
                done={extractDone}
                onFile={(file) => void extractUpload(file)}
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-bold">Amount</span>
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  name="paymentAmount"
                  className="field"
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold">Method</span>
                <select name="paymentMethod" className="field">
                  <option value="">Select</option>
                  {["Cash", "Card", "Bank Transfer", "E-Wallet"].map(
                    (method) => (
                      <option key={method}>{method}</option>
                    ),
                  )}
                </select>
              </label>
            </div>
          </fieldset>
          <button
            className="min-h-11 rounded-xl bg-[#0f172a] px-5 text-sm font-semibold text-white hover:bg-[#1e293b]"
            type="submit"
          >
            Mark job done
          </button>
        </form>
      )}
    </section>
  );
}

export function RescheduleForm({
  submit,
}: {
  submit: (to: string, reason: string) => void;
}) {
  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        submit(
          new Date(String(data.get("time"))).toISOString(),
          String(data.get("reason")),
        );
      }}
    >
      <input required name="time" type="datetime-local" className="field" />
      <textarea
        required
        name="reason"
        maxLength={1_000}
        className="field"
        placeholder="Reason for postponement"
      />
      <button className="btn-primary" type="submit">
        Save new schedule
      </button>
    </form>
  );
}

export function ManagerActions({
  order,
  review,
  close,
}: {
  order: ServiceOrder;
  review: (
    outcome: "accepted" | "returned",
    notes?: string,
    reopenIds?: string[],
  ) => void;
  close: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [reopen, setReopen] = useState<string[]>([]);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  if (order.status === "Job Done")
    return (
      <section className="card p-5">
        <h2 className="font-black">Manager decision</h2>
        <textarea
          className="field mt-4"
          rows={3}
          placeholder="Review notes or required correction reason"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <fieldset className="mt-4 overflow-hidden rounded-xl border border-[#dce7e3]">
          <legend className="sr-only">
            Reopen checklist items for correction
          </legend>
          <button
            type="button"
            aria-expanded={correctionOpen}
            aria-controls="reopen-correction-options"
            onClick={() => setCorrectionOpen((open) => !open)}
            className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-medium text-[#334155] hover:bg-[#f8fafc]"
          >
            <span>Reopen for correction</span>
            <span className="text-xs font-normal text-[#8290a3]">Optional</span>
            {reopen.length > 0 && (
              <span className="ml-auto rounded-full bg-[#dbeafe] px-2 py-0.5 text-xs text-[#1d4f91]">
                {reopen.length} selected
              </span>
            )}
            <ChevronDown
              className={`size-4 shrink-0 text-[#8290a3] transition-transform ${reopen.length === 0 ? "ml-auto" : ""} ${correctionOpen ? "rotate-180" : ""}`}
            />
          </button>
          {correctionOpen && (
            <div
              id="reopen-correction-options"
              className="space-y-2 border-t border-[#e5e9ef] px-4 py-3"
            >
              {order.checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex min-h-10 items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={reopen.includes(item.id)}
                    onChange={(event) =>
                      setReopen((ids) =>
                        event.target.checked
                          ? [...ids, item.id]
                          : ids.filter((id) => id !== item.id),
                      )
                    }
                  />
                  <span>{item.title}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            className="btn-primary"
            onClick={() => review("accepted", notes)}
          >
            Accept review
          </button>
          <button
            className="btn-danger"
            onClick={() => review("returned", notes, reopen)}
          >
            Return for correction
          </button>
        </div>
      </section>
    );
  if (order.status === "Reviewed")
    return (
      <section className="card p-5">
        <h2 className="font-black">Review accepted</h2>
        <p className="mt-1 text-sm text-[#60716e]">
          Close this order to lock operational changes.
        </p>
        <button className="btn-primary mt-4" onClick={close}>
          Close order
        </button>
      </section>
    );
  return null;
}
