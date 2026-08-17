"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { validateEvidence } from "@/lib/validation";

type StagedFile = {
  file: File;
  key: string;
  preview?: string;
  storagePath?: string;
  progress: number;
  status: "staging" | "ready" | "failed";
};

export function EvidenceUploader({
  orderId,
  files,
  onFilesChange,
}: {
  orderId: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () =>
      staged.forEach(
        (item) => item.preview && URL.revokeObjectURL(item.preview),
      ),
    [staged],
  );

  async function addFiles(selected: File[]) {
    const combined = [...files, ...selected];
    const error = validateEvidence(combined);
    if (error) {
      toast.error(error);
      return;
    }
    const additions = selected.map((file) => ({
      file,
      key: crypto.randomUUID(),
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
      progress: 5,
      status: "staging" as const,
    }));
    setStaged((current) => [...current, ...additions]);
    onFilesChange(combined);
    await Promise.all(additions.map(stage));
  }

  async function stage(item: StagedFile) {
    if (getPublicEnv().demoMode) {
      setStaged((current) =>
        current.map((entry) =>
          entry.key === item.key
            ? { ...entry, progress: 100, status: "ready" }
            : entry,
        ),
      );
      return;
    }
    const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${orderId}/${item.key}-${safeName}`;
    setStaged((current) =>
      current.map((entry) =>
        entry.key === item.key ? { ...entry, progress: 35 } : entry,
      ),
    );
    try {
      const client = createClient();
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error("Sign in before uploading evidence.");
      const { error: uploadError } = await client.storage
        .from("job-evidence")
        .upload(storagePath, item.file, {
          contentType: item.file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const mediaKind = item.file.type.startsWith("image/")
        ? "image"
        : item.file.type.startsWith("video/")
          ? "video"
          : "pdf";
      const { error: metadataError } = await client
        .from("job_evidence")
        .insert({
          order_id: orderId,
          storage_path: storagePath,
          file_name: item.file.name,
          mime_type: item.file.type,
          media_kind: mediaKind,
          size_bytes: item.file.size,
          uploader_id: user.id,
          committed: false,
        });
      if (metadataError) throw metadataError;
      setStaged((current) =>
        current.map((entry) =>
          entry.key === item.key
            ? { ...entry, storagePath, progress: 100, status: "ready" }
            : entry,
        ),
      );
    } catch (error) {
      setStaged((current) =>
        current.map((entry) =>
          entry.key === item.key
            ? { ...entry, progress: 0, status: "failed" }
            : entry,
        ),
      );
      toast.error(
        error instanceof Error ? error.message : "Evidence upload failed",
      );
    }
  }

  async function remove(item: StagedFile) {
    if (item.preview) URL.revokeObjectURL(item.preview);
    if (item.storagePath && !getPublicEnv().demoMode) {
      const client = createClient();
      await client.storage.from("job-evidence").remove([item.storagePath]);
      await client
        .from("job_evidence")
        .delete()
        .eq("storage_path", item.storagePath)
        .eq("committed", false);
    }
    const next = staged.filter((entry) => entry.key !== item.key);
    setStaged(next);
    onFilesChange(next.map((entry) => entry.file));
  }

  return (
    <div>
      <input
        ref={input}
        className="sr-only"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"
        onChange={(event) => {
          void addFiles(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />
      <button
        type="button"
        className="flex min-h-16 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d5dee9] bg-white px-4 text-sm text-body transition-colors hover:border-[#60a5fa] hover:bg-blue-50 hover:text-blue-600"
        disabled={files.length >= 6}
        onClick={() => input.current?.click()}
      >
        <Upload className="size-4" />
        Click to add evidence ({files.length}/6)
      </button>
      <p className="mt-2 text-center text-xs text-[#8290a3]">
        JPG, PNG, MP4 or PDF · maximum 10 MB each.
      </p>
      {/* Blob previews are local, short-lived objects and cannot use Next's image optimizer. */}
      {staged.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {staged.map((item) => (
            <li
              key={item.key}
              className="overflow-hidden rounded-xl border border-line bg-slate-50"
            >
              <div className="flex min-h-16 items-center gap-3 p-2">
                {item.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.preview}
                    alt=""
                    className="size-12 rounded-lg object-cover"
                  />
                ) : (
                  <span className="grid size-12 place-items-center rounded-lg bg-white text-teal-700">
                    {item.file.type.startsWith("image/") ? (
                      <ImageIcon className="size-5" />
                    ) : (
                      <FileText className="size-5" />
                    )}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs">
                    {item.file.name}
                  </strong>
                  <small className="text-body">
                    {(item.file.size / 1024 / 1024).toFixed(1)} MB ·{" "}
                    {item.status}
                  </small>
                </span>
                {item.status === "staging" ? (
                  <LoaderCircle className="size-4 animate-spin text-teal-700" />
                ) : (
                  <button
                    type="button"
                    aria-label={`Remove ${item.file.name}`}
                    onClick={() => void remove(item)}
                    className="grid size-9 place-items-center rounded-lg hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <div className="h-1 bg-slate-200">
                <div
                  className={`h-full ${item.status === "failed" ? "bg-red-500" : "bg-teal-500"}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
