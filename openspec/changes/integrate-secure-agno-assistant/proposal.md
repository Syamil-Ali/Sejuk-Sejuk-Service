## Why

Sejuk Ops currently has a deliberately narrow, manager-only assistant while an existing Agno analytics framework is available but coupled to another project's dataset and storage model. The organization needs a conversational assistant that can answer questions from operational data, analytics, and approved documents without allowing a user—especially a technician—to retrieve information outside their authorized scope.

## What Changes

- Adapt the existing Python Agno framework into a standalone Sejuk Ops assistant service with an authenticated chat API and health endpoint.
- Replace the copied project's dataset, project, artifact, and local-database adapters with Sejuk-specific, read-only tools for orders, payments, technician performance, communications, audit history, analytics, and documents.
- Authenticate every assistant request with a Supabase user token and derive identity, role, branch, and resource scope on the server rather than accepting authorization claims from the prompt or client.
- Enforce access at multiple layers: role-specific tool exposure, mandatory query scoping, Supabase RLS/authorized database functions, and document visibility metadata.
- Allow Admin and Manager users to query organization-wide authorized data while limiting Technicians to their own identity, assigned jobs, related payments and communications, and technician-visible documents.
- Add permission-safe refusal responses for requests outside the caller's scope, including indirect comparisons and prompt-injection attempts.
- Return source citations and freshness metadata with factual answers so users can inspect the operational records or documents used.
- Record assistant request metadata, invoked tools, authorization decisions, sources, timing, and failures without logging secrets or unrestricted document contents.
- Integrate the existing Ops Assistant page with the Agno streaming chat API while preserving a deterministic fallback for local demo mode.
- Keep the first release read-only; assigning work, changing status, recording payments, messaging, and other mutations remain outside the assistant.

## Capabilities

### New Capabilities

- `secure-assistant-chat`: Authenticated, role-aware conversational access to Sejuk operational questions through the Agno service, including streaming responses, refusal behavior, and local-demo fallback.
- `authorized-knowledge-retrieval`: Permission-scoped retrieval and analytics across Supabase operational records and indexed organization documents, with citations and protection against cross-user data leakage.
- `assistant-observability`: Privacy-conscious audit records, correlation identifiers, tool traces, failure handling, health checks, and operational limits for assistant requests.

### Modified Capabilities

None. The current repository has no synchronized main specifications; this change introduces its assistant contracts as new capabilities.

## Impact

- Adds a deployable Python service under `backend/agno` with Agno, an HTTP framework, Supabase/JWT integration, tests, environment configuration, and container support.
- Reworks copied Agno modules that currently import unavailable modules from the former analytics application.
- Adds Supabase migrations for document metadata/chunks, visibility policies, assistant audit events, and narrowly scoped read functions or views where needed.
- Replaces or extends `frontend/src/app/portal/assistant` and its server integration to call the Agno service with the authenticated user's token.
- Introduces document ingestion and retrieval boundaries; supported formats, visibility, retention, and indexing are server-controlled.
- Adds security tests covering role matrices, direct identifier manipulation, prompt injection, document leakage, service-role misuse, and technician-to-technician isolation.
- Requires deployment and secrets for the Python service, model provider, embedding provider or model, and Supabase connection while keeping privileged credentials out of the browser and model context.
