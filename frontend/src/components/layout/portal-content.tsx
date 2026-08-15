"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { CompanyBrand } from "@/components/company-brand";
import type { DemoUser } from "@/lib/domain";
import { cn } from "@/lib/utils";

type PortalContentProps = {
  children: React.ReactNode;
  pathname: string;
  user: DemoUser;
  onSignOut: () => void;
};

export function PortalContent({
  children,
  pathname,
  user,
  onSignOut,
}: PortalContentProps) {
  const lockContent =
    pathname === "/portal/orders" ||
    pathname === "/portal/dashboard" ||
    pathname === "/portal/technician-dashboard" ||
    pathname === "/portal/notifications";
  const lockAssistant = pathname === "/portal/assistant";
  return (
    <div className="min-w-0 lg:h-full lg:overflow-hidden">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-[#dce7e3] bg-white/90 px-4 backdrop-blur lg:hidden">
        <Link href="/portal" className="flex items-center gap-2 font-black">
          <CompanyBrand iconClassName="size-9 rounded-lg" nameClassName="text-xs" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#60716e]">
            {user.name}
          </span>
          <button
            type="button"
            aria-label="Sign out"
            onClick={onSignOut}
            className="grid size-11 place-items-center rounded-xl text-[#60716e] hover:bg-slate-100 hover:text-teal-800"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>
      <main
        className={cn(
          "mx-auto min-h-[calc(100vh-5rem)] max-w-[1480px] p-4 pb-32 sm:p-7 lg:h-full lg:min-h-0 lg:p-9",
          lockContent
            ? "lg:overflow-hidden"
            : lockAssistant
              ? "lg:overflow-y-auto xl:overflow-hidden"
              : "lg:overflow-y-auto",
        )}
      >
        {children}
      </main>
    </div>
  );
}
