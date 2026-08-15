# Deployment and smoke test

## Supabase

1. Create separate development and assessment-demo projects.
2. Apply migrations in timestamp order and run the assessment seed only in the demo project.
3. Verify Auth email login, the six demo profiles, five branches, private `job-evidence` bucket, 10 MB limit, and allowed MIME types.
4. Exercise RLS using an Admin, each Technician, and a Manager. Never test RLS with the service-role key.
5. Keep point-in-time backups enabled if the project tier supports them. Use forward-safe corrective migrations rather than destructive rollback after orders exist.

## Vercel

1. Import the repository and set the Vercel root directory to `frontend`.
2. Set all public/server variables from `frontend/.env.example`; mark the service-role and OpenAI keys as sensitive.
3. Deploy a preview and run `npm run build` in CI before promotion.
4. Set `NEXT_PUBLIC_DEMO_MODE=false` only after all portal repositories/actions use Supabase in the target environment.
5. Promote the verified preview. Roll back the application by selecting the previous Vercel deployment; correct database changes with a new migration.

## Post-deploy smoke test

- Sign in as every demo role and confirm role-specific navigation.
- Create an unassigned order, assign Ali, and verify order number uniqueness.
- Confirm another Technician cannot read or mutate Ali's job through direct API calls.
- Start and reschedule the visit; verify the primary status remains valid and KPI postponements update.
- Upload valid evidence, reject a seventh file and a file over 10 MB, then complete with a partial payment.
- Confirm Manager notification, variance/missing-image indicators, return-for-correction, acceptance, and closure lock.
- Confirm the dashboard default week and a custom inclusive range in Malaysian time.
- Ask all four supported assistant questions, an unsupported question, and a SQL-like request; verify the model receives no unrestricted database access.
- Open both WhatsApp deep links and verify recipient/message encoding while the UI avoids delivery claims.
