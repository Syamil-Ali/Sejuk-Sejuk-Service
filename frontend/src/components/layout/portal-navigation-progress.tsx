"use client";

export function PortalNavigationProgress({ pending }: { pending: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={pending ? "Loading page" : undefined}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden transition-opacity duration-150 ${pending ? "opacity-100" : "opacity-0"}`}
    >
      <span className="block h-full w-full origin-left bg-[#2563eb] motion-safe:animate-pulse" />
    </div>
  );
}
