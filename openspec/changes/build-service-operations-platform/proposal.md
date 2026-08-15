## Why

Sejuk Sejuk Service needs a single internal web application to replace fragmented handling of service orders across five branches and more than forty field teams. The application should digitise the workflow from order creation through assignment, field completion, notification, management review, and operational reporting while demonstrating a practical, secure AI integration.

## What Changes

- Add a responsive, role-aware operations portal for Admin, Technician, and Manager users, with seeded demo identities and a simple role switch suitable for the assessment.
- Add admin order creation with generated order numbers, customer and service details, pricing, technician assignment, and an immediate order summary.
- Add a mobile-first technician workspace for assigned jobs, progress updates, work completion, extra charges, evidence uploads, remarks, and optional customer payment recording.
- Add service-type checklists that Admins can tailor per order and Technicians must complete with item-level notes and image proof before marking work done.
- Enforce the order lifecycle `New -> Assigned -> In Progress -> Job Done -> Reviewed -> Closed`, including role and assignment restrictions.
- Add manager review and closure workflows with traceable status, financial, and assignment history.
- Add WhatsApp deep-link notifications for assigned technicians and customers, plus an internal completion notification for managers/accounts.
- Add weekly and date-filtered KPI views for completed jobs, revenue, postponements/reschedules, and technician performance.
- Add a manager-only operations assistant that answers supported questions from structured, allow-listed system queries and clearly reports unsupported or unavailable answers.
- Provide deployment, seed data, test coverage, architecture notes, AI limitations, and assessment-focused README documentation.

## Capabilities

### New Capabilities

- `role-access`: Demo identity selection, role-aware navigation, and server-enforced Admin, Technician, and Manager permissions.
- `order-management`: Order number generation, customer/service capture, quoting, technician assignment, order summaries, and order discovery.
- `service-workflow`: Validated lifecycle transitions, mobile technician job execution, postponement/reschedule tracking, completion details, and final amount calculation.
- `job-evidence-and-payments`: Evidence file upload and retrieval plus optional payment and receipt recording against completed jobs.
- `review-and-audit`: Manager review, closure, exception visibility, and an immutable audit trail for key operational actions.
- `notifications`: WhatsApp deep-link message generation and internal job-completion notifications with delivery/action traceability.
- `performance-dashboard`: Weekly and date-filtered operational aggregates, technician comparisons, leaderboard, and simple visualisations.
- `operations-assistant`: Manager questions translated into controlled operational query intents, structured data retrieval, and grounded natural-language answers.

### Modified Capabilities

None. This is a new application with no existing product specifications.

## Impact

- Creates a new React and Tailwind web application with desktop admin/manager views and a mobile-first technician experience.
- Introduces a Supabase PostgreSQL schema, row-level access policies, Storage buckets/policies, seed data, and backend functions or server routes.
- Adds an AI provider integration for response formatting after deterministic, allow-listed operational queries; unrestricted model access to the database is excluded.
- Adds WhatsApp deep links rather than requiring a paid messaging provider, while keeping the notification boundary replaceable.
- Targets Vercel deployment and requires project documentation for local setup, environment variables, architecture, supported AI questions, assumptions, and limitations.
