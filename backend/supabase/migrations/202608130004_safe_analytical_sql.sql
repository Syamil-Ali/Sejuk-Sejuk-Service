-- Curated, caller-scoped analytical projections. security_invoker preserves the
-- authenticated caller's grants and RLS on every underlying relation.
create or replace view public.assistant_analytics_orders
with (security_barrier = true, security_invoker = true)
as
select
  o.id as order_id,
  o.order_no,
  o.customer_name,
  o.service_type,
  o.status,
  o.quoted_price,
  o.assigned_technician_id,
  p.display_name as technician_name,
  b.name as branch_name,
  o.scheduled_at,
  o.created_at,
  o.updated_at
from public.orders o
left join public.profiles p on p.id = o.assigned_technician_id
join public.branches b on b.id = o.branch_id;

create or replace view public.assistant_analytics_completions
with (security_barrier = true, security_invoker = true)
as
select
  c.id as completion_id,
  c.order_id,
  o.order_no,
  c.technician_id,
  p.display_name as technician_name,
  c.extra_charges,
  c.final_amount,
  c.completed_at
from public.service_completions c
join public.orders o on o.id = c.order_id
join public.profiles p on p.id = c.technician_id;

create or replace view public.assistant_analytics_payments
with (security_barrier = true, security_invoker = true)
as
select
  p.id as payment_id,
  p.order_id,
  o.order_no,
  o.assigned_technician_id,
  p.amount,
  p.method,
  p.received_at
from public.payments p
join public.orders o on o.id = p.order_id;

create or replace view public.assistant_analytics_schedule_events
with (security_barrier = true, security_invoker = true)
as
select
  e.id as event_id,
  e.order_id,
  o.order_no,
  o.assigned_technician_id,
  e.previous_scheduled_at,
  e.new_scheduled_at,
  e.reason,
  e.created_at
from public.schedule_events e
join public.orders o on o.id = e.order_id;

create or replace view public.assistant_analytics_reviews
with (security_barrier = true, security_invoker = true)
as
select
  r.id as review_id,
  r.order_id,
  o.order_no,
  r.outcome,
  r.reviewed_at
from public.reviews r
join public.orders o on o.id = r.order_id;

create or replace view public.assistant_analytics_checklist
with (security_barrier = true, security_invoker = true)
as
select
  i.id as item_id,
  i.order_id,
  o.order_no,
  i.required,
  i.completed,
  i.completed_at
from public.order_checklist_items i
join public.orders o on o.id = i.order_id;

-- Python performs PostgreSQL AST validation before this RPC. This boundary
-- independently rejects multiple statements and obvious state-changing SQL,
-- applies tight timeouts, executes with invoker privileges, and caps rows.
create or replace function public.execute_assistant_analytical_query(
  p_sql text,
  p_max_rows integer default 100,
  p_statement_timeout_ms integer default 3000
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
declare
  normalized text := lower(trim(p_sql));
  bounded_rows integer := least(greatest(p_max_rows, 1), 500);
  bounded_timeout integer := least(greatest(p_statement_timeout_ms, 100), 15000);
  collected jsonb;
  result_count integer;
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  if normalized = '' or normalized !~ '^(select|with)[[:space:]]' then
    raise invalid_parameter_value using message = 'read-only select required';
  end if;
  if position(';' in p_sql) > 0
     or normalized ~ '(^|[^a-z_])(insert|update|delete|merge|truncate|create|alter|drop|copy|grant|revoke|call|do|execute|lock|vacuum|analyze|refresh|reindex|cluster)([^a-z_]|$)'
     or normalized ~ '(^|[^a-z_])(pg_sleep|dblink|lo_import|lo_export|pg_read_file|pg_ls_dir|set_config)([^a-z_]|$)'
  then
    raise invalid_parameter_value using message = 'read-only select required';
  end if;

  perform set_config('statement_timeout', bounded_timeout::text, true);
  perform set_config('lock_timeout', least(bounded_timeout, 1000)::text, true);
  execute format(
    'select coalesce(jsonb_agg(to_jsonb(result_row)), ''[]''::jsonb) from (select * from (%s) validated_query limit %s) result_row',
    p_sql,
    bounded_rows + 1
  ) into collected;
  result_count := jsonb_array_length(collected);

  return jsonb_build_object(
    'rows', case when result_count > bounded_rows then collected - bounded_rows else collected end,
    'rowCount', least(result_count, bounded_rows),
    'truncated', result_count > bounded_rows,
    'retrievedAt', now()
  );
end;
$$;

revoke all on public.assistant_analytics_orders from public, anon;
revoke all on public.assistant_analytics_completions from public, anon;
revoke all on public.assistant_analytics_payments from public, anon;
revoke all on public.assistant_analytics_schedule_events from public, anon;
revoke all on public.assistant_analytics_reviews from public, anon;
revoke all on public.assistant_analytics_checklist from public, anon;
grant select on public.assistant_analytics_orders to authenticated;
grant select on public.assistant_analytics_completions to authenticated;
grant select on public.assistant_analytics_payments to authenticated;
grant select on public.assistant_analytics_schedule_events to authenticated;
grant select on public.assistant_analytics_reviews to authenticated;
grant select on public.assistant_analytics_checklist to authenticated;

revoke all on function public.execute_assistant_analytical_query(text, integer, integer)
  from public, anon;
grant execute on function public.execute_assistant_analytical_query(text, integer, integer)
  to authenticated;
