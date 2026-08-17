"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, CheckCheck, CircleAlert, Filter } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { localDateTime } from "@/lib/utils";
import { visibleNotifications } from "@/lib/notifications";
import { encodeOrderId } from "@/lib/order-id";
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
      <header className="mb-5 lg:mb-7 lg:shrink-0">
        <div>
          <h1 className="page-title">
            Notifications
          </h1>
          <p className="mt-1 text-[13px] text-body lg:mt-1.5 lg:text-sm">
            Operational events and messages that need your attention.
          </p>
        </div>
      </header>
      <div className="mb-4 flex items-center gap-2 overflow-x-auto lg:shrink-0">
        <Filter className="size-4 text-body" />
        {(["All", "Unread", "High priority"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`min-h-9 rounded-full border px-4 text-xs font-medium ${filter === value ? "border-[#2563eb] bg-accent-soft text-accent" : "border-line bg-white text-body"}`}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          aria-label="Mark all read"
          onClick={() => void runNotificationAction(markAllNotificationsRead)}
          disabled={!unread}
          className="ml-auto grid size-9 shrink-0 place-items-center rounded-xl border border-line text-[#334155] hover:bg-canvas disabled:opacity-40"
        >
          <CheckCheck className="size-4" />
        </button>
      </div>
      <SectionCard
        contentClassName="!p-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
        className="!rounded-2xl lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
      >
        {mine.length ? (
          <div className="divide-y divide-line">
            {mine.map((notification) => {
              const href =
                notification.href ||
                (notification.orderId
                  ? `/portal/orders/${encodeOrderId(notification.orderId)}`
                  : "/portal/notifications");
              return (
                <div
                  key={notification.id}
                  className={`flex gap-3 p-4 lg:gap-4 lg:p-5 ${notification.readAt ? "bg-white" : "bg-[#f8fbff]"}`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-xl border lg:size-10 ${notification.priority === "high" ? "border-[#fecaca] bg-[#fef2f2] text-danger" : "border-[#cfe0f5] bg-accent-soft text-accent"}`}
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
                        className="text-sm font-medium text-ink hover:text-accent"
                      >
                        {notification.title}
                      </Link>
                      {notification.category && (
                        <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] uppercase tracking-wide text-body">
                          {notification.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] text-body lg:text-sm">
                      {notification.body}
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted lg:mt-2 lg:text-xs">
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
                      className="grid size-10 place-items-center rounded-xl text-accent hover:bg-white"
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
