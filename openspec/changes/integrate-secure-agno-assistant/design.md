## Context

See `proposal.md` for motivation and scope. The application is a Next.js frontend/BFF backed by Supabase Auth, PostgreSQL, RLS, Storage, and database functions. Its current assistant is manager-only and deterministic in demo mode, with one narrow Next.js classification endpoint. The copied `backend/agno` code is an incomplete subset of another analytics application: it imports unavailable `app.storage` and `app.services` modules and assumes user-owned projects, uploaded datasets, artifacts, local files, and generated SQL.

Existing database controls already restrict most order-related tables through `can_access_order`, but some policies were designed for application usability rather than assistant retrieval. In particular, authenticated profile visibility is currently broad and existing manager analytics functions are not a complete role-aware query surface. The Agno service must therefore not receive unrestricted query access and must not depend on prompts to preserve authorization.

## Goals / Non-Goals

**Goals:**

- Make `backend/agno` a deployable Python HTTP service with a clean Sejuk Ops package boundary.
- Reuse framework-independent analytics, aggregation, reporting, and routing logic where it remains valuable.
- Authenticate callers with Supabase and enforce the same or stricter permissions than the product UI.
- Provide structured operational, analytical, and document tools with citations.
- Prevent cross-technician leakage even when identifiers are manipulated or the model selects an incorrect tool argument.
- Make every factual response diagnosable through correlation and source metadata.
- Allow independent deployment and horizontal scaling of stateless Agno API instances.

**Non-Goals:**

- Assistant-initiated writes or autonomous workflow decisions.
- A general-purpose SQL console, unrestricted text-to-SQL, or direct model database access.
- Training or fine-tuning a model on organization data.
- Replacing Supabase Auth, RLS, Storage, or PostgreSQL as systems of record.
- Preserving copied project/dataset/artifact APIs when they do not match Sejuk Ops.
- Guaranteeing answers for every possible question when authorized evidence is unavailable.

## Decisions

### 1. Run Agno as a standalone stateless Python service

The service will live under `backend/agno`, expose versioned HTTP endpoints through FastAPI, and package dependencies with `pyproject.toml` and a container definition. Initial endpoints are `POST /v1/chat`, a streaming transport for chat events, `GET /health/live`, and `GET /health/ready`.

Stateless API replicas will keep durable conversation/audit state in Supabase. This permits independent scaling and avoids in-process authorization or conversation state diverging across instances.

Alternative considered: embedding Python behind Next.js API routes. Rejected because it complicates deployment, prevents independent scaling, and couples long-running AI requests to the web deployment.

### 2. Pass the user's Supabase authorization context through the entire request

The frontend sends its Supabase access token to a same-origin Next.js BFF endpoint. The BFF forwards it to Agno over an authenticated service URL; Agno validates issuer, audience, signature, expiry, and subject, then loads the active profile from Supabase. The request schema will not accept authoritative role, branch, technician, or organization fields from the browser.

Normal retrieval uses a Supabase client operating under the caller JWT so RLS remains the final enforcement layer. A service-role client is isolated to administrative ingestion and internal audit insertion paths, never exposed as a general agent tool. Where internal writes require service authority, the service still derives actor and policy from the verified request and calls a narrowly scoped repository method.

Alternative considered: authenticate only between Next.js and Agno and send user metadata in JSON. Rejected because a compromised or incorrect BFF request could forge authorization context and downstream RLS could not enforce the original user.

### 3. Use a policy engine to construct capabilities, not to post-filter answers

An immutable `ActorContext` contains user id, role, branch, active state, and request correlation id. A central policy module converts this context into an allow-list of tool capabilities and hard resource predicates. Tool methods do not accept an unrestricted actor id; technician-scoped repositories bind `assigned_technician_id` to `ActorContext.user_id` internally.

The model sees only tools available for the resolved role. Repositories validate resources again and the database enforces RLS/authorized functions. Authorization occurs before retrieval; response redaction is only a final defense and not the primary control.

The initial matrix is:

| Capability | Admin | Manager | Technician |
|---|---:|---:|---:|
| Organization order and queue analysis | Yes | Yes | Own assigned jobs only |
| Technician comparison/performance | Yes | Yes | Own performance only |
| Payment and outstanding analysis | Yes | Yes | Related assigned jobs only |
| Reviews and audit history | Operational access | Yes | Assigned-job correction context only |
| Communications | Accessible conversations | Accessible conversations | Accessible conversations |
| Documents | Visibility metadata | Visibility metadata | Technician/all-users visibility |

Alternative considered: retrieve broadly and ask the model to avoid mentioning unauthorized data. Rejected because model instructions are not an authorization boundary and aggregated responses can leak protected facts.

### 4. Replace arbitrary SQL with typed analytical tools

The reusable aggregation validators, intent routing, report composition, and visualization helpers may be retained after imports and contracts are decoupled from the old application. The old `execute_dataset_sql` and project/dataset adapters will not be exposed.

Sejuk repositories will offer bounded operations such as order lookup, queue summary, technician performance, payment/outstanding summary, postponement analysis, audit lookup, and accessible conversation search. Inputs use validated identifiers, enumerated groupings, bounded date ranges, pagination, and maximum row counts. Complex aggregations run in reviewed SQL views or `SECURITY INVOKER`/carefully constrained RPCs with explicit role checks.

Alternative considered: read-only generated SQL. Rejected for the initial release because SQL parsing alone cannot reliably enforce semantic row and column authorization, and service-role execution would bypass RLS.

### 5. Store documents and vector metadata in Supabase with pre-ranking authorization

