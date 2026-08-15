## 1. Application Foundation

- [x] 1.1 Scaffold a Next.js App Router project with TypeScript, Tailwind CSS, linting, and an assessment-ready responsive base theme.
- [x] 1.2 Add runtime and development dependencies for Supabase, schema/form validation, dates/timezones, charts, unit tests, and Playwright.
- [x] 1.3 Define validated public and server-only environment configuration with a checked-in example environment file.
- [x] 1.4 Create browser, server, and middleware Supabase client utilities with typed error handling.
- [x] 1.5 Configure unit, component, and end-to-end test commands plus a production-build verification command.

## 2. Database, Security, and Seed Data

- [x] 2.1 Add a Supabase migration for roles, order statuses, service types, payment methods, review outcomes, notification kinds, and supporting enums/domains.
- [x] 2.2 Add tables, relationships, checks, and indexes for branches, profiles, orders, completions, evidence, payments, schedule events, reviews, notifications, and audit events.
- [x] 2.3 Implement collision-safe order-number generation and transactional order creation/assignment database functions.
- [x] 2.4 Implement version-checked transactional functions for start, reschedule, completion, review return/acceptance, and closure with atomic audit writes.
- [x] 2.5 Implement fixed-precision final-amount and payment constraints and prevent operational edits to closed orders.
- [x] 2.6 Add row-level security policies for Admin, assigned Technician, and Manager read/write scopes across all operational tables.
- [x] 2.7 Configure the private job-evidence bucket and object policies for order-scoped uploads and authorized signed access.
- [x] 2.8 Add dashboard and assistant query functions with parameterized date/technician inputs and minimum-field result shapes.
- [x] 2.9 Seed five branches, Admin and Manager demo users, technicians Ali/John/Bala/Yusoff, representative lifecycle data, payments, schedule events, and stable KPI fixtures.
- [x] 2.10 Add database tests covering policies, valid/invalid transitions, assignment ownership, optimistic conflicts, audit atomicity, money constraints, and aggregates.
- [x] 2.11 Generate application database types from the completed schema and expose typed repositories for server-side use.

## 3. Demo Access and Application Shell

- [x] 3.1 Build the demo identity selection screen and real Supabase sign-in flow for seeded Admin, Technician, and Manager accounts.
- [x] 3.2 Add protected-route middleware, session refresh, role-aware default redirects, and sign-out behavior.
- [x] 3.3 Build responsive desktop sidebar/mobile navigation that exposes only actions relevant to the authenticated role.
- [x] 3.4 Add reusable page headers, status badges, currency/date formatting, loading skeletons, empty states, errors, retry actions, and toast feedback.
- [x] 3.5 Add authorization tests proving hidden routes and direct mutations remain inaccessible to unauthorized roles.

## 4. Admin Order Workflow

- [x] 4.1 Implement shared order validation for customer, phone, address, problem, service type, quote, assignee, schedule, and notes.
- [x] 4.2 Build the responsive Admin order form with active-technician options, inline errors, pending-state protection, and unsaved-input handling.
- [x] 4.3 Connect order submission to the transactional creation function and display a complete post-submission summary with generated order number.
- [x] 4.4 Build the authorized order list with status filters, order/customer search, pagination, and clear loading/empty/error states.
- [x] 4.5 Build the shared order detail view with customer, assignment, schedule, service, financial, evidence, review, and status information appropriate to the viewer.
- [x] 4.6 Add Admin assignment/reassignment controls with active-technician validation and late-reassignment error handling.
- [x] 4.7 Implement Malaysian phone normalization and the server-generated technician WhatsApp assignment deep link with activation tracking.
- [x] 4.8 Add unit/component tests for validation, order creation, assignment, order summaries, search/filter behavior, and WhatsApp encoding.

## 5. Technician Field Workflow

- [x] 5.1 Build a touch-friendly mobile assigned-job list showing only the current Technician's active jobs and essential visit details.
- [x] 5.2 Build the Technician job detail and start-work action with stale-version conflict feedback.
- [x] 5.3 Add the reschedule/postponement form with reason, future datetime validation, persisted event history, and current-status preservation.
- [x] 5.4 Build a staged evidence uploader with progress, preview/removal, six-file limit, MIME/size validation, and abandoned-upload metadata handling.
- [x] 5.5 Build the completion form for work done, extra charges, calculated final amount, remarks, and optional payment/receipt fields.
- [x] 5.6 Commit completion, evidence metadata, optional payment, status transition, notification, and audit effects idempotently with duplicate-submit protection.
- [x] 5.7 Render private evidence through authorized short-lived URLs and display remaining payment balance.
- [x] 5.8 Add the post-completion customer feedback WhatsApp deep link with the required template, normalized recipient, and activation tracking.
- [x] 5.9 Add mobile viewport and integration tests for assignment isolation, start/reschedule, evidence rejection, amount calculation, payment limits, completion, and feedback links.

