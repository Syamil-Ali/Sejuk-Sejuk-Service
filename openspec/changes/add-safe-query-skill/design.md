## Context

See `proposal.md` for motivation and `specs/safe-analytical-sql/spec.md` for the behavioral contract. The current Agno coordinator asks Gemini to select one purpose-built operation and then formats already-authorized evidence. That is secure but cannot express arbitrary combinations of approved operational relations. Supabase Auth and PostgreSQL RLS are already the authoritative identity and row-authorization layers, and normal assistant reads use the caller JWT rather than a service-role client.

Raw SQL materially increases capability and risk. A string check for `DELETE` is insufficient because PostgreSQL permits data-changing CTEs, multiple statements, callable functions, system catalogs, expensive recursive expressions, and less obvious write or exfiltration facilities. The design therefore treats model SQL as hostile input and requires independent controls in the Python service and database execution boundary.

## Goals / Non-Goals

**Goals:**

- Answer flexible multi-table counts, totals, trends, rankings, comparisons, and bounded detail questions.
- Permit genuine PostgreSQL `SELECT` syntax, joins, CTEs, aggregates, and approved scalar/aggregate functions.
- Guarantee that generated SQL cannot mutate state and cannot broaden the authenticated caller's RLS scope.
- Give the answering model a small structured result with enough schema and source context to explain it accurately.
- Make validation, execution, and denial paths testable and auditable.

**Non-Goals:**

- General database administration, arbitrary SQL console behavior, writes, stored-procedure invocation, or schema discovery by the model.
- Service-role execution or post-query redaction as an authorization mechanism.
- Unbounded exports, long-running business-intelligence workloads, or access to document chunks and private conversations through the SQL skill.
- Perfect support for every PostgreSQL expression in the first release; unsupported safe syntax can be added deliberately after review.

## Decisions

### 1. Use a dedicated query skill with separate planning and answering stages

The planner receives a compact, versioned semantic schema describing approved relations, columns, relationships, timestamp semantics, status values, and role-neutral business definitions. It returns SQL plus a short expected-result description. It receives no credentials and does not execute SQL.

The query skill parses, validates, executes, and packages evidence. The existing answer generator receives only the question and authorized result. At most one validation-repair retry is permitted, using sanitized parser feedback; database errors and data are not sent back as unrestricted planning context.

Alternative: expose the database as a native model tool. Rejected because it would mix planning, credentials, execution, and error-driven exploration inside the model loop.

### 2. Parse SQL into an AST and enforce a positive allowlist

Use a pinned PostgreSQL-aware parser such as `sqlglot`. Accept exactly one query root and recursively inspect all nodes. The validator permits `SELECT`, approved CTEs, joins, predicates, grouping, ordering, bounded windows, and a small allowlist of deterministic functions. It rejects every mutation/DDL/transaction node, command nodes, table functions, user-defined function calls, system schemas, unqualified relations that cannot be resolved safely, recursive CTEs initially, `SELECT ... FOR UPDATE`, and statement separators producing multiple roots.

Relation aliases and column references are resolved against the semantic schema. `SELECT *` is rejected except for an explicitly reviewed aggregate wrapper. The validator applies caps to joins, CTEs, nesting, expressions, selected columns, date span, and declared/derived row limits. A canonical SQL rendering and fingerprint are produced after validation.

Alternative: block dangerous keywords with regular expressions. Rejected because comments, quoting, nested CTEs, and alternate PostgreSQL syntax make denylist matching incomplete.

### 3. Keep authorization in caller-bound RLS and narrow grants

The query executes through a `SECURITY INVOKER` Supabase RPC using the same caller JWT that authenticated the chat. The RPC has a fixed safe `search_path`, accepts one validated query string plus an enforced maximum row count, and returns JSON. It is granted only to authenticated roles and never called through a service-role repository.

Approved relations must have RLS policies that remain correct under joins and aggregates. Technician policies bind orders and dependent rows to `auth.uid()` through direct ownership predicates or security-barrier analytical views. Profiles exposed to the skill use a minimal staff projection; secrets and unnecessary personal fields are absent. Before enabling a relation, tests must prove that two different technician JWTs cannot observe each other's rows, counts, join matches, or existence signals.

The RPC independently rejects non-`SELECT` input and establishes local statement/lock timeouts and read-only execution settings where PostgreSQL permits. The AST validator is the primary syntax boundary; database privileges, RLS, and transaction settings are independent containment layers.

