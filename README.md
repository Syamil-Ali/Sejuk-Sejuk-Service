# Sejuk Sejuk Service Sdn Bhd

The Sejuk Sejuk Service Sdn Bhd operations platform is an end-to-end air-conditioning field-service application covering order intake, technician assignment and field work, manager review, payments, notifications, internal messaging, analytics, and a permission-scoped AI assistant.

## Architecture

```text
frontend/          Next.js 16, React 19, Tailwind CSS, authenticated BFF routes
backend/supabase/  PostgreSQL schema, RPCs, RLS, Realtime, Storage, seed and pgTAP tests
backend/agno/      FastAPI + Agno + Gemini read-only operations assistant
docs/              deployment, security and assessment documentation
openspec/          specifications and implementation history
```

The browser uses the authenticated Supabase client. RLS is the data boundary; lifecycle RPCs enforce roles, assignment, state, and optimistic order versions atomically. The browser never receives a service-role key. Operational realtime events are debounced into authoritative snapshot refreshes so different sessions converge on persisted state.

## Implemented modules

- **Admin:** create orders with generated numbers, customize checklists, assign technicians, search/filter the queue, inspect audit history, and collect outstanding payments with notes.
- **Technician:** role-scoped job queue and dashboard, start/reschedule work, explicitly save checklist items and notes, upload private evidence, complete work, record field payment, and open a pre-filled customer feedback handoff.
- **Manager:** completion/correction queues, accept or return selected checklist work, close reviewed jobs, receive notifications, and view date-scoped KPI charts and leaderboards.
- **Organization:** direct/order conversations, announcements, mentions, notifications, read state, and realtime synchronization.
- **WhatsApp:** user-activated `wa.me` links for assignment and customer feedback. Feedback opening is audited with `delivery_confirmed=false`; the application never claims delivery.
- **AI:** authenticated, read-only Agno service using Gemini for tool planning and response formatting, controlled operational tools, an organization handbook, and guarded analytical SQL over curated security-invoker views.

## Local setup

Requirements: Node.js 20.19+, npm, Docker Desktop, Python 3.10+, and the Supabase CLI (the commands below can use `npx`).

```powershell
npm install
npx supabase start --workdir backend
npx supabase db reset --workdir backend
Copy-Item frontend/.env.example frontend/.env.local
npm run dev --workspace @sejuk/frontend
```

Set these local frontend values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from npx supabase status --workdir backend>
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_DEMO_ACCOUNT_PASSWORD=SejukDemo2026!
AGNO_ASSISTANT_URL=http://127.0.0.1:8000
AGNO_ASSISTANT_ENABLED=true
```

For the AI service:

```powershell
cd backend/agno
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn sejuk_assistant.main:app --reload --port 8000
```

Configure the Agno `.env` with the local Supabase URL/public key, Gemini API key/model, and `SEJUK_QUERY_SKILL_ENABLED=true`. The seeded local identities are Nadia (Admin), Farah (Manager), and technicians Ali, John, Bala, and Yusoff. `SejukDemo2026!` is assessment-only and must not be reused.

Set `NEXT_PUBLIC_DEMO_MODE=true` only for the isolated browser-local demonstration. In Supabase mode, failed shared loading is shown with retry and never replaced by seeded localStorage data.

## AI behavior and security

The Next.js assistant route forwards the signed-in user's JWT to Agno. Gemini selects one role-allowed, read-only tool; the tool retrieves authorized evidence; Gemini summarizes that evidence. Available subjects include orders, payments, performance, postponements, staff, permitted messages, reviews/audits, handbook guidance, documents, and analytical questions.

Analytical SQL is generated only against reviewed `assistant_analytics_*` views. `sqlglot` rejects writes/DDL, multiple statements, system catalogs, unapproved relations/functions, `SELECT *`, excessive joins/nesting, large limits, and overlong date ranges. Execution uses the caller JWT through a capped, timed RPC; underlying RLS continues to scope technicians to their own work. Audits retain fingerprints and safe metadata, not raw SQL literals, credentials, or returned rows. Casual conversation is supported; unrelated subjects such as sports or homework are declined.

Document retrieval exists but is not required for handbook guidance. The operational handbook is a reviewed Markdown knowledge source, not RAG. The assistant is read-only and cannot change workflows or payments.

## Verification

```powershell
npx supabase db reset --workdir backend
npx supabase test db --workdir backend
npm run lint --workspace @sejuk/frontend
npm run typecheck --workspace @sejuk/frontend
npm run test --workspace @sejuk/frontend
npm run build --workspace @sejuk/frontend
cd backend/agno
python -m pytest
```

The database suite covers role scope, lifecycle transitions, manager correction, reopened work, payments/notes, notification reads, realtime publication, and truthful WhatsApp audit state. Frontend tests cover repository hydration/mutations/conflicts/subscriptions and UI behavior.

## Hosted promotion

Apply the same checked-in migrations to hosted Supabase, create production Auth/profile records, configure private Storage and redirect URLs, and replace only the public Supabase URL/key environment values. Keep `NEXT_PUBLIC_DEMO_MODE=false`. Workflow code and the browser security model do not change. Deploy the frontend and Agno service separately and point `AGNO_ASSISTANT_URL` to the private service endpoint.

## Limitations and production improvements

- `wa.me` confirms only that the handoff was opened. Confirmed delivery requires WhatsApp Business consent, provider webhooks, and message-status storage.
- Local assessment identity cards use shared seeded credentials; production should use workforce SSO/MFA and derive the directory entirely from profiles.
- Field drafts are not offline-capable; weak-connectivity deployments should add encrypted local drafts and conflict-aware upload retry.
- Evidence is private and signed, but production needs retention, malware scanning, and lifecycle policies.
- AI quality depends on Gemini availability and the reviewed semantic profile. It cannot answer outside authorized evidence and intentionally cannot write data.

## Assessment reflection

Order intake was the most direct module. The difficult work was keeping mobile field actions, payments, evidence, review corrections, realtime sessions, auditability, and AI queries consistent under one authorization model. AI tools helped structure requirements and implementation, while application AI remains deliberately read-only and evidence-bound.

See [docs/assessment-status.md](docs/assessment-status.md) and [docs/deployment.md](docs/deployment.md).
