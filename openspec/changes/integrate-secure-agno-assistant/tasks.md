## 1. Agno Service Foundation

- [x] 1.1 Inventory every copied Agno module, missing `app.*` dependency, external package, and project-specific concept; record which modules will be retained, adapted, or removed.
- [x] 1.2 Restructure `backend/agno` into an importable Sejuk Ops application package without changing reusable analytics behavior prematurely.
- [x] 1.3 Add `pyproject.toml`, locked dependency workflow, environment schema, test configuration, development commands, and `.env.example` with no real credentials.
- [x] 1.4 Add a production container definition, non-root runtime, ignore rules, and documented local startup procedure.
- [x] 1.5 Implement FastAPI application startup plus sanitized `/health/live` and dependency-aware `/health/ready` endpoints.
- [x] 1.6 Add unit tests for configuration validation, startup failure, liveness, readiness, and absence of secrets in health responses.

## 2. Authentication and Authorization Core

- [x] 2.1 Implement Supabase JWT validation for issuer, audience, signature, expiry, and subject and reject invalid requests before model or tool execution.
- [x] 2.2 Implement immutable `ActorContext` resolution from the authenticated active profile, ignoring client-supplied role, branch, and user claims.
- [x] 2.3 Define the centralized Admin, Manager, and Technician capability matrix for orders, payments, performance, reviews, audits, communications, and documents.
- [x] 2.4 Implement policy decisions and permission-safe denial objects that do not disclose protected resource existence.
- [x] 2.5 Build role-specific tool registries from policy decisions and ensure privileged or write tools cannot be registered in the first release.
- [x] 2.6 Add authentication and policy tests for missing/expired tokens, inactive profiles, forged identities, every role-matrix cell, and indirect cross-technician requests.

## 3. Supabase Security and Assistant Data Model

- [x] 3.1 Audit existing profile, order, payment, review, audit, notification, and communication RLS policies against assistant requirements and document identified privilege gaps.
- [x] 3.2 Add a migration that replaces overly broad profile visibility with least-privilege access while preserving the UI's required staff-directory fields through a safe view or function.
- [x] 3.3 Add assistant conversation and message tables with ownership/access policies and configurable retention metadata.
- [x] 3.4 Add assistant audit-event tables with sanitized fields, correlation indexes, explicit operator visibility, and no Technician access to other users' activity.
- [x] 3.5 Add document metadata, version, chunk, visibility, ingestion-status, and vector structures plus a private source-document Storage bucket.
- [x] 3.6 Add pre-ranking authorized document retrieval functions and narrowly scoped operational analytics views/functions using caller identity and bounded parameters.
- [x] 3.7 Revoke public/default execution where appropriate and explicitly grant only the database capabilities required by authenticated roles and ingestion infrastructure.
- [x] 3.8 Add SQL security tests using Admin, Manager, and at least two Technician identities for direct REST/RPC access, guessed identifiers, cross-technician isolation, document visibility, and audit visibility.

## 4. Sejuk Operational and Analytics Tools

- [x] 4.1 Define typed repository contracts and structured evidence/citation schemas for operational records, aggregates, communications, and documents.
- [x] 4.2 Implement caller-JWT Supabase repository creation and isolate any service-role client so it cannot be injected into normal agent retrieval tools.
- [x] 4.3 Implement bounded order lookup and queue-summary tools with role-scoped filtering, date validation, pagination, and minimal returned fields.
- [x] 4.4 Implement payment, outstanding-balance, postponement, review, and audit-context tools with the same mandatory authorization scope.
- [x] 4.5 Implement technician performance tools that expose organization comparisons to Admin/Manager and bind Technician queries to the caller's own identity.
- [x] 4.6 Implement accessible-conversation search that reuses conversation membership rules and returns bounded, minimal excerpts.
- [x] 4.7 Adapt reusable aggregation, reporting, routing, and visualization modules to the typed Sejuk tools and remove project/dataset/artifact assumptions.
- [x] 4.8 Remove or quarantine arbitrary SQL execution and obsolete local project adapters so no general SQL tool can be exposed to an agent.
- [x] 4.9 Add tool contract tests for valid results, empty results, row/output bounds, time ranges, source metadata, authorization failures, and attempted identifier substitution.

## 5. Document Ingestion and Retrieval

