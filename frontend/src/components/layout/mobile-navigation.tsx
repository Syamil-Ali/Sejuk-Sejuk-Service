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
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid border-t border-gray-200 bg-white px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      style={{ gridTemplateColumns: `repeat(${links.length},minmax(0,1fr))` }}
    >
      {links.map(({ href, label, icon: Icon, badge }) => {
        const unread =
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
            onTouchStart={() => onPrepareNavigate(href)}
            onFocus={() => onPrepareNavigate(href)}
            className={cn(
              "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-[#60716e]",
              pathname.startsWith(href) && "bg-teal-50 text-teal-800",
            )}
          >
            <Icon className="size-5" />
            {label}
            {unread > 0 && (
              <span
                className={cn(
                  "absolute right-[25%] top-1 size-2 rounded-full",
                  badge === "notifications" ? "bg-red-500" : "bg-blue-500",
                )}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
