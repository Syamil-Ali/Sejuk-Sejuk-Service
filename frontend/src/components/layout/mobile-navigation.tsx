"use client";

import Link from "next/link";
import type { Role } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { navigationLinks } from "./portal-navigation";

type MobileNavigationProps = {
  role: Role;
  pathname: string;
  unreadNotifications: number;
  unreadMessages: number;
  onNavigate: (href: string) => void;
  onPrepareNavigate: (href: string) => void;
};

export function MobileNavigation({
  role,
  pathname,
  unreadNotifications,
  unreadMessages,
  onNavigate,
  onPrepareNavigate,
}: MobileNavigationProps) {
  const links = navigationLinks(role);
  const shortLabel = (href: string, label: string) => {
    if (href === "/portal/assistant") return "Assistant";
    if (href === "/portal/about") return "Help";
    if (href === "/portal/notifications") return "Alerts";
    return label;
  };
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div
        className="grid h-full"
        style={{ gridTemplateColumns: `repeat(${links.length},minmax(0,1fr))` }}
      >
        {links.map(({ href, label, icon: Icon, badge }) => {
          const unread =
            badge === "notifications"
              ? unreadNotifications
              : badge === "messages"
                ? unreadMessages
                : 0;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onNavigate(href)}
              onTouchStart={() => onPrepareNavigate(href)}
              onFocus={() => onPrepareNavigate(href)}
              className={cn(
                "flex min-h-[64px] flex-col items-center justify-center gap-1 py-1.5",
                active ? "text-teal-800" : "text-[#64748b]",
              )}
            >
              <span
                className={cn(
                  "relative grid size-9 place-items-center rounded-full transition-colors",
                  active ? "bg-teal-100 text-teal-800" : "text-[#64748b]",
                )}
              >
                <Icon className="size-5" />
                {unread > 0 && (
                  <span
                    className={cn(
                      "absolute right-0.5 top-0.5 size-2.5 rounded-full border-2 border-white",
                      badge === "notifications" ? "bg-red-500" : "bg-blue-500",
                    )}
                  />
                )}
              </span>
              <span className="max-w-full truncate text-[10px] font-bold leading-none">
                {shortLabel(href, label)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
