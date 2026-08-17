"use client";

import { useState } from "react";
import { BellRing, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/components/demo-provider";
import { canAccessConversation } from "@/lib/communications";
import {
  ConversationRow,
  CreateConversation,
  Thread,
} from "@/features/communications";

export default function MessagesPage() {
  const ctx = useDemo();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("conversation") || "",
  );
  const [creating, setCreating] = useState<"direct" | "announcement">();
  if (!ctx.user) return null;
  const conversations = ctx.conversations
    .filter((conversation) =>
      canAccessConversation(conversation, ctx.user!, ctx.orders),
    )
    .filter((conversation) =>
      conversation.title.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      (b.messages.at(-1)?.createdAt || b.createdAt).localeCompare(
        a.messages.at(-1)?.createdAt || a.createdAt,
      ),
    );
  const selected =
    conversations.find((conversation) => conversation.id === selectedId) ||
    conversations[0];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-6 flex shrink-0 flex-wrap items-start gap-4">
        <div>
        <h1 className="page-title">
          Messages
        </h1>
<p className="mt-1.5 text-[13px] text-body lg:text-sm">
Order conversations and internal organization communication.
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setCreating("direct")}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-medium"
          >
            <Plus className="size-4" /> New message
          </button>
          {ctx.user.role !== "technician" && (
            <button
              type="button"
              onClick={() => setCreating("announcement")}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white"
            >
              <BellRing className="size-4" /> Announcement
            </button>
          )}
        </div>
      </header>
      <section className="grid min-h-0 flex-1 overflow-hidden card !rounded-2xl lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside
          className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-line`}
        >
          <label className="relative m-4 block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              aria-label="Search conversations"
              maxLength={120}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conversations..."
              className="min-h-11 w-full rounded-xl border border-line bg-canvas pl-10 pr-3 text-sm outline-none focus:border-[#60a5fa]"
            />
          </label>
          <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-line">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                userId={ctx.user!.id}
                users={ctx.users}
                active={conversation.id === selected?.id}
                onClick={() => {
                  setSelectedId(conversation.id);
                  void ctx.markConversationRead(conversation.id);
                }}
              />
            ))}
            {!conversations.length && (
              <p className="p-8 text-center text-sm text-body">
                No conversations found.
              </p>
            )}
          </div>
        </aside>
        <div
          className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-0 flex-col`}
        >
          {selected ? (
            <Thread
              conversation={selected}
              userId={ctx.user.id}
              users={ctx.users}
              onBack={() => setSelectedId("")}
              onSend={async (body, mentions, attachments) => {
                try {
                  await ctx.sendMessage(
                    selected.id,
                    body,
                    mentions,
                    attachments,
                  );
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Could not send message",
                  );
                }
              }}
              onEdit={async (messageId, body) => {
                try {
                  await ctx.editMessage(selected.id, messageId, body);
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Could not edit message",
                  );
                }
              }}
              onDelete={async (messageId) => {
                try {
                  await ctx.deleteMessage(selected.id, messageId);
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Could not delete message",
                  );
                }
              }}
            />
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-body">
              Choose or start a conversation.
            </div>
          )}
        </div>
      </section>
      {creating && (
        <CreateConversation
          kind={creating}
          currentUserId={ctx.user.id}
          users={ctx.users}
          onClose={() => setCreating(undefined)}
          onDirect={async (participant) => {
            try {
              const id = await ctx.startDirectConversation(participant);
              setSelectedId(id);
              setCreating(undefined);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Could not start conversation",
              );
            }
          }}
          onAnnouncement={async (title, body, audience) => {
            try {
              const id = await ctx.createAnnouncement(title, body, audience);
              setSelectedId(id);
              setCreating(undefined);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Could not publish announcement",
              );
            }
          }}
        />
      )}
    </div>
  );
}
