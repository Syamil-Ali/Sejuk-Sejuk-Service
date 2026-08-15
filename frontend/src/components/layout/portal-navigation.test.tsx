import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DemoUser, Role } from "@/lib/domain";
import { navigationLinks, portalNavigation } from "./portal-navigation";
import { PortalSidebar } from "./portal-sidebar";

const expectedLinks: Record<Role, string[]> = {
  admin: [
    "Orders",
    "Payments",
    "Messages",
    "Ops assistant",
    "Notifications",
    "How it works",
  ],
  manager: [
    "Dashboard",
    "Reviews",
    "Messages",
    "Ops assistant",
    "Notifications",
    "How it works",
  ],
  technician: [
    "Dashboard",
    "My jobs",
    "Messages",
    "Ops assistant",
    "Notifications",
    "How it works",
  ],
};

describe("portal navigation", () => {
  it.each(Object.entries(expectedLinks) as [Role, string[]][])(
    "keeps %s links ordered and sectioned",
    (role, labels) => {
      expect(navigationLinks(role).map((link) => link.label)).toEqual(labels);
      expect(
        portalNavigation[role].map((section) => section.label),
      ).toHaveLength(3);
    },
  );

  it("renders active navigation, unread counts, and user controls", () => {
    const onSignOut = vi.fn();
    const onReset = vi.fn();
    const onNavigate = vi.fn();
    const onPrepareNavigate = vi.fn();
    const user: DemoUser = {
      id: "admin-1",
      name: "Nadia",
      role: "admin",
      branch: "Shah Alam",
    };
    render(
      <PortalSidebar
        user={user}
        pathname="/portal/messages"
        unreadNotifications={2}
        unreadMessages={3}
        onSignOut={onSignOut}
        onReset={onReset}
        onNavigate={onNavigate}
        onPrepareNavigate={onPrepareNavigate}
      />,
    );

    const messages = screen.getByRole("link", { name: /Messages3/ });
    messages.addEventListener("click", (event) => event.preventDefault());
    expect(messages).toHaveClass("bg-[#dbeafe]");
    expect(
      within(screen.getByRole("navigation")).getByText("2"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sign out/ }));
    fireEvent.click(screen.getByRole("button", { name: /Reset/ }));
    fireEvent.click(messages);
    fireEvent.mouseEnter(messages);
    expect(onSignOut).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith("/portal/messages");
    expect(onPrepareNavigate).toHaveBeenCalledWith("/portal/messages");
  });
});
