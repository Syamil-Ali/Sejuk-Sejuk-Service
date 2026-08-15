## Context

See `proposal.md` for motivation and `specs/query-semantic-profile/spec.md` for the behavioral contract. The existing query catalog is a Python tuple of relation and column names plus short prose. It is manually maintained, contains few types or domain rules, and cannot validate enum literals or join semantics. Supabase migrations are the repository's authoritative schema source, while RLS and caller-bound RPC execution remain the authorization boundary.

## Goals / Non-Goals

**Goals:**

- Produce deterministic, reviewable metadata for all query-visible analytical views.
- Separate machine-derived schema facts from human-reviewed business definitions.
- Give the planner enough precise context to generate valid SQL without exposing the full database catalog.
- Catch invented enum values and invalid joins before database execution.
- Detect migration/profile drift in local validation and CI.
- Preserve the existing read-only validator, caller JWT, RLS, limits, and audit privacy.

**Non-Goals:**

- Live production schema discovery during a user chat request.
- Giving the model unrestricted access to `information_schema`, `pg_catalog`, migrations, or arbitrary tables.
- Treating semantic metadata as an authorization control or replacing RLS.
- Automatically inferring business meanings solely from names or database comments.
- Supporting write SQL, schema modification, or autonomous migration generation.

## Decisions

### 1. Use a two-layer profile

Store a generated structural snapshot containing relations, columns, PostgreSQL types, nullability, enum definitions, and approved join edges. Store a separate reviewed semantic overlay containing purpose, synonyms, lifecycle concepts, financial formulas, preferred timestamps, ownership meanings, and query examples. Merge them into an immutable versioned profile at build/startup validation.

This avoids hand-copying structural facts while acknowledging that a database cannot infer that "open" means three lifecycle states. A single generated profile was rejected because it cannot express product semantics; a single hand-written profile was rejected because it drifts silently.

### 2. Generate from repository migrations in CI and optionally verify against development Supabase

The default generator reads the canonical Supabase migration set and emits deterministic JSON or Python data committed to the repository. A development verification mode may compare the snapshot to a configured Supabase schema using administrative credentials, but runtime chat never introspects the database.

Migration-based generation keeps CI reproducible and avoids requiring production credentials. Live-only introspection was rejected because it makes builds environment-dependent and would tempt runtime catalog access.

### 3. Profile only curated analytical relations

The generator starts from the existing approved relation allowlist, follows only the view definitions and explicitly approved underlying enum/type metadata, and emits only columns available to the query skill. Join edges must be declared and verified against compatible keys; they are not inferred broadly from every foreign key in the database.

This prevents accidental expansion to auth, conversations, documents, storage, or audit relations. The query tool registry and role filtering remain independent controls.

### 4. Represent business concepts as typed mappings

The semantic overlay uses validated structures rather than free-form prose alone. Concepts include canonical name, synonyms, relation/column targets, allowed enum mappings, default time field, calculation rule, role notes, and ambiguity guidance. Examples include `open_task`, `completed_work`, `closed_ticket`, `service_value`, `customer_payment`, `outstanding_balance`, `technician_earnings`, `postponement`, and `correction_required`.

Free-form prompt instructions alone were rejected because they cannot drive deterministic preflight checks or drift tests.

### 5. Add semantic preflight after AST validation

After PostgreSQL parsing and the existing structural safety checks, resolve relation aliases and inspect comparisons on profiled enum columns, join predicates, selected financial fields, and time filters. Unknown enum literals and undeclared joins receive sanitized codes such as `enum_literal_unknown` and `join_not_profiled`. At most one repair prompt receives the category and relevant safe profile identifier, never raw SQL or database output.

Semantic validation supplements rather than replaces PostgreSQL execution. Full SQL type checking is out of scope; bounded database semantic failures may retain the existing one-repair behavior.

### 6. Build a relevance-selected planner profile

Construct a compact prompt from global constraints, the most relevant business concepts, and the relations connected to those concepts. Always include enum definitions and approved joins for any included relation. Selection is deterministic after model tool selection and respects a configured byte/token budget; it never string-truncates the profile mid-definition.

Sending the complete profile for every question was rejected because it increases latency and reduces model attention as the schema grows.

### 7. Version and audit the profile without recording queries

Hash the merged profile and expose a short schema version in query evidence and sanitized audit metadata. Record validation stage and code, referenced relations, profile version, row count, and duration. Continue excluding SQL text, literals, prompts, database messages, and result contents.

## Risks / Trade-offs

- [Migration SQL is difficult to parse completely] → Limit extraction to reviewed analytical views/types, fail closed on unsupported definitions, and cover each migration pattern with fixtures.
- [Business overlay becomes stale] → Require concept-to-schema validation, committed profile diffs, and CI failure when referenced values or columns disappear.
- [Profile prompt becomes too large] → Use typed relevance selection with atomic sections and a hard budget.
- [Semantic validator rejects valid advanced SQL] → Start with enum and join validation, use specific codes, and extend deliberately with regression tests.
- [Profile is mistaken for authorization] → Keep registry checks, caller JWT, grants, RLS, and RPC validation unchanged and test cross-technician isolation independently.
- [Generated snapshot exposes internal schema] → Generate only from the curated allowlist and add tests proving protected relations and columns are absent.

## Migration Plan

1. Define profile contracts and the reviewed semantic overlay for all currently exposed analytical relations.
2. Implement deterministic migration-based structural extraction and commit the initial snapshot.
3. Add drift, absence-of-protected-schema, enum, join, and concept validation tests.
4. Replace the current prompt catalog serializer with bounded merged-profile serialization behind a feature flag.
5. Add semantic AST preflight and sanitized audit metadata, then run existing adversarial and role-isolation suites.
6. Enable locally and replay representative Admin, Manager, and Technician questions, including the previously failing open/completed-task cases.
7. Enable by default after parity verification; rollback restores the previous static catalog serializer while retaining the generated profile files for diagnosis.
