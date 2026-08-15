## 1. Profile Contracts and Configuration

- [x] 1.1 Define typed contracts for structural relations, columns, PostgreSQL types, enums, keys, join edges, cardinality, visibility, timestamps, and profile versions.
- [x] 1.2 Define typed contracts for business concepts, synonyms, lifecycle mappings, calculation rules, preferred timestamps, role notes, and ambiguity guidance.
- [x] 1.3 Add configuration for profile enablement, committed snapshot path, prompt-size budget, drift behavior, and optional development verification.
- [x] 1.4 Add contract and configuration tests for invalid, incomplete, oversized, or protected profile content.

## 2. Structural Profile Generation

- [x] 2.1 Implement deterministic extraction of approved analytical view columns and source expressions from the canonical Supabase migrations.
- [x] 2.2 Extract approved PostgreSQL type and enum definitions, including exact order status, payment method, review outcome, and related values.
- [x] 2.3 Resolve approved keys and join edges for orders, completions, payments, schedule events, reviews, checklist items, profiles, and branches.
- [x] 2.4 Emit a stable, sorted, versioned structural snapshot containing only query-visible relations and columns.
- [x] 2.5 Add generator fixtures and tests for supported migration patterns, unsupported definitions, deterministic output, and protected-schema exclusion.

## 3. Business Semantic Overlay

- [x] 3.1 Add reviewed relation and column meanings for every field currently exposed to analytical SQL.
- [x] 3.2 Define lifecycle concepts and synonyms for open tasks, active work, completed work, reviewed work, closed tickets, and correction-required jobs.
- [x] 3.3 Define financial concepts for quotation, final service value, customer payments, outstanding balance, and technician earnings eligibility.
- [x] 3.4 Define scheduling, postponement, checklist, review, ownership, branch, and preferred-timestamp semantics.
- [x] 3.5 Add representative query guidance for Admin, Manager, and Technician questions without embedding user identities or authorization predicates.
- [x] 3.6 Validate every semantic concept against the structural snapshot and fail on missing relations, columns, enum values, or incompatible calculations.

## 4. Merged Profile and Planner Context

- [x] 4.1 Implement immutable merging and hashing of the structural snapshot and reviewed semantic overlay.
- [x] 4.2 Implement role-aware profile projection that removes protected technician identity fields and cross-technician concepts.
- [x] 4.3 Implement deterministic relevance selection with atomic profile sections and a hard prompt-size budget.
- [x] 4.4 Replace the static catalog prompt serializer with the merged profile behind a rollback feature flag.
- [x] 4.5 Add prompt snapshot tests proving exact enums, joins, business mappings, profile version, and absence of protected schema or credentials.

## 5. Semantic SQL Preflight

- [x] 5.1 Resolve SQL relation aliases and enum-backed columns against the merged profile after existing AST safety validation.
- [x] 5.2 Reject unknown enum literals with a sanitized `enum_literal_unknown` result before database execution.
- [x] 5.3 Validate join predicates against approved profiled edges and reject undeclared or incompatible joins with `join_not_profiled`.
- [x] 5.4 Validate profiled financial and timestamp usage where a selected business concept requires a canonical field or calculation.
- [x] 5.5 Integrate at most one sanitized semantic-repair attempt without exposing raw SQL, literals, database messages, or results.
- [x] 5.6 Add positive and adversarial tests for enums, aliases, joins, aggregates, CTEs, casts, CASE expressions, and cross-technician attempts.

## 6. Drift Detection and Diagnostics

- [x] 6.1 Add a command that regenerates the structural snapshot and produces a reviewable diff without overwriting reviewed semantics.
- [x] 6.2 Add CI validation that fails when migrations, the structural snapshot, and semantic overlay drift.
- [x] 6.3 Add optional development-database verification using administrative credentials without making runtime chat depend on introspection.
- [x] 6.4 Extend query evidence and audit metadata with profile version, validation stage, and sanitized error code only.
- [x] 6.5 Add tests proving SQL, literals, prompts, database messages, credentials, and result rows remain absent from logs and audits.

## 7. Integration, Verification, and Documentation

- [x] 7.1 Replay open-task, completed-work, earnings, outstanding-payment, postponement, correction, and multi-table analytics questions for every role.
- [x] 7.2 Verify successful empty results, enum repair, database failure, timeout, scope denial, and profile drift produce distinct responses and audit categories.
- [x] 7.3 Run Python formatting, linting, typing, unit/security tests, Supabase SQL tests, frontend assistant tests, and production build verification.
- [x] 7.4 Document profile structure, business-concept review rules, regeneration workflow, CI drift resolution, relation onboarding, diagnostics, and rollback.
- [x] 7.5 Enable the semantic profile locally, verify role-isolation smoke tests, and leave production activation behind the configured rollback flag.
