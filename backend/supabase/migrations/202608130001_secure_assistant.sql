create extension if not exists vector with schema extensions;

drop policy if exists "profiles visible to authenticated" on public.profiles;
create policy "profiles least privilege read" on public.profiles for select to authenticated using (
  id = auth.uid() or public.current_role() in ('admin', 'manager')
);
grant select on public.profiles to authenticated;
grant select on public.audit_events to authenticated;

create or replace function public.staff_directory()
returns table(id uuid, display_name text, role public.app_role, branch_id uuid)
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name, p.role, p.branch_id
  from public.profiles p
  where auth.uid() is not null and p.active
  order by p.display_name
$$;

create type public.assistant_message_role as enum ('user', 'assistant');
create type public.assistant_message_status as enum ('pending', 'completed', 'refused', 'failed');
create type public.assistant_document_status as enum ('pending', 'processing', 'ready', 'failed', 'quarantined', 'archived');
create type public.assistant_document_visibility as enum ('all_authenticated', 'restricted');

create table public.assistant_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) between 1 and 120),
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.assistant_threads(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  role public.assistant_message_role not null,
  body text not null check (char_length(body) between 1 and 12000),
  status public.assistant_message_status not null default 'pending',
  citations jsonb not null default '[]'::jsonb check (jsonb_typeof(citations) = 'array'),
  correlation_id uuid not null,
  created_at timestamptz not null default now()
);

create table public.assistant_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id),
  actor_role public.app_role not null,
  correlation_id uuid not null,
  policy_outcome text not null check (policy_outcome in ('allowed', 'denied', 'error')),
  tool_names text[] not null default '{}',
  safe_parameters jsonb not null default '{}'::jsonb,
  source_ids text[] not null default '{}',
  latency_ms integer not null default 0 check (latency_ms >= 0),
  completion_status text not null,
  usage_metadata jsonb not null default '{}'::jsonb,
  error_code text,
  retention_until timestamptz,
  created_at timestamptz not null default now()
);

create table public.assistant_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  source_file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  status public.assistant_document_status not null default 'pending',
  visibility public.assistant_document_visibility not null default 'restricted',
  visible_roles public.app_role[] not null default '{}',
  visible_branch_ids uuid[] not null default '{}',
  visible_user_ids uuid[] not null default '{}',
  created_by uuid not null references public.profiles(id),
  retention_until timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assistant_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.assistant_documents(id) on delete cascade,
  version integer not null check (version > 0),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  extraction_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(document_id, version),
  unique(document_id, checksum_sha256)
);

create table public.assistant_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.assistant_documents(id) on delete cascade,
  version_id uuid not null references public.assistant_document_versions(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) between 1 and 8000),
  location jsonb not null default '{}'::jsonb,
  embedding extensions.vector(1536),
  search_vector tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now(),
  unique(version_id, chunk_index)
);

create index assistant_threads_owner_updated_idx on public.assistant_threads(owner_id, updated_at desc);
create index assistant_messages_thread_created_idx on public.assistant_messages(thread_id, created_at);
create index assistant_audit_correlation_idx on public.assistant_audit_events(correlation_id);
create index assistant_audit_actor_created_idx on public.assistant_audit_events(actor_id, created_at desc);
create index assistant_documents_status_idx on public.assistant_documents(status, updated_at desc);
create index assistant_chunks_search_idx on public.assistant_document_chunks using gin(search_vector);
create index assistant_chunks_embedding_idx on public.assistant_document_chunks using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.can_access_assistant_document(target_document uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.assistant_documents d
    left join public.profiles p on p.id = auth.uid() and p.active
    where d.id = target_document
      and p.id is not null
      and d.status = 'ready'
      and d.archived_at is null
      and (d.retention_until is null or d.retention_until > now())
      and (
        d.visibility = 'all_authenticated'
        or p.role = any(d.visible_roles)
        or p.branch_id = any(d.visible_branch_ids)
        or p.id = any(d.visible_user_ids)
      )
  )
$$;

