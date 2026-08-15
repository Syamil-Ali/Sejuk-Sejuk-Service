## Context

The repository currently contains the assessment document and OpenSpec planning files but no application code. See `proposal.md` for motivation and the capability specs for behavior. The solution must work well for desktop-based office staff and mobile field technicians, run as an assessment demo with minimal sign-in friction, protect operational records and private uploads, deploy to Vercel, and keep AI access constrained to structured data.

## Goals / Non-Goals

**Goals:**

- Deliver one deployable TypeScript application covering the complete order lifecycle.
- Keep workflow rules, authorization, and financial calculations authoritative on the server/database boundary.
- Make the technician path fast on common mobile widths and resilient to repeated submissions.
- Make setup and review straightforward with migrations, seed data, demo identities, tests, and documented limitations.
- Isolate WhatsApp and AI providers behind small application boundaries so assessment-friendly implementations can later be replaced.

**Non-Goals:**

- Production workforce identity lifecycle, SSO, password recovery, or granular custom roles.
- Automatic WhatsApp delivery or delivery receipts through a paid WhatsApp Business provider.
- Offline-first synchronization or a native mobile application.
- Invoicing, refunds, accounting-ledger integration, route optimization, or multi-currency support.
- Model-generated SQL, unrestricted semantic search over the database, document extraction, or autonomous AI workflow decisions in the first release.

## Decisions

### Use Next.js App Router as the React application shell

Build a single Next.js TypeScript application with Tailwind CSS and deploy it to Vercel. Server Components handle initial data reads; Server Actions or route handlers validate mutations and AI requests. Interactive forms and charts remain client components. This keeps browser-only secrets out of the client and avoids maintaining a separate API service.

Alternatives considered: a Vite single-page app would be simpler for static UI but would require a separate trusted backend for AI credentials and privileged workflow mutations. A separate Express service adds deployment and integration overhead without helping the assessment scope.

### Use Supabase for PostgreSQL, authentication, and private object storage

Supabase migrations define the schema, database functions, indexes, and row-level security. Seeded email/password users back the demo identity selector; selecting a demo identity signs in that real Supabase user, so database policies can enforce the selected profile and role. Demo credentials are configuration for the assessment environment and must not be presented as a production authentication design.

Use a private `job-evidence` bucket. Object paths begin with the order UUID and uploads are validated for count, MIME type, and size before storage. Authorized viewers receive short-lived signed URLs.

Alternatives considered: a purely client-side role variable is faster but cannot enforce access. A custom signed mock cookie still requires privileged server reads and duplicates identity plumbing already available in Supabase.

### Model the operational domain explicitly

Use the following primary tables:

- `branches`: the five seeded branches.
- `profiles`: Supabase user linkage, display name, role, branch, phone, and active flag.
- `orders`: generated order number, customer fields, service type, quote, assignee, schedule, status, and optimistic `version`.
- `service_completions`: one current completion record per order with work done, extra charge, final amount, remarks, technician, and completion time.
- `job_evidence`: storage path, media kind, MIME type, size, uploader, and order linkage.
- `order_checklist_items`: ordered, required work steps copied from a service-type template, with completion actor/time and optional technician note.
- `checklist_evidence`: item-to-evidence linkage so proof images remain private and reviewable in context.
- `payments`: amount, method, optional receipt evidence, recorder, and received time.
- `schedule_events`: prior/new schedule, reason, actor, and time for postponement KPIs.
- `reviews`: Manager outcome, notes, reviewer, and review time.
- `notifications`: recipient role/user, kind, order, read/activated state, and timestamps.
- `audit_events`: append-only actor, action, entity, and JSON before/after metadata.

Store money as fixed-precision decimal in MYR and timestamps as UTC, converting calendar filters and display to `Asia/Kuala_Lumpur`. Generate order numbers in a database function backed by a sequence to avoid collisions.

Alternatives considered: embedding completion, payment, and file arrays inside `orders` reduces table count but makes audit history, aggregation, constraints, and file policies harder to reason about.

### Centralize lifecycle transitions in transactional database functions

Create parameterized functions for assignment, start, reschedule, completion, review/return, and closure. Each function checks authenticated role, assignee, current status, and expected order version; writes the domain record and audit event in one transaction; and returns the updated order. Database constraints also reject negative money and invalid status values. UI controls mirror these rules for guidance but are not authoritative.

Completion calculates `final_amount = quoted_price + extra_charges` inside the transaction. A returned review moves `Job Done` back to `In Progress` as the one explicit correction path; the review record and audit event explain the exception even though ordinary lifecycle reversal is forbidden.

The completion transaction also verifies that every required checklist item is complete. Checklist updates are limited to the assigned Technician while an order is `In Progress`; each completion records actor and time. Admins may tailor items before work starts, and a Manager return may reopen named items for correction.

