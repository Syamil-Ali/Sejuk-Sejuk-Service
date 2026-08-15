## Why

The analytical query agent currently knows approved relation and column names but lacks a complete, verified description of their data types, enum values, relationships, and business meanings. This allows structurally safe SQL to fail or answer the wrong question when the model invents values such as `Open` for an enum that stores `New`, `Assigned`, and `In Progress`.

## What Changes

- Add a versioned semantic database profile for every relation exposed to the query skill, including data types, nullability, enum values, keys, cardinality, join paths, timestamps, role visibility, and business definitions.
- Generate and validate structural profile facts from the Supabase migrations/database schema instead of maintaining an unverified hand-written list.
- Keep business concepts, synonyms, lifecycle meanings, financial definitions, and preferred query patterns in a reviewed semantic overlay.
- Merge the structural profile and semantic overlay into a bounded planner prompt and reject startup or CI validation when they drift.
- Teach the query planner exact order lifecycle, payment, completion, checklist, scheduling, review, and technician-ownership semantics.
- Add deterministic checks for unknown enum literals, invalid joins, ambiguous business terms, and stale profile data before SQL reaches Supabase.
- Add diagnostics that distinguish profile validation, SQL validation, database execution, authorization, and empty-result outcomes without logging SQL or protected data.

## Capabilities

### New Capabilities

- `query-semantic-profile`: Verified structural and business metadata used to ground analytical SQL planning and validation.

### Modified Capabilities

None.

## Impact

- Changes the Agno query catalog, planner prompt construction, SQL validator, startup checks, audit metadata, and tests under `backend/agno`.
- Adds a schema-profile generation or verification utility based on Supabase migrations and optionally a caller-safe database introspection artifact used during development/CI, never at user query time.
- Adds a reviewed semantic overlay describing domain concepts and mappings without expanding the query skill's relation or role permissions.
- Adds CI/documentation steps for refreshing and reviewing the profile when migrations change exposed analytical views, enums, or relationships.
