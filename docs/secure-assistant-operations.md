# Secure assistant operations

## Local startup

1. Start/reset Supabase: `cd backend/supabase` then `supabase start` and `supabase db reset`.
2. Copy `backend/agno/.env.example` to `.env`, use the local Supabase URL/anon key/JWT issuer, and optionally configure the model key.
3. Install and run Agno: `cd backend/agno`, `py -m pip install -r requirements-dev.txt`, `py -m pip install -e .`, then `py -m uvicorn sejuk_assistant.main:app --reload --port 8000`.
4. Copy `frontend/.env.example` to `.env.local`. Keep `AGNO_ASSISTANT_ENABLED=false` for deterministic demo mode; set it to `true` only while Agno is healthy.
5. Run the UI from the repository root with `npm run dev`.

Check `/health/live` for process liveness and `/health/ready` for sanitized dependency readiness. Health responses never include credentials.

## Security boundary

The Next.js BFF verifies the Supabase session and forwards only the user's access token. Agno validates the JWT, loads the active profile, ignores client role/branch claims, and builds a read-only tool registry for that actor. Every repository call executes with the caller JWT, so database RLS remains authoritative. Technicians are restricted to their own assigned work and performance. Arbitrary SQL, mutations, role changes, and protected-resource enumeration are refused.

Correlation IDs follow a request through the BFF, Agno events, citations, and sanitized audit records. Logs redact bearer tokens and credential-shaped fields. Prompts, source excerpts, and provider payloads must not be logged.

Transport and ingestion hardening:

- Every response carries security headers (CSP scoped to the Supabase origin, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production).
- The WhatsApp webhook verifies Meta's `X-Hub-Signature-256` HMAC over the raw body (constant-time comparison) and fails closed with `401`; set `WHATSAPP_APP_SECRET` in the frontend environment.
- DOCX uploads are capped at 25 MB at intake and checked for oversized or zip-bomb-expanding entries before python-docx parses them; PDFs are parsed with a patched `pypdf`.
- Runtime Python dependencies are pinned in `requirements.txt` and tracked with `pip-audit`; the venv should be re-created from the pinned files, never from an ad-hoc `pip install`.

## Documents

Administrative ingestion accepts PDF, DOCX, and text within the configured size limit. Files remain in the private `assistant-source-documents` bucket. Extraction treats document instructions as untrusted, preserves page/section locations, and indexes a checksum idempotently. Retrieval applies user, role, branch, visibility, lifecycle, and retention filters in PostgreSQL before ranking. Archive or visibility changes are effective immediately. Source access uses a short-lived authorized endpoint; model text never contains storage paths.

## Retention

Threads receive `retention_until` when created (default 90 days). Audits default to 365 days. Schedule `cleanup_expired_assistant_data()` using a trusted service-role job: expired threads cascade-delete messages, while expired audit detail is anonymized but correlation/status fields remain for operational investigation.

## Troubleshooting and rollback

- `401`: sign in again; the BFF does not refresh an invalid session inside a request.
- `429`: wait for the per-user window or an active request to finish.
- `502/504`: check Agno readiness, Supabase connectivity, and the configured timeout. Errors are intentionally sanitized.
- Missing results may be an authorization decision, not missing data. Use the correlation ID and authorized audit view; never retry with a privileged credential.
- Immediate rollback: set `AGNO_ASSISTANT_ENABLED=false` and redeploy/restart the frontend. The page returns to labeled deterministic demo behavior without deleting conversations or affecting operational workflows.

## Release gate

Before staged internal access, run Python format/lint/type/tests, Supabase reset/security tests/lint, frontend lint/type/unit/E2E/build, then smoke-test Admin organization queries, Manager analytics, Technician self-service, denial of another Technician's data, and webhook signature rejection. Enable the feature flag for internal users only after both health endpoints pass. Production deployment credentials and platform changes are intentionally outside repository automation.
