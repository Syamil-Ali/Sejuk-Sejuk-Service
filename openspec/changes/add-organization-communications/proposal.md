## Why

Operational communication is currently fragmented: notifications and the Ops Assistant are manager-only, while administrators and technicians cannot reliably discuss orders or organization issues inside the system. A unified, permission-aware communication layer will keep decisions, corrections, and follow-ups visible to the people responsible for acting on them.

## What Changes

- Make notifications available to administrators, technicians, and managers with role-appropriate events, unread counts, priorities, and direct navigation to the relevant order or conversation.
- Make the Ops Assistant available to every role while restricting its queries and answers to data the signed-in user is authorized to access.
- Add persistent order conversations where authorized order participants can exchange messages and attachments in the context of a service job.
- Add persistent direct conversations between organization members.
- Add manager/admin announcements targeted to the whole organization or a selected role.
- Generate notifications for new messages, mentions, assignments, schedule changes, correction requests, completed work, payment activity, and operational escalations without duplicating identical alerts.
- Provide a local demo-compatible repository while defining Supabase persistence, row-level security, and realtime delivery for multi-user deployments.

## Capabilities

### New Capabilities

- `universal-notifications`: Role-aware notification delivery, prioritization, unread state, and navigation for every organization member.
- `role-aware-ops-assistant`: Permission-scoped operational questions and answers for administrators, technicians, and managers.
- `organization-messaging`: Persistent order conversations, direct conversations, announcements, attachments, mentions, and unread state.

### Modified Capabilities

None.

## Impact

- Replaces manager-only navigation and page guards for Notifications and Ops Assistant with role-aware access.
- Extends domain models, demo persistence, notification generation, and assistant intent handling.
- Adds messaging pages, order-thread integration, shared conversation components, repositories, and validation.
- Adds Supabase communication tables, indexes, storage conventions, realtime publication, and row-level security policies.
- Introduces notification/message permission tests and multi-role UI coverage while preserving existing order authorization rules.
