## 1. Query Contract and Configuration

- [x] 1.1 Add and lock a PostgreSQL-aware SQL parser dependency and query-skill feature flag, timeout, row, byte, join, nesting, and date-range settings.
- [x] 1.2 Define the structured model SQL plan, validation result, execution result, and analytical evidence contracts.
- [x] 1.3 Build a versioned semantic schema catalog for approved relations, columns, joins, business meanings, timestamp semantics, and deterministic functions.
- [x] 1.4 Add configuration and contract tests for secure defaults, invalid limits, schema serialization, and absence of credentials or protected schema objects.

## 2. Structural SQL Validation

- [x] 2.1 Implement single-statement PostgreSQL parsing and canonical query fingerprinting.
- [x] 2.2 Implement a positive AST allowlist for `SELECT`, approved CTEs, joins, aggregates, filters, grouping, ordering, windows, and deterministic functions.
- [x] 2.3 Reject writes, DDL, transaction/session commands, data-changing CTEs, locking clauses, recursive CTEs, table functions, system catalogs, unsafe functions, multiple statements, and unresolved relations or columns.
- [x] 2.4 Enforce selected-column, relation, join, CTE, nesting, expression, date-range, and result-limit complexity bounds.
- [x] 2.5 Add validator tests covering valid multi-table analytics plus obfuscated mutations, comments, quoting, nested writes, unsafe functions, catalog access, and resource-exhaustion patterns.

## 3. Supabase Analytical Security Boundary

- [x] 3.1 Audit RLS and grants for orders, completions, payments, schedule events, reviews, checklist records, profiles, and branches under joined and aggregate reads.
- [x] 3.2 Add minimal security-barrier analytical views where base relations do not provide safe, comprehensible ownership-preserving joins.
- [x] 3.3 Add a caller-bound `SECURITY INVOKER` analytical execution RPC with fixed search path, independent read-only statement validation, statement/lock timeouts, and JSON result bounds.
- [x] 3.4 Revoke default/public access and grant only the required RPC and relation privileges to authenticated roles without granting assistant service-role access.
- [x] 3.5 Add SQL security tests using Admin, Manager, and two Technician JWTs for direct RPC abuse, omitted ownership predicates, cross-technician joins, aggregates, identifiers, counts, and existence inference.

## 4. Query Skill and Evidence

- [x] 4.1 Implement caller-JWT query execution through the validated RPC with sanitized database error mapping and no service-role fallback.
- [x] 4.2 Implement result row/byte enforcement, JSON normalization, truncation semantics, retrieval timestamps, relation metadata, and accessible record citations.
- [x] 4.3 Implement the Agno query planner using the semantic schema and structured SQL output, with at most one sanitized validation-repair attempt.
- [x] 4.4 Register `query_operational_data` by role and reauthorize the capability at invocation time before validation or execution.
- [x] 4.5 Update orchestration so factual operational analytics use the query skill without keyword routing while greetings and non-data conversation invoke no database tool.
- [x] 4.6 Update grounded answer generation to distinguish counts, empty authorized results, truncation, ambiguity, denial, validation failure, and timeout.

## 5. Auditability and Limits

- [x] 5.1 Extend assistant audit writing with query fingerprint, referenced relations, validation code, duration, row count, and truncation without storing literals, SQL, or result contents by default.
- [x] 5.2 Add metrics for query validation denial, execution denial, timeout, truncation, repair, relation usage, and latency using low-cardinality labels.
- [x] 5.3 Add tests proving prompts, SQL literals, result rows, database errors, access tokens, and credentials do not leak through logs, audits, metrics, or client errors.

## 6. Integration and Verification

- [x] 6.1 Add unit and integration scenarios for today's technician jobs, payment/outstanding analysis, date ranges, grouped performance, and multi-table Manager analytics.
- [x] 6.2 Add adversarial end-to-end scenarios for mutation requests, generated unsafe SQL, forged roles, direct identifiers, cross-turn escalation, another technician's analytics, and direct RPC calls.
- [x] 6.3 Run Python formatting, linting, typing, unit/security tests, Supabase SQL tests, frontend tests, and production build verification.
- [x] 6.4 Document the semantic schema, supported SQL subset, relation-onboarding checklist, feature flag, limits, monitoring, troubleshooting, and rollback procedure.
- [x] 6.5 Enable the query skill locally, verify role-specific smoke tests and rollback, and leave staged production activation behind the disabled-by-default feature flag.
