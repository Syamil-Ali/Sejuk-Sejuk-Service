"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDemo } from "./demo-provider";
import { MobileMenu, PortalContent, PortalSidebar } from "./layout";
import { PortalNavigationProgress } from "./layout/portal-navigation-progress";
import { usePortalNavigation } from "./layout/use-portal-navigation";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import {
  canAccessConversation,
  conversationUnread,
} from "@/lib/communications";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, operationalError, retryOperations, user, signOut, reset, notifications, conversations, orders } =
    useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const navigation = usePortalNavigation(
    pathname,
    user?.role ?? "admin",
    router,
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-body">
        Preparing workspace…
      </div>
    );
  }

  if (operationalError && orders.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center">
          <h1 className="font-heading text-lg font-semibold text-slate-900">Could not load operations</h1>
          <p className="mt-2 text-sm text-slate-600">{operationalError}</p>
          <button className="btn-primary mt-5" onClick={() => void retryOperations()}>Retry</button>
        </div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(
    (notification) =>
      !notification.readAt &&
      (notification.recipientRole === user.role ||
        notification.recipientId === user.id),
  ).length;
  const unreadMessages = conversations
    .filter((conversation) => canAccessConversation(conversation, user, orders))
    .reduce(
      (sum, conversation) => sum + conversationUnread(conversation, user.id),
      0,
    );

  const handleSignOut = async () => {
    if (!getPublicEnv().demoMode) await createClient().auth.signOut();
    signOut();
    router.push("/login");
    router.refresh();
  };

  const handleReset = () => {
    reset();
    router.push("/login");
  };

  return (
    <div className="min-h-screen lg:grid lg:h-[calc(100vh/0.9)] lg:min-h-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:overflow-hidden">
      <PortalNavigationProgress pending={navigation.pending} />
      {operationalError && (
        <div className="fixed right-4 top-4 z-[70] flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <span>Operations could not synchronize.</span>
          <button className="font-semibold underline" onClick={() => void retryOperations()}>Retry</button>
        </div>
      )}
      <PortalSidebar
        user={user}
        pathname={pathname}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
        onSignOut={() => void handleSignOut()}
        onReset={handleReset}
        onNavigate={navigation.beginNavigation}
        onPrepareNavigate={navigation.prepareNavigation}
      />
      <PortalContent
        pathname={pathname}
        user={user}
        onSignOut={() => void handleSignOut()}
        menuOpen={mobileMenuOpen}
        onOpenMenu={() => setMobileMenuOpen(true)}
        onCloseMenu={() => setMobileMenuOpen(false)}
      >
        {children}
      </PortalContent>
      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        role={user.role}
        pathname={pathname}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
        onNavigate={navigation.beginNavigation}
        onPrepareNavigate={navigation.prepareNavigation}
      />
    </div>
  );
}
