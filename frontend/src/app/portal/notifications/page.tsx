"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, CheckCheck, CircleAlert, Filter } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { localDateTime } from "@/lib/utils";
import { visibleNotifications } from "@/lib/notifications";
import { EmptyState, SectionCard } from "@/components/data-display";
import { toast } from "sonner";

export default function NotificationsPage() {
  const {
    user,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useDemo();
  const [filter, setFilter] = useState<"All" | "Unread" | "High priority">(
    "All",
  );
  const mine = useMemo(
    () =>
      user
        ? visibleNotifications(notifications, user)
            .filter(
              (notification) =>
                filter === "All" ||
                (filter === "Unread"
                  ? !notification.readAt
                  : notification.priority === "high"),
            )
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [filter, notifications, user],
  );
  if (!user) return null;
  const unread = mine.filter((notification) => !notification.readAt).length;
  async function runNotificationAction(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the notification.",
      );
    }
  }
  return (
    <div className="w-full lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <header className="mb-7 flex flex-wrap items-start gap-4 lg:shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-.03em] text-[#0f172a]">
            Notifications
          </h1>
          <p className="mt-1.5 text-sm text-[#64748b]">
            Operational events and messages that need your attention.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runNotificationAction(markAllNotificationsRead)}
          disabled={!unread}
          className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d6dde7] px-4 text-sm font-medium text-[#334155] hover:bg-[#f8fafc] disabled:opacity-50"
        >
          <CheckCheck className="size-4" /> Mark all read
        </button>
      </header>
      <div className="mb-4 flex items-center gap-2 lg:shrink-0">
        <Filter className="size-4 text-[#64748b]" />
        {(["All", "Unread", "High priority"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`min-h-9 rounded-full border px-4 text-xs font-medium ${filter === value ? "border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8]" : "border-[#d6dde7] bg-white text-[#64748b]"}`}
          >
            {value}
          </button>
        ))}
      </div>
      <SectionCard
        contentClassName="!p-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
        className="!rounded-2xl lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
      >
        {mine.length ? (
          <div className="divide-y divide-[#e5e9ef]">
            {mine.map((notification) => {
              const href =
                notification.href ||
                (notification.orderId
                  ? `/portal/orders/${notification.orderId}`
                  : "/portal/notifications");
              return (
                <div
                  key={notification.id}
                  className={`flex gap-4 p-5 ${notification.readAt ? "bg-white" : "bg-[#f8fbff]"}`}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl border ${notification.priority === "high" ? "border-[#fecaca] bg-[#fef2f2] text-[#dc2626]" : "border-[#cfe0f5] bg-[#eff6ff] text-[#2563eb]"}`}
                  >
                    {notification.priority === "high" ? (
                      <CircleAlert className="size-4" />
                    ) : (
                      <Bell className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={href}
                        onClick={() =>
                          void runNotificationAction(() =>
                            markNotificationRead(notification.id),
                          )
                        }
                        className="font-medium text-[#0f172a] hover:text-[#2563eb]"
                      >
                        {notification.title}
                      </Link>
                      {notification.category && (
                        <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#64748b]">
                          {notification.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[#64748b]">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-xs text-[#94a3b8]">
                      {localDateTime.format(new Date(notification.createdAt))}
                    </p>
                  </div>
                  {!notification.readAt && (
                    <button
                      type="button"
                      aria-label={`Mark ${notification.title} as read`}
                      onClick={() =>
                        void runNotificationAction(() =>
                          markNotificationRead(notification.id),
                        )
                      }
                      className="grid size-10 place-items-center rounded-xl text-[#2563eb] hover:bg-white"
                    >
                      <CheckCheck className="size-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid h-full min-h-[360px] place-items-center lg:min-h-0">
            <EmptyState
              icon={<Bell />}
              title="You’re all caught up."
              description="No notifications match this filter."
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
