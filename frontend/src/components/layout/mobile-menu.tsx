"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyBrand } from "@/components/company-brand";
import type { Role } from "@/lib/domain";
import { portalNavigation } from "./portal-navigation";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  role: Role;
  pathname: string;
  unreadNotifications: number;
  unreadMessages: number;
  onNavigate: (href: string) => void;
  onPrepareNavigate: (href: string) => void;
};

export function MobileMenu({
  open,
  onClose,
  role,
  pathname,
  unreadNotifications,
  unreadMessages,
  onNavigate,
  onPrepareNavigate,
}: MobileMenuProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 lg:hidden",
        !open && "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-slate-900/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "absolute inset-y-0 right-0 flex w-[290px] max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <CompanyBrand nameClassName="text-sm" />
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-xl text-body hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {portalNavigation[role].map((section) => (
            <div key={section.label} className="mb-5">
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.links.map(({ href, label, icon: Icon, badge }) => {
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
                      onClick={() => {
                        onNavigate(href);
                        onClose();
                      }}
                      onTouchStart={() => onPrepareNavigate(href)}
                      onFocus={() => onPrepareNavigate(href)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
                        active
                          ? "bg-teal-50 text-teal-800"
                          : "text-[#334155] hover:bg-slate-50",
                      )}
                    >
                      <span
                        className={cn(
                          "relative grid size-8 place-items-center rounded-lg",
                          active
                            ? "bg-teal-100 text-teal-800"
                            : "bg-slate-100 text-body",
                        )}
                      >
                        <Icon className="size-4" />
                        {unread > 0 && (
                          <span
                            className={cn(
                              "absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-white",
                              badge === "notifications"
                                ? "bg-red-500"
                                : "bg-blue-500",
                            )}
                          />
                        )}
                      </span>
                      {label}
                      {unread > 0 && (
                        <span className="ml-auto rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-body">
                          {unread}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
