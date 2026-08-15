## 1. Communication Data Foundation

- [x] 1.1 Add domain types and validation for conversations, memberships, messages, attachments, mentions, announcements, notification categories, priorities, and destinations
- [x] 1.2 Add a Supabase migration for communication tables, constraints, indexes, storage paths, and realtime publication
- [x] 1.3 Add and test row-level security policies for order conversations, direct conversations, announcements, messages, memberships, notifications, and attachments
- [x] 1.4 Regenerate database types and implement shared communication repository interfaces
- [x] 1.5 Implement the demo-mode repository and seed realistic order, direct, and announcement conversations

## 2. Universal Notifications

- [x] 2.1 Centralize event-to-recipient notification rules with category, priority, destination, and deduplication keys
- [x] 2.2 Generate notifications for assignments, schedules, postponements, corrections, completions, payments, announcements, messages, and mentions
- [x] 2.3 Generalize notification authorization and navigation for admin, technician, and manager roles
- [x] 2.4 Redesign the notification inbox with filters, priority treatment, actionable destinations, mark-one-read, and mark-all-read
- [x] 2.5 Add notification recipient, deduplication, unread-count, and navigation tests

## 3. Role-Aware Ops Assistant

- [x] 3.1 Add a role-and-identity authorization scope that filters operational records before assistant intent execution
- [x] 3.2 Expand supported admin intents for unassigned work, scheduling, payment balances, and technician allocation
- [x] 3.3 Expand supported technician intents for personal jobs, tomorrow's schedule, checklist progress, corrections, and service activity
- [x] 3.4 Preserve manager-wide workload, completion, and performance intents through the shared intent registry
- [x] 3.5 Generalize the assistant page, examples, descriptions, and navigation for all roles
- [x] 3.6 Add cross-role privacy, supported-intent, date-range, result-count, and unsupported-question tests

## 4. Shared Messaging Experience

- [x] 4.1 Build reusable conversation list, thread, message item, composer, attachment, mention, and unread components
- [x] 4.2 Build responsive Messages routing with desktop split view and mobile list-to-thread navigation
- [x] 4.3 Implement direct conversation creation with canonical participant pairing and recipient notifications
- [x] 4.4 Implement manager/admin announcement composition with all-members or role-targeted audiences
- [x] 4.5 Implement per-member read positions, unread conversation badges, pagination, and realtime updates
- [x] 4.6 Add message validation, attachment signed URLs, upload constraints, edit state, and soft deletion

## 5. Order Conversations

- [x] 5.1 Create or resolve one stable conversation per order and synchronize authorized membership on technician assignment changes
- [x] 5.2 Add the order conversation to the service-job page with a compact preview and full-thread access
- [x] 5.3 Connect correction requests and reopened checklist context to the order conversation without duplicating audit history
- [x] 5.4 Add order-conversation authorization, reassignment, message notification, and context-rendering tests

## 6. Navigation and Verification

- [x] 6.1 Add universal Messages, Notifications, and Ops Assistant sidebar/mobile links with consistent unread badges
- [x] 6.2 Verify keyboard navigation, focus management, screen-reader labels, touch targets, responsive layouts, and reduced motion
- [x] 6.3 Run Supabase policy tests, unit tests, integration tests, type checking, lint, and production build
- [x] 6.4 Document demo-mode limitations and production realtime/storage configuration
