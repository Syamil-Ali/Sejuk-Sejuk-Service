import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DemoUser, OrganizationConversation } from "@/lib/domain";
import { ConversationRow, Thread } from "./conversation-components";

afterEach(cleanup);
const users: DemoUser[] = [
  { id: "manager-1", name: "Farah", role: "manager", branch: "HQ" },
  { id: "tech-1", name: "John", role: "technician", branch: "KL" },
];
const conversation: OrganizationConversation = {
  id: "conversation-1",
  kind: "direct",
  title: "Farah and John",
  createdBy: "manager-1",
  createdAt: "2026-08-14T01:00:00Z",
  members: [{ userId: "manager-1" }, { userId: "tech-1" }],
  messages: [],
};

describe("communication components", () => {
  it("renders conversation selection independently from page state", () => {
    const onClick = vi.fn();
    render(
      <ConversationRow
        conversation={conversation}
        userId="manager-1"
        users={users}
        active
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /John/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows only the other member in a direct conversation", () => {
    render(
      <Thread
        conversation={conversation}
        userId="manager-1"
        users={users}
        onBack={vi.fn()}
        onSend={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "John" })).toBeInTheDocument();
    expect(screen.queryByText("Farah and John")).not.toBeInTheDocument();
  });

  it("detects typed mentions and sends their user ids", () => {
    const onSend = vi.fn();
    render(
      <Thread
        conversation={conversation}
        userId="manager-1"
        users={users}
        onBack={vi.fn()}
        onSend={onSend}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
      target: { value: "@John please check this" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSend).toHaveBeenCalledWith(
      "@John please check this",
      ["tech-1"],
      [],
    );
  });

  it("sends with Enter and keeps Shift+Enter for a new line", () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(
      <Thread
        conversation={conversation}
        userId="manager-1"
        users={users}
        onBack={vi.fn()}
        onSend={onSend}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const composer = screen.getByRole("textbox", { name: "Message" });
    fireEvent.change(composer, { target: { value: "First line" } });
    fireEvent.keyDown(composer, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(composer, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("First line", [], []);
  });

  it("starts at button height and is configured to grow with content", () => {
    render(
      <Thread
        conversation={conversation}
        userId="manager-1"
        users={users}
        onBack={vi.fn()}
        onSend={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const composer = screen.getByRole("textbox", { name: "Message" });
    expect(composer).toHaveAttribute("rows", "1");
    expect(composer).toHaveStyle({ height: "48px" });
    expect(composer).toHaveClass("max-h-32", "overflow-y-auto");
  });
});
