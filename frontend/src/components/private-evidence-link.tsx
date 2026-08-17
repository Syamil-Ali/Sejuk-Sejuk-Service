"use client";
import { useState } from "react";
import { ExternalLink, FileText, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
export function PrivateEvidenceLink({
  name,
  storagePath,
}: {
  name: string;
  storagePath?: string;
}) {
  const [loading, setLoading] = useState(false);
  if (!storagePath)
    return (
      <span className="flex items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm">
        <FileText className="size-4 text-teal-700" />
        {name}
      </span>
    );
  async function open() {
    setLoading(true);
    try {
      const response = await fetch("/api/evidence/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: storagePath }),
      });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url)
        throw new Error(body.error || "Unable to open evidence.");
      window.open(body.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to open evidence.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void open()}
      className="flex items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm hover:border-teal-400"
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <FileText className="size-4 text-teal-700" />
      )}
      <span>{name}</span>
      <ExternalLink className="size-3" />
    </button>
  );
}
