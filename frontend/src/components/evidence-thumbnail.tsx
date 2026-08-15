"use client";

import { useEffect, useState } from "react";
import { FileText, LoaderCircle } from "lucide-react";

/**
 * Renders checklist proof as a clickable thumbnail for evidence stored in the
 * private job-evidence bucket. Falls back to a plain filename chip when the
 * evidence has no storage path (demo mode) or a signed URL cannot be created.
 */
export function EvidenceThumbnail({
  name,
  storagePath,
}: {
  name: string;
  storagePath?: string;
}) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    void fetch("/api/evidence/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: storagePath }),
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          url?: string;
          error?: string;
        };
        if (!response.ok || !body.url)
          throw new Error(body.error || "Unable to open evidence.");
        if (!cancelled) setUrl(body.url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  if (!storagePath || failed) {
    return (
      <span className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-teal-800">
        <FileText className="size-4 text-teal-700" />
        Proof: {name}
      </span>
    );
  }

  if (!url) {
    return (
      <span className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-teal-800">
        <LoaderCircle className="size-4 animate-spin text-teal-700" />
        Proof: {name}
      </span>
    );
  }

  return (
    <button
      type="button"
      title={`Open ${name}`}
      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
      className="flex items-center gap-2 rounded-lg bg-white p-2 pr-3 text-xs font-bold text-teal-800 hover:bg-teal-50"
    >
      {/* Signed URLs point at private storage and cannot use Next's image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name}
        className="size-10 rounded-md object-cover"
      />
      Proof: {name}
    </button>
  );
}
