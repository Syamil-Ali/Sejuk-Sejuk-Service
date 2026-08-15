# Organization communications

## Demo mode

Messages, conversations, memberships, notification read state, and announcements are persisted in the browser under the existing Sejuk Ops demo storage key. This makes every role usable in the assessment without infrastructure, but it does not synchronize different browsers or devices. Resetting demo data removes the simulated communication history.

## Production mode

Apply Supabase migrations in timestamp order. The organization communication migration adds conversations, members, messages, attachments, notification metadata, row-level security, and Realtime publication.

Configure these services before enabling production messaging:

- Supabase authentication and active `profiles` records for every staff member.
- Private `message-attachments` Storage bucket and the migration-provided policies.
- Realtime enabled for `messages` and `conversation_members`.
- Existing public Supabase URL and anonymous key environment variables.

Authorization is enforced by Postgres row-level security. UI filtering is only a convenience and must not replace the database policies. Order conversations are available to admins, managers, and the currently assigned technician. Direct conversations are limited to explicit members. Announcement recipients are materialized as members.

Attachments are limited to five files per message and 10 MB per file. Production downloads use short-lived signed URLs from `/api/messages/signed-url`.

The Ops Assistant scopes orders by role and identity before intent matching. Technicians receive only their own assigned-order records; formatting and model calls cannot widen that scope.
