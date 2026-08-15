# Assistant authorization audit

Reviewed migrations: `202608110001_initial_operations.sql` and `202608120001_organization_communications.sql`.

## Existing strengths

- Orders and their checklist, completion, evidence, payment, and schedule children use `can_access_order`, limiting Technicians to assigned work.
- Conversations and messages use membership checks.
- Order lifecycle writes are constrained by role-aware functions and optimistic versions.
- Job evidence and message attachments use private buckets.

## Gaps addressed by the assistant migration

| Area | Existing risk | Resolution |
| --- | --- | --- |
| Profiles | Every authenticated user could select complete profiles, including another Technician's phone and branch data. | Replace broad table select with self/Admin/Manager policy and provide a minimal active staff-directory RPC. |
| Assistant logs | Existing table is Manager-specific and insufficient for correlation/tool/source auditing. | Add sanitized role-aware assistant audit events. |
| Assistant conversations | No durable, user-owned assistant history. | Add caller-owned threads and messages with RLS. |
| Documents | No lifecycle, visibility, private source bucket, chunk authorization, or pre-ranking filter. | Add documents, versions, chunks, centralized access function, RLS, and authorized hybrid retrieval. |
| Analytics | Manager dashboard functions do not cover Admin or Technician self-service and some definer functions depend only on role. | Add bounded assistant functions that derive Technician identity from `auth.uid()` and reject excessive ranges. |
| Function grants | PostgreSQL functions can inherit default PUBLIC execution. | Revoke PUBLIC and grant only explicit authenticated functions. |

## Mandatory runtime rules

- Normal Agno retrieval uses the caller's Supabase JWT, never the service-role key.
- The service-role client is isolated to ingestion/audit infrastructure and is not constructible by agent tools.
- Authorization is applied before records or chunks reach the model.
- Security tests use separate Admin, Manager, and Technician claims and include guessed identifiers.

