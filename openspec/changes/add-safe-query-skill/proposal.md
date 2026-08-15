## Why

The assistant's fixed operational tools cannot answer many legitimate multi-table analytics questions, such as correlating completed work, payments, assignments, and postponements. A controlled SQL query skill is needed so the model can construct flexible analytical reads without gaining write access or bypassing the authenticated user's data scope.

## What Changes

- Add an Agno query skill that generates a single PostgreSQL `SELECT` query for supported operational analytics.
- Validate generated SQL structurally before execution and reject mutations, multiple statements, data-definition commands, transaction commands, unsafe functions, system catalogs, and non-allowlisted relations.
- Execute accepted SQL as the authenticated Supabase caller under RLS, a read-only transaction, a short statement timeout, and bounded result limits; never use the service-role client.
- Allow reviewed joins and aggregates across approved operational tables and views while injecting or verifying mandatory role scope independently of model output.
- Return structured columns, bounded rows, source metadata, and query audit information so Gemini can summarize results with appropriate uncertainty.
- Replace single-tool keyword-style analytics limitations with model-directed use of the query skill while retaining purpose-built tools where they provide stronger semantics.
- Add adversarial and role-isolation tests for mutation attempts, SQL obfuscation, unsafe joins/functions, oversized queries, and cross-technician inference.

## Capabilities

### New Capabilities

- `safe-analytical-sql`: Model-generated, structurally validated, read-only analytical SQL over approved Supabase data with caller-bound authorization, resource limits, evidence, and auditing.

### Modified Capabilities

None.

## Impact

- Changes the Agno planner, tool registry, orchestration, evidence generation, and audit metadata under `backend/agno`.
- Adds a SQL parser dependency and a narrowly scoped Supabase RPC/database function or equivalent caller-context execution boundary.
- Adds Supabase migrations for approved analytical execution and explicit grants without exposing service-role credentials.
- Extends Python, SQL security, and end-to-end tests for flexible multi-table analytics.