Document metadata records ownership, lifecycle state, source filename, checksum, version, and an explicit visibility policy such as all authenticated users, role set, branch set, or named users. Text chunks inherit the document policy and store location metadata. Embeddings use pgvector where available; private originals remain in a private Storage bucket.

Only a trusted ingestion endpoint or worker may upload and index documents. Retrieval first applies visibility predicates in PostgreSQL and only then ranks semantic/keyword matches. The model receives a small set of authorized excerpts with stable source ids. Deleted, archived, failed, or reprocessing documents are excluded.

Alternative considered: one unfiltered vector collection followed by application filtering. Rejected because nearest-neighbor results and metadata can leak protected document existence before filtering and because accidental omissions become high impact.

### 6. Treat citations as structured response data

Tools return typed evidence objects containing source type, stable id, display label, captured-at time, application path or document location, and the minimal fact/excerpt. The agent response envelope separates display text from citations and completion metadata. The frontend renders citations only when the caller can open the source; it never constructs privileged URLs from model text.

Answers involving volatile operational data include retrieval time. Answers without adequate authorized evidence explicitly state uncertainty.

Alternative considered: let the model write informal source names into prose. Rejected because those citations cannot be validated, linked safely, or audited.

### 7. Separate chat history, audit metadata, and diagnostic logs

Conversation messages are user-facing records with their own RLS. Assistant audit events store actor, correlation id, policy outcome, tool names, sanitized parameters, source ids, latency, token/usage metadata when available, and safe error codes. Runtime logs contain correlation ids and infrastructure events, not full prompts, results, tokens, or raw documents.

Retention settings are environment/configuration driven and implemented with scheduled cleanup. Administrators do not automatically gain unrestricted prompt visibility merely because they can operate the system; prompt access requires an explicit policy.

Alternative considered: store full traces for easier debugging. Rejected because traces often contain customer details, document content, and model-provider payloads.

### 8. Integrate through a Next.js BFF and preserve demo fallback

The browser will call a Next.js assistant route. In production mode, it verifies the web session, forwards the user token and correlation id to Agno, and relays the stream. Direct browser access to Agno is not required, reducing CORS and public-service configuration.

In demo mode, the existing deterministic local assistant remains available and is clearly labeled. It must not silently present demo output as production-backed data.

Alternative considered: call Agno directly from the browser. Rejected initially because the BFF provides a consistent application origin, centralized timeout handling, and a safer place to attach server configuration.

### 9. Tighten database policies before enabling broad assistant queries

A migration will add assistant document, chunk, conversation, and audit structures plus their RLS policies. Existing policies relevant to the assistant will be reviewed, including the broad authenticated profile-read policy. Any user-facing profile directory requirement will use a least-privilege view rather than exposing full profiles. Assistant RPCs will default to invoker rights; any definer function will set a fixed search path, verify `auth.uid()` and active role internally, minimize returned columns, and receive explicit grants only.

Security tests will execute as real Admin, Manager, and multiple Technician identities, not with service-role credentials. Negative tests include cross-technician order ids, guessed document ids, direct REST access, prompt injection, conversation carry-over, and forged role fields.

## Risks / Trade-offs

- [Copied Agno code has hidden dependencies on the prior application] → Build a dependency/import inventory, retain only standalone core logic, and delete or quarantine incompatible adapters behind new contracts.
- [RLS and service-role usage can diverge] → Use caller-JWT clients for reads, isolate privileged clients, test the same query paths using multiple real identities, and prohibit privileged clients in agent tool constructors.
- [Document embeddings can reveal restricted material] → Apply authorization inside the retrieval query before ranking and never share cross-policy caches.
- [A model may hallucinate despite citations] → Require structured evidence for factual tools, display citations, state uncertainty, and test unsupported-answer behavior.
- [Streaming requests consume resources longer] → Add per-user rate/concurrency limits, deadlines, cancellation propagation, bounded tool outputs, and stateless replicas.
- [Operational data and documents change during a conversation] → Reauthorize and retrieve on every tool invocation; do not rely on earlier model context as current evidence.
- [The data matrix may evolve] → Keep policies centralized and versioned, make tool contracts role-neutral where possible, and cover each matrix cell with tests.
- [Document ingestion increases attack surface] → Restrict ingestion roles, validate formats/sizes, quarantine until extraction completes, sanitize extracted text, and keep originals private.

## Migration Plan

1. Inventory copied Agno modules and establish a clean Python package, dependency manifest, test runner, configuration model, and health endpoints without production traffic.
2. Add identity verification, `ActorContext`, policy matrix, repository interfaces, and denial tests.
3. Apply Supabase migrations for least-privilege operational reads, documents/chunks, conversation state, and assistant audits; verify RLS with all demo identities.
4. Implement bounded operational and analytics tools, then adapt reusable routing/reporting code to those tools.
5. Implement private document ingestion and authorized hybrid retrieval with structured citations.
6. Add the chat orchestration, provider adapter, streaming API, limits, sanitized audit pipeline, and security regression suite.
7. Integrate the Next.js BFF and Ops Assistant UI behind a disabled-by-default production feature flag while preserving demo mode.
8. Deploy Agno privately, run role and leakage smoke tests, then enable it for internal users in stages.

Rollback disables the production assistant feature flag and restores the deterministic assistant UI. The standalone service can be scaled to zero. Additive database tables and policies remain dormant; corrective migrations, rather than destructive rollback, are used after production data exists.

## Open Questions

- The exact production model and embedding provider can be selected during deployment as long as the adapters satisfy the structured-output, privacy, timeout, and observability contracts.
- Final document size limits, supported office formats, and retention durations can be configured after expected document volume and organizational retention policy are confirmed.
