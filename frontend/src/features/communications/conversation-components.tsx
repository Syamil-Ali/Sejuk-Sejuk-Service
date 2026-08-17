"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Paperclip,
  Pencil,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  conversationDisplayTitle,
  conversationUnread,
} from "@/lib/communications";
import type {
  DemoUser,
  MessageAttachment,
  OrganizationConversation,
  Role,
} from "@/lib/domain";
import { localDateTime } from "@/lib/utils";

export function ConversationRow({
  conversation,
  userId,
  users,
  active,
  onClick,
}: {
  conversation: OrganizationConversation;
  userId: string;
  users: DemoUser[];
  active: boolean;
  onClick: () => void;
}) {
  const unread = conversationUnread(conversation, userId);
  const last = conversation.messages.at(-1);
  const title = conversationDisplayTitle(conversation, userId, users);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full gap-3 px-4 py-4 text-left ${active ? "bg-accent-soft" : "hover:bg-canvas"}`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1f5f9] text-body">
        {conversation.kind === "order" ? (
          <MessageSquare className="size-4" />
        ) : (
          <Users className="size-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <strong className="truncate text-sm font-medium text-ink">
            {title}
          </strong>
          {unread > 0 && (
            <span className="ml-auto rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] text-white">
              {unread}
            </span>
          )}
        </span>
        <span className="mt-1 block truncate text-xs text-body">
          {last ? `${last.senderName}: ${last.body}` : "No messages yet"}
        </span>
      </span>
    </button>
  );
}

export function Thread({
  conversation,
  userId,
  users,
  onBack,
  onSend,
  onEdit,
  onDelete,
}: {
  conversation: OrganizationConversation;
  userId: string;
  users: DemoUser[];
  onBack: () => void;
  onSend: (
    body: string,
    mentions: string[],
    attachments: MessageAttachment[],
  ) => Promise<void>;
  onEdit: (messageId: string, body: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [visibleCount, setVisibleCount] = useState(50);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const available = useMemo(
    () =>
      conversation.members
        .map((member) => users.find((user) => user.id === member.userId))
        .filter(Boolean),
    [conversation.members, users],
  );
  const title = conversationDisplayTitle(conversation, userId, users);
  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = "48px";
    composer.style.height = `${Math.min(Math.max(composer.scrollHeight, 48), 128)}px`;
  }, [body]);
  return (
    <>
      <header className="flex min-h-16 items-center gap-3 border-b border-line px-5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="grid size-10 place-items-center rounded-xl lg:hidden"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="text-xs capitalize text-body">
            {conversation.kind} conversation
          </p>
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {conversation.messages.length > visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 50)}
            className="mx-auto block rounded-full border border-line px-4 py-2 text-xs text-body"
          >
            Load older messages
          </button>
        )}
        {conversation.messages.slice(-visibleCount).map((message) => (
          <article
            key={message.id}
            className={`max-w-[82%] rounded-2xl border px-4 py-3 ${message.senderId === userId ? "ml-auto border-[#bfdbfe] bg-accent-soft" : "border-line bg-white"}`}
          >
            <p className="text-xs font-medium text-body">
              {message.senderName}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {message.deletedAt ? "Message deleted" : message.body}
            </p>
            {message.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    type="button"
                    onClick={async () => {
                      if (!attachment.storagePath) return;
                      try {
                        const response = await fetch(
                          "/api/messages/signed-url",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              path: attachment.storagePath,
                            }),
                          },
                        );
                        const result = (await response.json()) as {
                          url?: string;
                          error?: string;
                        };
                        if (!response.ok || !result.url)
                          throw new Error(
                            result.error || "Unable to open attachment.",
                          );
                        window.open(
                          result.url,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Unable to open attachment.",
                        );
                      }
                    }}
                    className="flex items-center gap-2 rounded-lg border border-line bg-white/70 px-2 py-1 text-xs text-body"
                  >
                    <FileText className="size-3" /> {attachment.name}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-2 flex items-center gap-2 text-[10px] text-muted">
              {localDateTime.format(new Date(message.createdAt))}
              {message.editedAt && " · edited"}
              {message.senderId === userId && !message.deletedAt && (
                <>
                  <button
                    type="button"
                    aria-label="Edit message"
                    className="ml-auto"
                    onClick={() => {
                      const next = window.prompt("Edit message", message.body);
                      if (next?.trim()) onEdit(message.id, next);
                    }}
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete message"
                    onClick={() => onDelete(message.id)}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </>
              )}
            </p>
          </article>
        ))}
        {!conversation.messages.length && (
          <div className="grid min-h-48 place-items-center text-sm text-body">
            Start the conversation.
          </div>
        )}
      </div>
      <form
        className="border-t border-line p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!body.trim()) return;
          const detectedMentions = available
            .filter(
              (member) =>
                member!.id !== userId &&
                body
                  .toLocaleLowerCase()
                  .includes(`@${member!.name}`.toLocaleLowerCase()),
            )
            .map((member) => member!.id);
          await onSend(body, detectedMentions, attachments);
          setBody("");
          setMentions([]);
          setAttachments([]);
        }}
      >
        <div className="mb-2 flex flex-wrap gap-2">
          {available
            .filter((member) => member!.id !== userId)
            .map((member) => (
              <button
                key={member!.id}
                type="button"
                onClick={() => {
                  const token = `@${member!.name}`;
                  const selected = mentions.includes(member!.id);
                  setMentions((all) =>
                    selected
                      ? all.filter((id) => id !== member!.id)
                      : [...all, member!.id],
                  );
                  setBody((current) => {
                    if (selected) {
                      return current
                        .replaceAll(token, "")
                        .replace(/ {2,}/g, " ")
                        .trimStart();
                    }
                    const prefix = current.trimEnd();
                    return prefix ? `${prefix} ${token} ` : `${token} `;
                  });
                }}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${mentions.includes(member!.id) ? "border-[#2563eb] bg-accent-soft text-accent" : "border-line text-body"}`}
              >
                @{member!.name}
              </button>
            ))}
        </div>
        <div className="flex gap-2">
          <label className="grid size-12 shrink-0 cursor-pointer place-items-center self-end rounded-xl border border-line text-body hover:bg-canvas">
            <span className="sr-only">Attach files</span>
            <Paperclip className="size-4" />
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = [...(event.target.files || [])].slice(0, 5);
                setAttachments(
                  files.map((file) => ({
                    id: crypto.randomUUID(),
                    name: file.name,
                    type: file.type.startsWith("image/")
                      ? "image"
                      : file.type === "application/pdf"
                        ? "pdf"
                        : "file",
                    size: file.size,
                  })),
                );
                event.target.value = "";
              }}
            />
          </label>
          <textarea
            ref={composerRef}
            aria-label="Message"
            maxLength={2_000}
            rows={1}
            value={body}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            onChange={(event) => {
              const nextBody = event.target.value;
              setBody(nextBody);
              setMentions(
                available
                  .filter(
                    (member) =>
                      member!.id !== userId &&
                      nextBody
                        .toLocaleLowerCase()
                        .includes(`@${member!.name}`.toLocaleLowerCase()),
                  )
                  .map((member) => member!.id),
              );
            }}
            placeholder="Write a message..."
            className="min-h-12 max-h-32 flex-1 resize-none overflow-y-auto rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-[#60a5fa]"
          />
          <button
            aria-label="Send message"
            className="grid size-12 place-items-center self-end rounded-xl bg-brand text-white"
          >
            <Send className="size-4" />
          </button>
        </div>
        {attachments.length > 0 && (
          <p className="mt-2 text-xs text-body">
            {attachments.map((attachment) => attachment.name).join(", ")}
          </p>
        )}
      </form>
    </>
  );
}