create or replace function public.search_authorized_document_chunks(
  p_query text,
  p_query_embedding extensions.vector(1536) default null,
  p_limit integer default 8
)
returns table(
  chunk_id uuid,
  document_id uuid,
  document_title text,
  content text,
  location jsonb,
  score double precision,
  retrieved_at timestamptz
)
language sql stable security invoker set search_path = public, extensions
as $$
  select c.id, d.id, d.title, c.content, c.location,
    case
      when p_query_embedding is null or c.embedding is null
        then ts_rank_cd(c.search_vector, websearch_to_tsquery('english', p_query))::double precision
      else (
        0.7 * (1 - (c.embedding <=> p_query_embedding))
        + 0.3 * ts_rank_cd(c.search_vector, websearch_to_tsquery('english', p_query))
      )::double precision
    end as score,
    now()
  from public.assistant_document_chunks c
  join public.assistant_documents d on d.id = c.document_id
  where public.can_access_assistant_document(d.id)
    and char_length(trim(p_query)) between 2 and 500
  order by score desc, c.id
  limit least(greatest(p_limit, 1), 20)
$$;

create or replace function public.assistant_order_summary(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security invoker set search_path = public
as $$
  select case
    when auth.uid() is null or p_to <= p_from or p_to - p_from > interval '366 days' then null
    else jsonb_build_object(
      'orders', count(*),
      'open', count(*) filter (where o.status not in ('Reviewed', 'Closed')),
      'completed', count(*) filter (where o.status in ('Job Done', 'Reviewed', 'Closed')),
      'retrievedAt', now()
    )
  end
  from public.orders o
  where o.created_at >= p_from and o.created_at < p_to
$$;

alter table public.assistant_threads enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_audit_events enable row level security;
alter table public.assistant_documents enable row level security;
alter table public.assistant_document_versions enable row level security;
alter table public.assistant_document_chunks enable row level security;

create policy assistant_threads_own_select on public.assistant_threads for select to authenticated using (owner_id = auth.uid());
create policy assistant_threads_own_insert on public.assistant_threads for insert to authenticated with check (owner_id = auth.uid());
create policy assistant_threads_own_update on public.assistant_threads for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy assistant_threads_own_delete on public.assistant_threads for delete to authenticated using (owner_id = auth.uid());
create policy assistant_messages_own_select on public.assistant_messages for select to authenticated using (
  exists(select 1 from public.assistant_threads t where t.id = thread_id and t.owner_id = auth.uid())
);
create policy assistant_messages_own_insert on public.assistant_messages for insert to authenticated with check (
  actor_id = auth.uid() and exists(select 1 from public.assistant_threads t where t.id = thread_id and t.owner_id = auth.uid())
);
create policy assistant_audit_operator_select on public.assistant_audit_events for select to authenticated using (
  public.current_role() in ('admin', 'manager')
);
create policy assistant_documents_authorized_select on public.assistant_documents for select to authenticated using (
  public.can_access_assistant_document(id)
);
create policy assistant_documents_admin_insert on public.assistant_documents for insert to authenticated with check (
  public.current_role() = 'admin' and created_by = auth.uid()
);
create policy assistant_documents_admin_update on public.assistant_documents for update to authenticated using (
  public.current_role() = 'admin'
) with check (public.current_role() = 'admin');
create policy assistant_versions_authorized_select on public.assistant_document_versions for select to authenticated using (
  public.can_access_assistant_document(document_id)
);
create policy assistant_chunks_authorized_select on public.assistant_document_chunks for select to authenticated using (
  public.can_access_assistant_document(document_id)
);

grant select, insert, update, delete on public.assistant_threads to authenticated;
grant select, insert on public.assistant_messages to authenticated;
grant select on public.assistant_audit_events to authenticated;
grant select, insert, update on public.assistant_documents to authenticated;
grant select on public.assistant_document_versions to authenticated;
grant select on public.assistant_document_chunks to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values(
  'assistant-documents', 'assistant-documents', false, 26214400,
  array['application/pdf','text/plain','text/markdown','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict(id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create policy assistant_document_objects_admin_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'assistant-documents' and public.current_role() = 'admin'
);
create policy assistant_document_objects_authorized_select on storage.objects for select to authenticated using (
  bucket_id = 'assistant-documents' and exists(
    select 1 from public.assistant_documents d
    where d.storage_path = name and public.can_access_assistant_document(d.id)
  )
);

revoke all on function public.staff_directory() from public;
revoke all on function public.can_access_assistant_document(uuid) from public;
revoke all on function public.search_authorized_document_chunks(text, extensions.vector, integer) from public;
revoke all on function public.assistant_order_summary(timestamptz, timestamptz) from public;
grant execute on function public.staff_directory() to authenticated;
grant execute on function public.can_access_assistant_document(uuid) to authenticated;
grant execute on function public.search_authorized_document_chunks(text, extensions.vector, integer) to authenticated;
grant execute on function public.assistant_order_summary(timestamptz, timestamptz) to authenticated;
