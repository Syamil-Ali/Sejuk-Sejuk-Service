"use client";

import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { CompanyBrand } from "@/components/company-brand";
import type { DemoUser } from "@/lib/domain";
import { cn } from "@/lib/utils";

type PortalContentProps = {
  children: React.ReactNode;
  pathname: string;
  user: DemoUser;
  onSignOut: () => void;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
};

export function PortalContent({
  children,
  pathname,
  user,
  onSignOut,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
}: PortalContentProps) {
  const lockContent =
    pathname === "/portal/orders" ||
    pathname === "/portal/dashboard" ||
    pathname === "/portal/technician-dashboard" ||
    pathname === "/portal/notifications";
  const lockAssistant = pathname === "/portal/assistant";
  return (
    <div className="min-w-0 lg:h-full lg:overflow-hidden">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-[#dce7e3] bg-white/90 px-3 backdrop-blur sm:px-4 lg:hidden">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            onClick={menuOpen ? onCloseMenu : onOpenMenu}
            className="grid size-11 place-items-center rounded-xl text-[#60716e] hover:bg-slate-100 hover:text-teal-800"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/portal" className="flex items-center gap-2 font-black">
            <CompanyBrand
              shortName
              iconClassName="size-9 rounded-lg"
              nameClassName="max-w-[30vw] truncate text-xs"
            />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="max-w-[26vw] truncate text-xs font-semibold text-[#60716e]">
            {user.name.split(" ")[0]}
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
          "mx-auto min-h-[calc(100dvh-5rem)] max-w-[1480px] p-4 pb-8 sm:p-7 lg:h-full lg:min-h-0 lg:p-9",
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
