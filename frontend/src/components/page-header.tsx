export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[11px] font-black uppercase tracking-[.22em] text-teal-700">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[1.75rem] font-black leading-tight tracking-[-.035em] text-[#102925] sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#536a65]">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
