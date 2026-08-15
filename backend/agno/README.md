# Sejuk Assistant service

This is the standalone, read-only Agno service for Sejuk Sejuk Service Sdn Bhd. Copied code from the prior analytics product is quarantined under `legacy/` and is not installed or imported by the service.

## Local development

```powershell
cd backend/agno
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn sejuk_assistant.main:app --reload --port 8000
```

The service exposes `GET /health/live` and `GET /health/ready`. Readiness stays unavailable until required Supabase and model configuration is present; health responses never echo configuration values.

## Analytical SQL query skill

Set `SEJUK_QUERY_SKILL_ENABLED=true` locally after applying all Supabase migrations.
The skill lets Gemini generate one PostgreSQL `SELECT` query for operational
analytics, including joins, aggregates, grouping, windows, filters, and
non-recursive CTEs.

Generated SQL is hostile input. Before execution, the service parses it with
`sqlglot` and permits only the relations, columns, and deterministic functions in
`sejuk_assistant.query.catalog`. It rejects writes, DDL, multiple statements,
locking clauses, system catalogs, unapproved functions, `SELECT *`, excessive
joins/nesting, large limits, and date ranges over 366 days.

Execution uses the logged-in user's Supabase JWT through the
`execute_assistant_analytical_query` RPC. It never uses a service-role key. The
six `assistant_analytics_*` security-invoker views preserve underlying RLS, so a
Technician remains limited to assigned orders and related records even when SQL
omits an ownership predicate. The RPC adds a statement timeout and row cap.

To add a relation:

1. Create a minimal `security_barrier`, `security_invoker` view.
2. Prove every underlying relation enforces caller RLS for rows, joins, counts,
   aggregates, and direct identifiers using two Technician identities.
3. Grant only `SELECT` to `authenticated` and no access to `anon` or `PUBLIC`.
4. Add only required columns and business meaning to `query/catalog.py`.
5. Add validator, SQL security, and end-to-end tests before rollout.

Useful controls are `SEJUK_QUERY_STATEMENT_TIMEOUT_MS`, `SEJUK_QUERY_MAX_ROWS`,
`SEJUK_QUERY_MAX_BYTES`, `SEJUK_QUERY_MAX_JOINS`, `SEJUK_QUERY_MAX_NESTING`, and
`SEJUK_QUERY_MAX_DATE_RANGE_DAYS`. Audit records retain a query fingerprint,
relations, outcome, duration, row count, and truncation—not SQL literals or rows.

Rollback by setting `SEJUK_QUERY_SKILL_ENABLED=false` and restarting Agno. To
disable the database endpoint as well, revoke execute on
`public.execute_assistant_analytical_query(text, integer, integer)` from
`authenticated` in a corrective migration.

## Query semantic profile

The query planner uses a two-layer, versioned semantic profile instead of
guessing database meaning from column names:

- `query/structural_profile.json` is the committed structural snapshot for the
  six curated analytical views. It records data types, nullability, exact enum
  values, keys, approved joins, cardinality, and timestamp semantics.
- `query/profile.py` contains the reviewed business overlay. It defines terms
  such as open task, completed work, service value, customer payment,
  outstanding balance, technician earnings, postponement, checklist progress,
  and correction required.

`Open` is not a stored order status. The `open_task` concept maps it to `New`,
`Assigned`, and `In Progress`. Completed work uses service completion rows;
technician earnings use final service value only after an order is `Closed`.

Validate the committed profile against Supabase migrations before committing:

```powershell
cd backend/agno
python -m sejuk_assistant.query.profile_generator --migrations ../supabase/migrations
```

Use `--print-actual` to produce a reviewable structural diff source. The command
never changes the reviewed semantic overlay. CI runs the same drift check. An
optional development database reachability check is available with
`--verify-database` when `SEJUK_SUPABASE_SERVICE_ROLE_KEY` is intentionally
configured; runtime chat never introspects the database catalog.

When adding or changing a query-visible relation:

1. Apply the migration and preserve caller-bound RLS/security-invoker behavior.
2. Update the structural snapshot with types, nullability, keys, joins, and
   timestamp meaning.
3. Run the profile command and review its enum/view-column output.
4. Update every affected business concept and regression test.
5. Verify Technician projection excludes identity fields and cross-technician
   concepts.

Semantic preflight rejects invented enum literals and unprofiled joins before
the query reaches Supabase. Audits retain only the profile version, validation
stage, sanitized code, referenced relations, counts, and timings. Raw SQL,
literals, database messages, credentials, and result rows remain excluded.

Set `SEJUK_SEMANTIC_PROFILE_ENABLED=false` to roll back to the legacy static
catalog serializer. Keep `SEJUK_QUERY_SKILL_ENABLED=false` as the full query-skill
kill switch.

## Container

```powershell
docker build -t sejuk-assistant backend/agno
docker run --rm -p 8000:8000 --env-file backend/agno/.env sejuk-assistant
```
