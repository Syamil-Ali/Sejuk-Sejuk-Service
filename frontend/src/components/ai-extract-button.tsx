"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, FileUp, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

const ACCEPT =
  ".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.webp," +
  "application/pdf,text/plain,text/markdown," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "image/jpeg,image/png,image/webp";

/** Uploads a document and returns the AI-extracted order fields. */
export function useDocumentExtraction(
  onExtracted: (
    fields: Record<string, string>,
    confidence: number,
    file?: File,
  ) => void,
  endpoint = "/api/documents/extract-upload",
) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const doneTimerRef = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(doneTimerRef.current);
    },
    [],
  );
  const upload = useCallback(
    async (file: File) => {
      window.clearTimeout(doneTimerRef.current);
      setDone(false);
      setBusy(true);
      try {
        const form = new FormData();
        const title =
          file.name.replace(/\.[^.]+$/, "").slice(0, 200) || "Uploaded document";
        form.set("title", title);
        form.set("file", file);
        const response = await fetch(endpoint, {
          method: "POST",
          body: form,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(body?.error || "Document extraction failed.");
        onExtracted(
          (body.fields as Record<string, string> | undefined) ?? {},
          Number(body.confidence ?? 0),
          file,
        );
        setDone(true);
        doneTimerRef.current = window.setTimeout(() => setDone(false), 6000);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Document extraction failed.",
        );
      } finally {
        setBusy(false);
      }
    },
    [onExtracted, endpoint],
  );
  return { busy, upload, done };
}

/** Highlighted header trigger for the AI extraction flow. */
export function AiExtractButton({
  open,
  onOpenChange,
  busy,
  done,
  label = "Extract with AI",
  busyLabel = "Extracting…",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  done: boolean;
  label?: string;
  busyLabel?: string;
}) {
  if (done) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex min-h-11 cursor-default items-center gap-2 rounded-xl bg-[#16a34a] px-4 text-sm font-semibold text-white"
      >
        <CheckCircle2 className="size-4" />
        Extracted
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onOpenChange(!open)}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1d4ed8] disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4" />
      )}
      {busy ? busyLabel : label}
    </button>
  );
}

/** Upload area shown under the header while the flow is open. */
export function AiExtractUploadStrip({
  busy,
  done,
  onFile,
}: {
  busy: boolean;
  done: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  if (done) {
    return (
      <div className="flex min-h-16 items-center gap-3 rounded-xl border-2 border-green-300 bg-green-50 px-4 text-sm font-medium text-green-800">
        <CheckCircle2 className="size-5 shrink-0 text-green-700" />
        Fields extracted — review the order form, then create the order.
      </div>
    );
  }
  return (
    <label
      className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 text-sm font-medium text-body transition-colors ${
        busy
          ? "cursor-wait border-slate-200 bg-slate-50"
          : "border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      {busy ? (
        <LoaderCircle className="size-5 animate-spin text-blue-700" />
      ) : (
        <FileUp className="size-5 text-blue-700" />
      )}
      <span>
        {busy
          ? "Extracting fields…"
          : "Upload a quotation, invoice, receipt or client form — PDF, DOCX, TXT, MD, JPG, PNG or WebP"}
      </span>
    </label>
  );
}
