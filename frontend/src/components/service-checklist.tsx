"use client";
import { useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  ListChecks,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { ChecklistItem, Evidence, Role, ServiceOrder } from "@/lib/domain";
import { checklistProgress } from "@/lib/checklists";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { EvidenceThumbnail } from "@/components/evidence-thumbnail";
type Update = (
  itemId: string,
  changes: Pick<ChecklistItem, "completed" | "note" | "evidence">,
) => void;
export function ServiceChecklist({
  order,
  role,
  onUpdate,
  onCustomize,
}: {
  order: ServiceOrder;
  role: Role;
  onUpdate?: Update;
  onCustomize?: (titles: string[]) => void;
}) {
  const progress = checklistProgress(order.checklist);
  const editable =
    role === "admin" && ["New", "Assigned"].includes(order.status);
  const actionable = role === "technician" && order.status === "In Progress";
  const [titles, setTitles] = useState(
    order.checklist.map((item) => item.title),
  );
  return (
    <section className="card !rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5ec] px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium text-[#0f1f38]">
            <ListChecks className="size-4 text-[#2563eb]" />
            Work checklist
          </h2>
          <p className="mt-0.5 text-xs text-[#60738f]">
            {progress.completed} of {progress.total} required steps completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#eef2f7]">
            <div
              className="h-full rounded-full bg-[#2563eb] transition-all duration-500"
              style={{
                width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs font-semibold text-[#60738f]">
            {Math.round(
              progress.total ? (progress.completed / progress.total) * 100 : 0,
            )}
            %
          </span>
        </div>
      </div>
      {editable ? (
        <div className="p-5">
          <p className="mb-3 text-xs text-[#60716e]">
            Customize the required scope before the Technician starts work.
          </p>
          <div className="space-y-2">
            {titles.map((title, index) => (
              <div className="flex gap-2" key={index}>
                <span className="grid size-11 shrink-0 place-items-center text-xs font-black text-[#60716e]">
                  {index + 1}
                </span>
                <input
                  aria-label={`Checklist item ${index + 1}`}
                  maxLength={200}
                  className="field"
                  value={title}
                  onChange={(event) =>
                    setTitles((items) =>
                      items.map((item, i) =>
                        i === index ? event.target.value : item,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label={`Remove checklist item ${index + 1}`}
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-red-700 hover:bg-red-50"
                  onClick={() =>
                    setTitles((items) => items.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setTitles((items) => [...items, ""])}
            >
              <Plus className="size-4" />
              Add item
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const valid = titles
                  .map((title) => title.trim())
                  .filter(Boolean);
                if (!valid.length) {
                  toast.error("Add at least one checklist item.");
                  return;
                }
                onCustomize?.(valid);
              }}
            >
              <Save className="size-4" />
              Save checklist
            </button>
          </div>
        </div>
      ) : (
        <ol className="divide-y divide-[#e5e9ef]">
          {order.checklist.map((item, index) => (
            <ChecklistRow
              key={`${item.id}:${item.completed}:${item.note || ""}:${item.evidence.map((file) => file.id).join(",")}`}
              item={item}
              index={index}
              orderId={order.id}
              actionable={actionable}
              onUpdate={onUpdate}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
function ChecklistRow({
  item,
  index,
  orderId,
  actionable,
  onUpdate,
}: {
  item: ChecklistItem;
  index: number;
  orderId: string;
  actionable: boolean;
  onUpdate?: Update;
}) {
  const [note, setNote] = useState(item.note || "");
  const [completed, setCompleted] = useState(item.completed);
  const [evidence, setEvidence] = useState(item.evidence);
  const [uploading, setUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const dirty =
    completed !== item.completed ||
    note !== (item.note || "") ||
    evidence.length !== item.evidence.length ||
    evidence.some(
      (file, fileIndex) => file.id !== item.evidence[fileIndex]?.id,
    );
  function save() {
    onUpdate?.(item.id, { completed, note, evidence });
  }
  async function attach(files: File[]) {
    if (!files.length) return;
    if (evidence.length + files.length > 6) {
      toast.error(
        "A maximum of six images is allowed for each checklist item.",
      );
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      toast.error("Each checklist image must be 5 MB or smaller.");
      return;
    }
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length !== files.length) {
      toast.error("Checklist proof must be an image.");
      return;
    }
    setUploading(true);
    try {
      if (getPublicEnv().demoMode) {
        setEvidence((current) => [
          ...current,
          ...images.map(
            (file, fileIndex): Evidence => ({
              id: `check-${item.id}-${Date.now()}-${fileIndex}`,
              name: file.name,
              type: "image",
              size: file.size,
            }),
          ),
        ]);
        return;
      }
      const client = createClient();
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error("Sign in before attaching evidence.");
      const attached: Evidence[] = [];
      for (const file of images) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const storagePath = `${orderId}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await client.storage
          .from("job-evidence")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });
        if (uploadError) throw uploadError;
        const { data: row, error: metadataError } = await client
          .from("job_evidence")
          .insert({
            order_id: orderId,
            storage_path: storagePath,
            file_name: file.name,
            mime_type: file.type,
            media_kind: "image",
            size_bytes: file.size,
            uploader_id: user.id,
            checklist_item_id: item.id,
            committed: true,
          })
          .select("id")
          .single();
        if (metadataError) throw metadataError;
        attached.push({
          id: row.id,
          name: file.name,
          type: "image",
          size: file.size,
          storagePath,
        });
      }
      setEvidence((current) => [...current, ...attached]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Evidence upload failed",
      );
    } finally {
      setUploading(false);
    }
  }

  async function removeEvidence(file: Evidence) {
    if (!getPublicEnv().demoMode) {
      try {
        const client = createClient();
        const { error } = await client.rpc("remove_checklist_evidence", {
          p_order_id: orderId,
          p_evidence_id: file.id,
        });
        if (error) throw error;
        if (file.storagePath) {
          const { error: storageError } = await client.storage
            .from("job-evidence")
            .remove([file.storagePath]);
          if (storageError) throw storageError;
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not remove evidence",
        );
        return;
      }
    }
    setEvidence((current) => current.filter((entry) => entry.id !== file.id));
  }
  return (
    <li
      data-checklist-state={completed ? "completed" : "incomplete"}
      className={`p-4 transition-colors sm:px-5 ${completed ? "bg-[#f7fbff]" : "bg-white"}`}
    >
      <div className="flex gap-3">
        <button
          type="button"
          disabled={!actionable}
          aria-label={`${completed ? "Uncheck" : "Complete"} ${item.title}`}
          onClick={() => setCompleted((current) => !current)}
          aria-pressed={completed}
          className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-[2px] border transition-colors focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 ${completed ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-[#b9c7d8] bg-white text-transparent hover:border-[#2563eb]"} disabled:cursor-not-allowed disabled:opacity-55`}
        >
          {completed ? (
            <Check className="size-3" strokeWidth={2.5} />
          ) : (
            <span />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-xs font-medium text-[#60716e]">
              {index + 1}.
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`text-sm font-medium ${completed ? "text-[#3b638f]" : "text-[#0f1f38]"}`}
                >
                  {item.title}
                </p>
                <span
                  className={`rounded-sm px-1.5 py-0.5 text-[9px] font-medium ${item.required ? "bg-[#fff0f0] text-[#dc2626]" : "bg-[#eef3f7] text-[#60738f]"}`}
                >
                  {item.required ? "Required" : "Optional"}
                </span>
                {completed && (
                  <span className="rounded-sm border border-green-100 bg-green-50 px-1.5 py-0.5 text-[9px] font-semibold text-green-700">
                    Done
                  </span>
                )}
              </div>
              {item.completedAt && (
                <p className="mt-1 text-xs text-emerald-700">
                  Completed by {item.completedBy} ·{" "}
                  {new Date(item.completedAt).toLocaleString("en-MY")}
                </p>
              )}
            </div>
          </div>
          {actionable ? (
            <div className="mt-3 space-y-2">
              <textarea
                aria-label={`Note for ${item.title}`}
                maxLength={1_000}
                className="field !rounded-lg !border !border-[#dfe5ec] !bg-[#f8fafc] !px-3 !py-2 focus:!border-[#3b82f6] focus:!bg-white"
                rows={2}
                placeholder="Add work note (optional)"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={imageInput}
                  hidden
                  tabIndex={-1}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={evidence.length >= 6 || uploading}
                  onChange={(event) => {
                    const input = event.currentTarget;
                    void attach(Array.from(input.files || []));
                    input.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={evidence.length >= 6 || uploading}
                  onClick={() => imageInput.current?.click()}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#475569] transition-colors hover:border-[#93c5fd] hover:bg-[#f8fbff] hover:text-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="size-3.5" />
                  )}
                  {uploading ? "Uploading…" : "Add image"}
                </button>
                <span className="text-xs text-[#94a3b8]">
                  {evidence.length}/6 images
                </span>
                {dirty && (
                  <span className="ml-auto text-xs text-[#b45309]">
                    Unsaved changes
                  </span>
                )}
                <button
                  type="button"
                  disabled={!dirty}
                  onClick={save}
                  className={`${dirty ? "" : "ml-auto"} inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#0f172a] px-3 text-xs font-semibold text-white hover:bg-[#1e293b] disabled:bg-[#cbd5e1]`}
                >
                  <Save className="size-3.5" />
                  {item.note || item.completed || item.evidence.length
                    ? "Update item"
                    : "Save item"}
                </button>
              </div>
            </div>
          ) : (
            item.note && (
              <p className="mt-3 rounded-xl bg-white p-3 text-sm text-[#60716e]">
                {item.note}
              </p>
            )
          )}
          {evidence.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {evidence.map((file) => (
                <span key={file.id} className="flex items-center gap-1">
                  <EvidenceThumbnail
                    name={file.name}
                    storagePath={file.storagePath}
                  />
                  {actionable && (
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      disabled={uploading}
                      onClick={() => void removeEvidence(file)}
                      className="grid size-7 place-items-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
