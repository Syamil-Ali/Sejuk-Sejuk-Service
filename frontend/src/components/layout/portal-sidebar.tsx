"use client";

import Link from "next/link";
import { LogOut, RotateCcw } from "lucide-react";
import type { DemoUser } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { CompanyBrand } from "@/components/company-brand";
import { portalNavigation, type PortalNavSection } from "./portal-navigation";

type PortalSidebarProps = {
  user: DemoUser;
  pathname: string;
  unreadNotifications: number;
  unreadMessages: number;
  onSignOut: () => void;
  onReset: () => void;
  onNavigate: (href: string) => void;
  onPrepareNavigate: (href: string) => void;
};

function SidebarSection({
  section,
  pathname,
  unreadNotifications,
  unreadMessages,
  onNavigate,
  onPrepareNavigate,
}: Omit<PortalSidebarProps, "user" | "onSignOut" | "onReset"> & {
  section: PortalNavSection;
}) {
  return (
    <section>
      <p className="mb-2 px-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
        {section.label}
      </p>
      <div className="space-y-1">
        {section.links.map(({ href, label, icon: Icon, badge }) => {
          const count =
            badge === "notifications"
              ? unreadNotifications
              : badge === "messages"
                ? unreadMessages
                : 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onNavigate(href)}
              onMouseEnter={() => onPrepareNavigate(href)}
              onFocus={() => onPrepareNavigate(href)}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-[#526b88] transition-colors hover:bg-[#f2f6fb] hover:text-[#173c68]",
                pathname.startsWith(href) &&
                  "bg-[#dbeafe] text-[#173c68] hover:bg-[#dbeafe] hover:text-[#173c68]",
              )}
            >
              <Icon className="size-4" />
              {label}
              {count > 0 && (
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
                    badge === "notifications"
                      ? "bg-[#f6bd48] text-[#4b3b13]"
                      : "bg-[#dbeafe] text-[#1d4f91]",
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function PortalSidebar(props: PortalSidebarProps) {
  const {
    user,
    pathname,
    unreadNotifications,
    unreadMessages,
    onSignOut,
    onReset,
    onNavigate,
    onPrepareNavigate,
  } = props;
  return (
    <aside className="hidden border-r border-[#e2e8f0] bg-white text-[#10213a] lg:h-full lg:flex lg:flex-col lg:overflow-hidden">
      <Link
        href="/portal"
        onClick={() => onNavigate("/portal")}
        onMouseEnter={() => onPrepareNavigate("/portal")}
        onFocus={() => onPrepareNavigate("/portal")}
        className="flex h-[86px] items-center gap-3 border-b border-[#e2e8f0] px-4"
      >
        <CompanyBrand />
      </Link>
      <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-5">
        <div className="space-y-6">
          {portalNavigation[user.role].map((section) => (
            <SidebarSection
              key={section.label}
              section={section}
              pathname={pathname}
              unreadNotifications={unreadNotifications}
              unreadMessages={unreadMessages}
              onNavigate={onNavigate}
              onPrepareNavigate={onPrepareNavigate}
            />
          ))}
        </div>
      </nav>
      <div className="mt-auto border-t border-[#e2e8f0] bg-white p-4">
        <p className="text-sm font-medium">{user.name}</p>
        <p className="mt-0.5 text-xs capitalize text-[#60738f]">
          {user.role} · {user.branch}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onSignOut}
            className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[#60738f] hover:bg-[#f2f6fb]"
          >
            <LogOut className="size-3" /> Sign out
          </button>
          <button
            onClick={onReset}
            className="ml-auto flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs text-[#60738f] hover:bg-[#f2f6fb]"
          >
            <RotateCcw className="size-3" /> Reset
          </button>
        </div>
      </div>
    </aside>
  );
}
