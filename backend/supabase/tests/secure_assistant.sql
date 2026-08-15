begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(20);

select extensions.has_table('public', 'assistant_threads', 'assistant threads exist');
select extensions.has_table('public', 'assistant_messages', 'assistant messages exist');
select extensions.has_table('public', 'assistant_audit_events', 'assistant audits exist');
select extensions.has_table('public', 'assistant_documents', 'assistant documents exist');
select extensions.has_table('public', 'assistant_document_chunks', 'assistant chunks exist');
select extensions.ok((select relrowsecurity from pg_class where oid='public.assistant_threads'::regclass), 'threads have RLS');
select extensions.ok((select relrowsecurity from pg_class where oid='public.assistant_documents'::regclass), 'documents have RLS');
select extensions.ok(exists(select 1 from pg_proc where proname='search_authorized_document_chunks'), 'authorized document search exists');
select extensions.ok(exists(select 1 from pg_proc where proname='assistant_order_summary'), 'bounded order analytics exists');
select extensions.ok(not exists(
  select 1 from information_schema.routine_privileges
  where routine_schema='public' and routine_name='search_authorized_document_chunks' and grantee='PUBLIC'
), 'document search is not executable by PUBLIC');
select extensions.ok(exists(select 1 from pg_proc where proname='cleanup_expired_assistant_data'), 'retention cleanup exists');
select extensions.ok(not exists(
  select 1 from information_schema.routine_privileges
  where routine_schema='public' and routine_name='cleanup_expired_assistant_data'
    and grantee in ('PUBLIC', 'anon', 'authenticated')
), 'retention cleanup is restricted to trusted infrastructure');

insert into public.assistant_documents(
  id,title,source_file_name,storage_path,mime_type,size_bytes,checksum_sha256,status,visibility,visible_roles,created_by
) values
('81000000-0000-0000-0000-000000000001','Technician guide','guide.pdf','docs/guide.pdf','application/pdf',100,repeat('a',64),'ready','all_authenticated','{}','20000000-0000-0000-0000-000000000001'),
('81000000-0000-0000-0000-000000000002','Manager policy','manager.pdf','docs/manager.pdf','application/pdf',100,repeat('b',64),'ready','restricted','{manager}','20000000-0000-0000-0000-000000000001');

-- Audit history is order-scoped: the assigned technician may read their own
-- orders' events but nothing outside can_access_order.
insert into public.audit_events(order_id, actor_id, action)
values
  ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','test.own_order'),
  ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003','test.other_order');

select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
set local role authenticated;
select extensions.ok(public.can_access_assistant_document('81000000-0000-0000-0000-000000000001'), 'technician can access all-user guide');
select extensions.ok(not public.can_access_assistant_document('81000000-0000-0000-0000-000000000002'), 'technician cannot access manager document');
select extensions.is((select count(*)::bigint from public.assistant_documents), 1::bigint, 'technician sees only authorized documents');
select extensions.is((select count(*)::bigint from public.profiles where id <> auth.uid()), 0::bigint, 'technician cannot directly read other profiles');
select extensions.ok((select count(*) from public.staff_directory()) > 1, 'technician can use minimal staff directory');
select extensions.is((select count(*)::bigint from public.audit_events where action like 'test.%'), 1::bigint, 'technician reads only own assigned order audit history');

reset role;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select extensions.ok(public.can_access_assistant_document('81000000-0000-0000-0000-000000000002'), 'manager can access manager document');
select extensions.is((select count(*)::bigint from public.assistant_documents), 2::bigint, 'manager sees both authorized documents');
reset role;

select * from extensions.finish();
rollback;
