export default function PortalLoading() {
  return (
    <div
      className="w-full animate-pulse motion-reduce:animate-none"
      aria-label="Loading page"
    >
      <div className="mb-6 h-8 w-56 rounded-lg bg-[#dbe7f1]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-28 rounded-xl border border-[#d7e3ec] bg-white"
          />
        ))}
      </div>
      <div className="mt-5 h-72 rounded-xl border border-[#d7e3ec] bg-white" />
    </div>
  );
}
