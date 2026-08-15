# Assistant analytical query security

The query skill exposes only the six `assistant_analytics_*` projections created
by migration `202608130004_safe_analytical_sql.sql`.

Each projection is both `security_barrier` and `security_invoker`, so the caller's
existing grants and RLS policies apply to underlying tables. Operational RLS is:

- `orders`: Admin/Manager see organization rows; Technician sees only assigned rows.
- `service_completions`, `payments`, `schedule_events`, and checklist items: access
  is inherited through `can_access_order(order_id)`.
- `reviews`: Admin/Manager or callers who can access the related order.
- `profiles`: Technician sees only their own profile; Admin/Manager see profiles.
- `branches`: authenticated read, containing only branch name/state metadata.

The RPC is `SECURITY INVOKER` and is never called with the service-role key. Direct
RPC callers gain no table access they did not already possess. Application-side
AST validation narrows queries further to curated views, fields, functions, and
complexity bounds. The RPC independently rejects multiple statements, mutations,
unsafe functions, and unauthenticated access, and applies timeout and row bounds.

Any new analytical relation requires:

1. Minimal columns with no credentials, private document content, or unrestricted messages.
2. Caller-bound RLS verified on every underlying table.
3. Cross-technician row, join, aggregate, count, and existence tests.
4. Addition to the Python semantic catalog and AST relation/column allowlist.
