## Context

See proposal.md for motivation. The Next.js application currently has manager-only notification and assistant pages, client-side demo persistence, Supabase authentication/data infrastructure, and existing order authorization concepts. Communication spans UI, domain state, persistence, realtime delivery, storage, assistant scoping, and row-level security.

## Goals / Non-Goals

**Goals:**
- One shared communication model supporting order threads, direct conversations, and announcements.
- Role-safe notifications and assistant results for all three roles.
- Production-capable Supabase persistence/realtime with deterministic demo-mode behavior.
- Reusable inbox, conversation list, message thread, composer, attachment, and unread primitives.

**Non-Goals:**
- Voice/video calls, customer-facing chat, typing indicators, presence status, message reactions, or a complete Slack replacement.
- Arbitrary database access by the assistant.
- End-to-end encryption or external push/SMS delivery in this change.

## Decisions

1. Model communication around `conversations`, `conversation_members`, `messages`, `message_attachments`, and per-member `last_read_at`. Conversation kind is `order`, `direct`, or `announcement`; this avoids three unrelated message implementations. Alternative: separate tables per feature, rejected because unread logic and UI would be duplicated.
2. Use Supabase Postgres as the multi-user source of truth, Storage for attachments, Realtime for authorized inserts/updates, and RLS as the final authorization boundary. Demo mode mirrors the same repository contract in local state so the assessment remains runnable without external services.
3. An order conversation has a stable one-to-one relationship with an order. Admins and managers may access it; technicians may access it only when assigned to that order. Membership synchronization follows assignment changes without deleting message history.
4. Direct conversations use a canonical participant key so the same pair cannot accidentally create duplicate threads. Announcements use explicit audience role/all metadata and read membership per recipient.
5. Notifications are immutable delivery records with category, priority, recipient, optional order/conversation/message references, deduplication key, and read timestamp. One centralized notification service maps domain events to recipients.
6. Mentions augment, rather than replace, normal conversation notifications. A deduplication key prevents a mentioned conversation member from receiving two alerts for one message.
7. Assistant authorization happens before intent execution: a role-scoped order set and supported-intent registry are supplied to the deterministic query layer. Formatting cannot widen access. Admin, technician, and manager intent catalogs share primitives but expose different questions.
8. The communication UI uses a wide split layout on desktop and list-to-thread navigation on mobile. The existing sidebar remains universal; Notifications, Ops Assistant, and Messages links appear for all roles with unread badges.
9. Attachments are validated by allow-listed MIME type, size, and count, stored under organization/conversation paths, and accessed through short-lived signed URLs.

## Risks / Trade-offs

- [Realtime and RLS rules can disagree] → Treat RLS as authoritative and test select/insert/update policies for every role and conversation kind.
- [Demo mode cannot represent true cross-device messaging] → Label it as simulated shared state and keep repository interfaces identical to production.
- [Notification storms from busy threads] → Deduplicate per event/recipient and avoid notifying the sender.
- [Assignment changes could expose old messages] → Preserve the record but calculate current access from explicit membership and order authorization; record membership changes for auditability.
- [Assistant answers could leak data through aggregates] → Scope records before aggregation and test cross-technician denial cases.
- [Large threads degrade rendering] → Fetch messages in reverse chronological pages and anchor scrolling when older pages load.

## Migration Plan

1. Add communication tables, constraints, indexes, RLS policies, storage rules, and realtime publication through a new Supabase migration.
2. Extend generated database/domain types and introduce repository contracts with Supabase and demo implementations.
3. Generalize notifications and assistant permissions before exposing their navigation links to all roles.
4. Add order conversations, then direct messages and announcements using the shared messaging components.
5. Backfill an order conversation lazily on first access; existing notifications remain valid and gain optional references.
6. Roll back UI routes and realtime subscriptions first; additive communication tables can remain without affecting order operations.