export function CreateConversation({
  kind,
  currentUserId,
  users,
  onClose,
  onDirect,
  onAnnouncement,
}: {
  kind: "direct" | "announcement";
  currentUserId: string;
  users: DemoUser[];
  onClose: () => void;
  onDirect: (id: string) => void;
  onAnnouncement: (title: string, body: string, audience: Role | "all") => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/60 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        className="w-full max-w-lg rounded-2xl bg-white p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          if (kind === "direct") onDirect(String(data.get("participant")));
          else
            onAnnouncement(
              String(data.get("title")),
              String(data.get("body")),
              String(data.get("audience")) as Role | "all",
            );
        }}
      >
        <h2 className="text-xl font-semibold text-ink">
          {kind === "direct" ? "New message" : "Publish announcement"}
        </h2>
        {kind === "direct" ? (
          <label className="mt-5 block text-sm text-body">
            Team member
            <select required name="participant" className="field mt-2">
              <option value="">Select team member</option>
              {users
                .filter((user) => user.id !== currentUserId)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {user.role}
                  </option>
                ))}
            </select>
          </label>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="block text-sm text-body">
              Title
              <input
                required
                name="title"
                maxLength={120}
                className="field mt-2"
              />
            </label>
            <label className="block text-sm text-body">
              Audience
              <select required name="audience" className="field mt-2">
                <option value="all">Everyone</option>
                <option value="admin">Admins</option>
                <option value="technician">Technicians</option>
                <option value="manager">Managers</option>
              </select>
            </label>
            <label className="block text-sm text-body">
              Message
              <textarea
                required
                name="body"
                maxLength={2_000}
                rows={4}
                className="field mt-2"
              />
            </label>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-xl border border-line px-4 text-sm"
          >
            Cancel
          </button>
          <button className="min-h-10 rounded-xl bg-brand px-4 text-sm text-white">
            {kind === "direct" ? "Start conversation" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
