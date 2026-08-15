## Context

See `proposal.md` for motivation. The local Supabase schema already models profiles, orders, checklist items, completions, evidence, payments, schedule events, reviews, notifications, and audit events. It also provides RLS policies and versioned lifecycle RPCs. The frontend's `DemoProvider` nevertheless initializes and mutates these domains in localStorage; only organization communications currently use a Supabase repository and realtime subscription.

## Goals / Non-Goals

**Goals:**

- Make local Supabase the production-mode source of truth for the existing operational UI.
- Reuse current RLS policies and lifecycle RPCs through the signed-in user's browser client.
- Keep current component-facing domain models stable while introducing repository mapping behind the provider boundary.
- Refresh authorized sessions promptly and recover after realtime reconnects.
- Verify the complete workflow on local Supabase before documenting hosted promotion.
- Complete the assessment's WhatsApp deep-link trigger and documentation requirements.

**Non-Goals:**

- Sending a service-role key to the browser.
- Replacing Supabase with an independent application server.
- Importing arbitrary localStorage demo changes into production tables.
- Redesigning order, review, payment, or notification pages.
- Integrating a paid WhatsApp Business delivery provider or claiming message delivery.

## Decisions

### Introduce a typed operations repository behind the existing provider contract

A `SupabaseOperationsRepository` will own reads, RPC calls, direct allowed updates, row mapping, and subscriptions. `DemoProvider` will select local behavior only in explicit demo mode and repository behavior otherwise. This minimizes page churn and prevents each page from issuing siloed queries. Directly rewriting every page around Supabase hooks was rejected because it duplicates joins, loading logic, and subscription management.

### Hydrate a domain snapshot from normalized tables

The repository will fetch the caller-visible parent orders and related tables, then map snake_case database rows into existing `ServiceOrder` objects. Related rows will be grouped by order id in memory. Fetching one nested PostgREST expression was considered, but separate typed queries produce clearer RLS behavior and error attribution across the existing generated types.

### Use existing RPCs for lifecycle transitions

Assign, start, reschedule, complete, review, reopen, and close operations will call the versioned database functions already defined by the operations migration. Checklist edits, payment recording, notification reads, and order creation will use an RPC or narrowly allowed table mutation as supported by existing policies; missing atomic operations will be added through a migration. The UI will refresh after each committed mutation and will not optimistically claim success before the database accepts it.

### Coalesce realtime events into snapshot refreshes

Production clients will subscribe to caller-visible changes on operational tables. Events will schedule a short debounced snapshot refresh rather than manually patching many denormalized objects. This trades a small amount of read traffic for correctness and simpler reconciliation. Relevant tables will be added idempotently to the realtime publication, and reconnect/subscription readiness will trigger refresh.

### Keep authorization in Supabase

The browser repository uses the normal authenticated Supabase client and never accepts a service-role credential. RLS decides which rows are returned and RPCs verify role, assignment, branch, and version. Client-side role checks remain usability guards, not security boundaries.

### Separate shared operational readiness from communications readiness

Production provider initialization will wait for authentication and the operations snapshot before setting operational readiness. Communications can continue through its repository, but an error in either domain will be represented explicitly rather than causing seeded data to appear. Mutations return promises so UI handlers can await commits and show errors consistently.

### Treat local Supabase as the first complete environment

Implementation and two-session verification will target the checked-in local Supabase project at `127.0.0.1:54321`. Hosted promotion will reuse the migrations, RLS policies, storage rules, and anonymous authenticated client, changing only environment values and platform redirect/storage configuration. Building directly against hosted infrastructure was rejected because it makes development dependent on external state and obscures reproducibility for the assessment.

### Present WhatsApp handoff only after persistence succeeds

The completion UI will not open WhatsApp before the database accepts the transition. After a successful refresh confirms Job Done, it will present a focused success action containing the existing pre-filled feedback link. Activating that link records an audit event such as `whatsapp.feedback_opened`; no event or copy will claim delivery. Automatic background sending was rejected because `wa.me` requires user interaction and provides no delivery webhook.

### Rewrite README from verified behavior

Documentation will be updated after the local two-session test so commands and limitations reflect observed behavior. It will distinguish local demo mode, local Supabase mode, and later hosted promotion, and replace stale OpenAI/four-intent descriptions with the current Gemini/Agno controlled-query architecture.

## Risks / Trade-offs

- [Snapshot refreshes generate more reads than local patching] -> Debounce bursts and query only caller-visible indexed data.
- [Existing frontend domain fields may not map one-to-one] -> Centralize mapping and add fixture-based repository tests before switching provider behavior.
- [Some existing table policies permit reads but not a needed write] -> Add narrowly scoped security-definer RPCs with explicit role/version checks and database tests.
- [Realtime publication changes can be reapplied locally] -> Use idempotent migration logic that checks publication membership.
- [Existing local demo state disappears in production mode] -> Keep it available only under explicit demo mode and document reset/seed expectations.
- [Async mutations change existing synchronous context signatures] -> Convert provider mutation contracts and callers systematically, with typecheck-driven coverage.
- [Browsers can block unsolicited WhatsApp windows] -> Present a user-activated completion success action instead of attempting a blocked popup.

## Migration Plan

1. Add any missing atomic RPCs, grants, realtime publication entries, and database tests.
2. Regenerate or update frontend database types.
3. Implement and test repository hydration/mapping and mutation methods.
4. Switch non-demo provider initialization and mutations to the repository while retaining demo behavior.
5. Add realtime refresh and reconnect handling.
6. Validate the technician-complete to manager-review flow and WhatsApp handoff with two authenticated browser contexts against local Supabase.
7. Rewrite the README from the verified local commands and document hosted promotion as a later configuration step.

Rollback keeps the database additions in place but restores the provider's prior selection logic. No destructive data migration is required.