Alternatives considered: implementing transitions only in UI/server code is easier initially but permits direct data calls and partial writes. Database triggers alone obscure user-facing errors and input contracts; explicit functions remain easier to test.

### Treat file upload as a staged operation

The client uploads validated files to temporary order-scoped paths, then completion commits their metadata with the job transaction. Failed or abandoned uploads are excluded from evidence queries and can be cleaned by a scheduled maintenance operation. The complete action is idempotent and disables duplicate submission while pending.

This trades a small cleanup requirement for a usable progress UI and avoids sending large files through Vercel functions.

### Use deep links for WhatsApp and database rows for internal notifications

Generate `https://wa.me/<normalized-number>?text=<encoded-message>` links on the server from allow-listed templates. Record link creation and activation, but never imply delivery. Completion creates Manager notifications transactionally. A notification-provider interface keeps a future WhatsApp Business API implementation possible.

Alternatives considered: automating messages through a third-party provider increases credentials, cost, webhook, and compliance scope beyond the assessment.

### Compute dashboard metrics in database query functions

Use parameterized aggregate functions that accept an inclusive Malaysian-local date range converted to UTC bounds. Return KPI totals and per-technician rows from the same bounds so cards, charts, and rankings agree. Index status/completion time, assignee/status, and schedule-event time. Use a lightweight React chart library for simple, accessible charts alongside tabular values.

Alternatives considered: aggregating fetched orders in the browser exposes excess data and scales poorly. Materialized views are unnecessary for the assessment dataset and complicate freshness.

### Implement AI as intent classification plus controlled retrieval

The assistant pipeline is:

1. Validate the authenticated Manager and question length/rate limit.
2. Ask the configured model for strict JSON containing one enumerated intent and validated parameters, or classify common patterns locally when possible.
3. Resolve relative dates in `Asia/Kuala_Lumpur`, validate technician identity, and dispatch to an application-owned query function.
4. Pass only the returned minimal JSON to the model for formatting.
5. Validate/display the answer and retain a deterministic renderer as fallback.

No database URL, service credential, schema dump, or SQL execution tool is exposed to the model. Log intent, normalized parameters, latency, result count, and errors without logging unnecessary customer addresses or phone numbers.

Alternatives considered: text-to-SQL supports more questions but violates the assessment's controlled-query constraint and expands security risk. Sending a complete dataset to the model is simpler but leaks excess data and becomes stale and expensive.

### Test at three boundaries

- Unit tests cover validation, amount calculations, phone/message formatting, date ranges, ranking tie-breakers, and assistant intent dispatch/fallback.
- Database/integration tests cover role policies, transition functions, audit atomicity, upload metadata constraints, and aggregates.
- Playwright end-to-end tests cover Admin creation/assignment, Technician mobile completion, Manager review/closure, dashboard updates, notification links, and supported/unsupported AI questions.

CI runs type checking, linting, unit/integration tests where configured, and a production build. Seed fixtures use stable dates or a test clock so weekly KPI and AI assertions remain deterministic.

## Risks / Trade-offs

- [Demo identity credentials could be mistaken for production security] -> Label them clearly, keep privileged keys server-only, restrict the demo project data, and document the production replacement path.
- [Upload succeeds but completion fails] -> Stage metadata, exclude uncommitted objects from reads, and document/schedule cleanup for abandoned paths.
- [Concurrent users overwrite workflow state] -> Require an expected version and perform status checks plus writes transactionally.
- [WhatsApp deep-link activation is mistaken for delivery] -> Use `opened` terminology and never display delivered/sent status without a provider receipt.
- [AI misclassifies a question or produces unsupported wording] -> Use an enumerated JSON contract, validate every parameter, display interpreted filters, and provide a deterministic fallback.
- [Serverless and Supabase free-tier cold starts affect the demo] -> Keep request paths small, avoid chat streaming as a dependency, and provide clear retry/error states.
- [Timezone boundaries skew weekly metrics] -> Convert explicit Malaysian-local range boundaries to UTC once and reuse them across dashboard and assistant queries.

## Migration Plan

1. Scaffold the Next.js application and environment validation.
2. Apply Supabase schema, functions, policies, storage configuration, and seed data to a development project.
3. Deploy the application to a Vercel preview environment and configure public Supabase values plus server-only AI credentials.
4. Run smoke and end-to-end tests with seeded Admin, Technician, and Manager identities.
5. Promote the same migrations and application build to the assessment demo environment.

Rollback consists of reverting the Vercel deployment and applying explicit forward-safe corrective migrations; destructive database rollback is avoided once demo orders exist.

## Open Questions

- The final AI provider can be selected at implementation time through a small provider adapter; OpenAI is the default example, and this choice does not change the supported intents or data-access design.
