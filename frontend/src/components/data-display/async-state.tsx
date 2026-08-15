export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="p-5 text-sm text-slate-500" role="status">
      {label}
    </p>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      role="alert"
    >
      <p>{message}</p>
      {onRetry && (
        <button className="mt-2 font-medium underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
