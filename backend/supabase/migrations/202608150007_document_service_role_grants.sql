-- The Agno document intake/extraction pipeline reads and stages documents with
-- the service role (never with browser credentials). The assistant tables were
-- only granted to authenticated, so grant the service role the minimal
-- read/insert access it needs.
grant select, insert on table public.assistant_documents to service_role;