- [x] 5.1 Implement an authenticated administrative ingestion API or worker interface with configured file types, size limits, checksums, lifecycle status, and private storage paths.
- [x] 5.2 Implement extraction and chunking adapters that preserve page/section location and treat extracted instructions as untrusted content.
- [x] 5.3 Implement embedding generation and idempotent indexing with failure/quarantine states that cannot appear in search results.
- [x] 5.4 Implement hybrid semantic/keyword retrieval that applies role, branch, user, lifecycle, and document visibility filters inside the database query before ranking.
- [x] 5.5 Implement structured document citations and short-lived authorized source access without exposing storage paths or privileged signed URLs through model text.
- [x] 5.6 Implement visibility-change, archive, reindex, and retention handling so subsequent retrieval never relies on stale authorization.
- [x] 5.7 Add ingestion and retrieval tests for supported/unsupported files, failures, duplicate versions, archived content, prompt injection inside documents, and Manager-only content excluded from Technician search.

## 6. Agno Chat Orchestration

- [x] 6.1 Define versioned chat request, stream event, citation, completion, refusal, and error schemas with message and output limits.
- [x] 6.2 Adapt the Agno coordinator to accept `ActorContext`, expose only the policy-built tools, reauthorize every tool call, and keep all first-release actions read-only.
- [x] 6.3 Implement evidence-grounded response rules that require citations for material facts and explicitly report insufficient authorized evidence.
- [x] 6.4 Implement conversation persistence and bounded history loading under caller-scoped RLS without allowing prior messages to expand authorization.
- [x] 6.5 Implement the streaming `/v1/chat` API with disconnect cancellation, provider/tool deadlines, structured completion metadata, and safe retry errors.
- [x] 6.6 Implement per-user rate and concurrency limits plus bounded tool calls and model context.
- [x] 6.7 Add adversarial tests for prompt injection, forged roles, cross-turn scope escalation, hidden document instructions, arbitrary SQL requests, mutation requests, and protected resource enumeration.

## 7. Auditability and Operations

- [x] 7.1 Generate or propagate a correlation identifier across Next.js, Agno, repositories, model calls, citations, and audit events.
- [x] 7.2 Implement sanitized assistant audit writing for actor, role, tools, policy decisions, source ids, latency, status, usage, and safe errors.
- [x] 7.3 Add structured runtime logging with a redaction filter for tokens, credentials, prompts, source excerpts, query results, and provider payloads.
- [x] 7.4 Implement configurable conversation/audit retention cleanup and tests for deletion or anonymization at the retention boundary.
- [x] 7.5 Add metrics for request volume, latency, denial, timeout, dependency failure, tool usage, and provider usage without high-cardinality sensitive labels.
- [x] 7.6 Add operational tests proving errors and traces contain no secrets or protected content while authorized correlation-based investigation remains possible.

## 8. Frontend and BFF Integration

- [x] 8.1 Replace the production assistant BFF behavior with session verification, user-token forwarding, correlation propagation, streaming relay, timeout, and sanitized error mapping.
- [x] 8.2 Update environment validation and examples for the private Agno URL, service authentication where required, feature flag, and timeouts without exposing secrets to the browser.
- [x] 8.3 Update the Ops Assistant page for streamed messages, citations, source freshness, refusals, retry, loading/cancellation, and accessible error states.
- [x] 8.4 Preserve and visibly label deterministic demo mode when production Agno is disabled or unconfigured.
- [x] 8.5 Ensure role navigation and page access make the assistant available to Admin, Manager, and Technician users while backend authorization remains authoritative.
- [x] 8.6 Add frontend/BFF tests for successful streams, citations, retryable failures, expired sessions, cancellation, role-safe refusals, and demo fallback.

## 9. End-to-End Security and Deployment

- [x] 9.1 Add end-to-end scenarios for Admin organization queries, Manager analytics, Technician self-service questions, and Technician denial for another Technician's data.
- [x] 9.2 Add leakage regression scenarios covering direct order/document ids, comparisons, counts, conversation follow-ups, prompt injection, source links, and direct API access.
- [x] 9.3 Run Python formatting, linting, typing, unit, integration, and security tests plus existing frontend lint, TypeScript, unit, end-to-end, and production build checks.
- [x] 9.4 Document local multi-service startup, Supabase reset/migration flow, environment variables, document ingestion, retention, troubleshooting, and security boundaries.
- [x] 9.5 Add CI jobs for the Python service and database security tests, including dependency caching and secret-free test configuration.
- [x] 9.6 Deploy Agno behind the disabled-by-default production feature flag, verify liveness/readiness and role smoke tests, then enable staged internal access.
- [x] 9.7 Verify rollback by disabling the feature flag and returning to deterministic assistant behavior without affecting operational workflows or stored data.