Alternative: inject `assigned_technician_id = <caller>` into model SQL. Rejected as the sole mechanism because rewriting every nested query and join correctly is fragile. RLS remains mandatory; optional explicit predicates are optimization only.

### 4. Expose curated analytical relations instead of the entire schema

The initial allowlist covers operational projections needed for orders, service completions, payments, schedule events, reviews, checklist progress, and minimal technician identity/branch fields. Prefer security-barrier views with stable business names and pre-joined ownership keys where base-table policies are difficult to reason about.

The semantic schema is code-reviewed and versioned. The model cannot query `information_schema`, `pg_catalog`, auth tables, assistant conversations, audit payloads, document chunks, storage metadata, or arbitrary RPC functions. Adding a relation requires policy tests and schema-catalog updates.

Alternative: let the model inspect the live database catalog. Rejected because catalog discovery expands exposure and makes prompts and behavior unstable across migrations.

### 5. Bound execution and evidence

Every query receives a short statement timeout and lock timeout. The executor caps rows and serialized bytes, rejects excessive complexity before execution, and does not return partial data after timeout or authorization failure. Aggregate-only queries may return small result sets; detail queries must include or receive an outer limit. Dates are interpreted in `Asia/Kuala_Lumpur` and converted explicitly for timestamp comparisons.

Evidence contains column names, JSON-safe rows, truncation state, canonical query fingerprint, referenced relation names, execution time, row count, and retrieval timestamp. It does not include credentials, raw database errors, or unrestricted SQL in user-visible output. Citations point to accessible application records when stable identifiers are present; aggregate answers cite the authorized analytical retrieval event.

### 6. Make query-skill selection model-directed, not keyword-directed

The planner may select `query_operational_data` from the role-specific registry for factual analytics. Greetings select no tool. Purpose-built document and communication retrieval remains separate because their authorization and evidence semantics differ. The old fixed operational routing fallback is removed from production; deterministic behavior remains only for explicitly configured demo/test paths.

### 7. Audit sanitized query metadata

Audit events record the skill name, actor and role, correlation ID, canonical fingerprint, referenced relations, validation outcome/code, execution duration, row count, truncation, and model/provider timing. Raw access tokens, full results, customer values embedded as literals, and unrestricted SQL are excluded. A separately protected debug mode may retain canonical SQL only in local development, never by default in production.

## Risks / Trade-offs

- [A parser accepts PostgreSQL syntax with unexpected side effects] → Use a positive AST allowlist, prohibit callable/user-defined functions, pin and test the parser, and retain invoker grants plus RLS and database read-only controls.
- [RLS leaks information through joins or aggregates] → Require cross-technician SQL tests for each relation and prefer security-barrier projections containing explicit ownership keys.
- [Generated SQL is valid but semantically wrong] → Provide a reviewed semantic schema, return evidence metadata, require grounded summaries, and state uncertainty for ambiguous questions.
- [Queries become expensive] → Enforce complexity, date-range, row, byte, statement, and lock limits; expose reviewed aggregate views for recurring heavy analysis.
- [The database RPC becomes a general query endpoint] → Grant it only to authenticated callers, validate again at the database boundary, restrict relations through grants/RLS, rate-limit the assistant, and test direct RPC abuse.
- [Raw SQL appears in logs or chat] → Store only a fingerprint and sanitized structural metadata by default.
- [SQL repair loops probe protected schema] → Permit at most one repair using sanitized validation categories and never return database object existence details.

## Migration Plan

1. Add the parser dependency, semantic schema catalog, SQL plan model, validator, and unit tests without registering the skill.
2. Add security-barrier analytical projections or tighten base-table RLS/grants, then add the caller-bound execution RPC.
3. Run SQL security tests with Admin, Manager, and at least two Technician JWTs against direct RPC calls and adversarial queries.
4. Implement the query executor, evidence envelope, audit metadata, and model planner/answer integration behind a disabled feature flag.
5. Enable locally, run natural-language and multi-table end-to-end scenarios, then enable for Manager/Admin before Technician rollout.
6. After technician isolation tests pass, enable the skill for Technicians and monitor denials, timeouts, and query latency.

Rollback disables the query-skill feature flag and removes it from role registries. Existing purpose-built read tools remain available. Database functions and views stay inaccessible when their execute grants are revoked; corrective migrations are used instead of destructive rollback.
