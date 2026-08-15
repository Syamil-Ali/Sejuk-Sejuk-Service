-- Notify the assigned technician when a job is assigned, both on creation
-- with an assigned technician and on (re)assignment. The notification_kind
-- enum already included 'assignment'; only the RPCs never wrote one.

create or replace function public.create_order(
  p_customer_name text, p_customer_phone text, p_address text,
  p_problem_description text, p_service_type public.service_type,
  p_quoted_price numeric, p_branch_id uuid, p_assigned_technician_id uuid default null,
  p_scheduled_at timestamptz default null, p_admin_notes text default null
) returns public.orders language plpgsql security definer set search_path = public as $$
declare result public.orders; actor_name text;
begin
  if public.current_role() <> 'admin' then raise exception 'Admin access required'; end if;
  if p_assigned_technician_id is not null and not exists (
    select 1 from profiles where id = p_assigned_technician_id and role = 'technician' and active
  ) then raise exception 'Active technician required'; end if;
  insert into orders(customer_name, customer_phone, address, problem_description, service_type,
    quoted_price, branch_id, assigned_technician_id, scheduled_at, admin_notes, status, created_by)
  values (trim(p_customer_name), p_customer_phone, trim(p_address), trim(p_problem_description),
    p_service_type, p_quoted_price, p_branch_id, p_assigned_technician_id, p_scheduled_at,
    nullif(trim(p_admin_notes), ''), (case when p_assigned_technician_id is null then 'New' else 'Assigned' end)::public.order_status, auth.uid())
  returning * into result;
  insert into order_checklist_items(order_id,title,position,required)
    select result.id,title,position,required from service_checklist_templates where service_type=p_service_type order by position;
  insert into audit_events(order_id, actor_id, action, after_values)
  values (result.id, auth.uid(), 'order.created', to_jsonb(result));
  if p_assigned_technician_id is not null then
    select display_name into actor_name from profiles where id = auth.uid();
    insert into notifications(order_id, recipient_id, kind, title, body)
    values (result.id, p_assigned_technician_id, 'assignment', 'New job assigned',
      result.order_no || ' was created and assigned to you' || coalesce(' by ' || actor_name, '') || '.');
  end if;
  return result;
end $$;

create or replace function public.assign_order(p_order_id uuid, p_technician_id uuid, p_expected_version integer)
returns public.orders language plpgsql security definer set search_path = public as $$
declare previous public.orders; result public.orders; actor_name text;
begin
  if public.current_role() <> 'admin' then raise exception 'Admin access required'; end if;
  select * into previous from orders where id = p_order_id for update;
  if previous.version <> p_expected_version then raise exception 'STALE_VERSION'; end if;
  if previous.status in ('Job Done','Reviewed','Closed') then raise exception 'Order can no longer be reassigned'; end if;
  if not exists(select 1 from profiles where id=p_technician_id and role='technician' and active) then raise exception 'Active technician required'; end if;
  select display_name into actor_name from profiles where id = auth.uid();
  update orders set assigned_technician_id=p_technician_id, status='Assigned', version=version+1 where id=p_order_id returning * into result;
  insert into audit_events(order_id,actor_id,action,before_values,after_values) values(p_order_id,auth.uid(),'order.assigned',to_jsonb(previous),to_jsonb(result));
  insert into notifications(order_id, recipient_id, kind, title, body)
  values (p_order_id, p_technician_id, 'assignment', 'New job assigned',
    result.order_no || ' was assigned to you' || coalesce(' by ' || actor_name, '') || '.');
  return result;
end $$;

revoke all on function public.create_order(text,text,text,text,public.service_type,numeric,uuid,uuid,timestamptz,text) from public;
grant execute on function public.create_order(text,text,text,text,public.service_type,numeric,uuid,uuid,timestamptz,text) to authenticated;
revoke all on function public.assign_order(uuid,uuid,integer) from public;
grant execute on function public.assign_order(uuid,uuid,integer) to authenticated;