## 6. Manager Review, Notifications, and Audit

- [x] 6.1 Build the Manager notification list/badge with unread state, job links, mark-read behavior, and error handling.
- [x] 6.2 Build the completed-job review queue and detail view with evidence, financial/payment context, price variance, and missing-image indicators.
- [x] 6.3 Implement review acceptance and return-for-correction actions, requiring a reason for return and notifying the assigned Technician.
- [x] 6.4 Implement Manager closure of reviewed orders and verify closed records render read-only across all roles.
- [x] 6.5 Build an immutable chronological audit timeline for authorized Admin and Manager viewers.
- [x] 6.6 Add integration tests for completion notifications, review outcomes, correction return, closure locks, exception indicators, and audit visibility.

## 7. Performance Dashboard

- [x] 7.1 Implement Malaysian current-week and custom inclusive-date range utilities with consistent UTC boundaries.
- [x] 7.2 Connect Manager-only dashboard data access to the aggregate functions and validate returned KPI/technician shapes.
- [x] 7.3 Build KPI cards for completions, final amount, payments, outstanding balance, and postponements/reschedules.
- [x] 7.4 Build the technician leaderboard and accessible chart/table comparison with the specified ranking tie-breaker.
- [x] 7.5 Add synchronized date filters and distinct loading, successful-empty, and failed-query states.
- [x] 7.6 Add unit/integration tests for timezone boundaries, aggregates, ranking, date-filter synchronization, and dashboard access control.

## 8. Controlled Operations Assistant

- [x] 8.1 Define the supported intent enum, strict parameter schemas, question limits, Malaysian relative-date resolution, and assistant response types.
- [x] 8.2 Implement deterministic matching for common assessment questions and a validated model classifier for ambiguous supported phrasing.
- [x] 8.3 Implement the allow-listed dispatcher for technician completions, technician ranking, today's completion count, and current workload using only application-owned query functions.
- [x] 8.4 Add an AI provider adapter with OpenAI as the default implementation, strict structured output, timeout/error handling, and no database credentials or arbitrary SQL tools.
- [x] 8.5 Implement grounded answer formatting from minimal query results plus deterministic no-result and provider-failure fallbacks.
- [x] 8.6 Add Manager-only assistant rate limiting and privacy-conscious logs for intent, parameters, latency, result count, and errors.
- [x] 8.7 Build the operations query window with example prompts, interpreted filters, result/error presentation, supported-scope guidance, and conversation reset.
- [x] 8.8 Add unit/integration tests for every supported intent, unsupported and injection-like requests, technician/date validation, no results, provider outage, grounding, and role denial.

## 9. End-to-End Quality and Delivery

- [x] 9.1 Add Playwright coverage for Admin creation/assignment, Technician mobile start/completion/payment, Manager review/closure, and resulting dashboard updates.
- [x] 9.2 Add end-to-end coverage for private evidence authorization, WhatsApp link contents, internal notifications, and supported/unsupported assistant questions.
- [x] 9.3 Perform responsive and accessibility checks for keyboard navigation, labels, focus states, contrast, touch targets, and mobile overflow; fix discovered issues.
- [x] 9.4 Add CI to run formatting/linting, type checking, unit/integration tests, and a production build, with optional end-to-end execution when test credentials exist.
- [x] 9.5 Write the README with setup, migrations/seeding, demo roles, architecture decisions, supported AI queries, AI/data safeguards, assumptions, limitations, self-assessment, and test commands.
- [x] 9.6 Add Vercel/Supabase deployment instructions, environment-variable inventory, storage setup verification, and a post-deploy smoke-test checklist.
- [x] 9.7 Run strict OpenSpec validation and the complete available verification suite, then record any environment-dependent checks that remain for the deployed demo.

## 10. Service Checklist Workflow

- [x] 10.1 Add service-type checklist templates, order checklist items, item-level evidence linkage, constraints, indexes, RLS, and seed fixtures.
- [x] 10.2 Enforce complete required checklist items in the transactional job-completion function and support audited item reopening after correction review.
- [x] 10.3 Extend application domain state and demo actions with checklist defaults, progress, notes, proof metadata, assignment isolation, and completion gating.
- [x] 10.4 Add Admin checklist customization to order creation and pre-work order details.
- [x] 10.5 Build the Technician mobile checklist UI with progress, item toggles, notes, per-item image proof, and clear remaining-work feedback.
- [x] 10.6 Show checklist completion evidence in Manager review and allow correction returns to reopen selected items.
- [x] 10.7 Add unit, database, and desktop/mobile browser coverage for checklist authorization, persistence, completion gating, proof, and correction reopening.
- [x] 10.8 Run the full verification suite and strict OpenSpec validation for the checklist workflow.
