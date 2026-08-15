## Why

The frontend currently persists operational workflow state in browser-local storage even when Supabase mode is enabled, so a technician completing a job is invisible to a manager using another tab, browser, or device. The repository already contains local Supabase tables, role policies, and lifecycle RPCs; the frontend must use them as the shared source of truth.

## What Changes

- Add a Supabase operations repository that loads orders with checklist, completion, payment, review, schedule, evidence, audit, and notification data.
- Route production-mode lifecycle mutations through the existing caller-authorized Supabase RPCs and tables instead of browser-local callbacks.
- Subscribe authenticated portal sessions to relevant realtime operational changes and refresh shared state without reloading the page.
- Keep browser-local seeded behavior only when explicit demo mode is enabled.
- Add missing realtime publication coverage and narrowly scoped database changes required for operational synchronization.
- Preserve role-based visibility: technicians see only assigned work; managers and admins retain their authorized organizational views.
- Provide deterministic loading, mutation-error, and conflict handling so stale versions are not silently overwritten.
- Trigger a pre-filled customer WhatsApp feedback handoff after a successful Job Done commit and audit the handoff without claiming delivery.
- Update project documentation to accurately describe the implemented Supabase, Gemini/Agno, analytics, setup, and remaining limitations.
- Build and verify against local Supabase first; promotion to hosted Supabase changes environment configuration and applies the same migrations without changing application behavior.

## Capabilities

### New Capabilities

- `shared-operational-state`: Defines Supabase-backed, role-scoped operational persistence and realtime visibility across authenticated sessions.

### Modified Capabilities

None.

## Impact

- Affects the frontend demo provider/state boundary, repository layer, order/checklist/review/payment actions, notifications, WhatsApp completion handoff, generated database types, Supabase migrations, documentation, and integration tests.
- Uses the existing local Supabase stack and authenticated user token; no service-role key is required in the browser.
- Existing localStorage demo data remains isolated to `NEXT_PUBLIC_DEMO_MODE=true` and is not automatically imported into production tables.
- Local Supabase at `127.0.0.1:54321` is the required first implementation target; hosted Supabase is a later environment promotion.
