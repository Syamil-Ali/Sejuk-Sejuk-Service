-- The web client stages evidence uploads and removes abandoned staged files
-- directly; RLS already scopes those writes to the uploader and their order.
-- Only SELECT was granted initially, so inserts failed with permission denied
-- and no evidence ever persisted (completion or checklist proof).
grant insert, delete on table public.job_evidence to authenticated;
