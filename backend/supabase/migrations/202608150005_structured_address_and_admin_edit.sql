-- Structured service address parts and admin editing of service details.

alter table public.orders
  add column if not exists building text,
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists postcode text,
  add column if not exists city text,
  add column if not exists state text;

-- Replace the previous create_order signature with one that also stores the
-- structured address parts. The composed address string is still stored in
-- `address` for display and map links.
drop function public.create_order(text,text,text,text,public.service_type,numeric,uuid,uuid,timestamptz,text);

create or replace function public.create_order(
  p_customer_name text, p_customer_phone text, p_address text,
  p_problem_description text, p_service_type public.service_type,
  p_quoted_price numeric, p_branch_id uuid, p_assigned_technician_id uuid default null,
  p_scheduled_at timestamptz default null, p_admin_notes text default null,
  p_building text default null, p_address_line_1 text default null,
  p_address_line_2 text default null, p_postcode text default null,
  p_city text default null, p_state text default null
) returns public.orders language plpgsql security definer set search_path = public as $$
declare result public.orders; actor_name text;
begin
  if public.current_role() <> 'admin' then raise exception 'Admin access required'; end if;
  if p_assigned_technician_id is not null and not exists (
    select 1 from profiles where id = p_assigned_technician_id and role = 'technician' and active
  ) then raise exception 'Active technician required'; end if;
  insert into orders(customer_name, customer_phone, address, problem_description, service_type,
    quoted_price, branch_id, assigned_technician_id, scheduled_at, admin_notes, status, created_by,
    building, address_line_1, address_line_2, postcode, city, state)
  values (trim(p_customer_name), p_customer_phone, trim(p_address), trim(p_problem_description),
    p_service_type, p_quoted_price, p_branch_id, p_assigned_technician_id, p_scheduled_at,
    nullif(trim(p_admin_notes), ''), (case when p_assigned_technician_id is null then 'New' else 'Assigned' end)::public.order_status, auth.uid(),
    nullif(trim(p_building), ''), nullif(trim(p_address_line_1), ''), nullif(trim(p_address_line_2), ''),
    nullif(trim(p_postcode), ''), nullif(trim(p_city), ''), nullif(trim(p_state), ''))
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

-- Admin edits the service details (service type, phone, address parts and
-- scheduled time) on an open order. Version-bumped and audited like the other
-- operational writes.
create or replace function public.update_order_details(
  p_order_id uuid, p_expected_version integer,
  p_service_type public.service_type,
  p_customer_phone text,
  p_address text,
  p_scheduled_at timestamptz default null,
  p_building text default null,
  p_address_line_1 text default null,
  p_address_line_2 text default null,
  p_postcode text default null,
  p_city text default null,
  p_state text default null
) returns public.orders language plpgsql security definer set search_path = public as $$
declare previous public.orders; result public.orders;
begin
  if public.current_role() <> 'admin' then raise exception 'Admin access required'; end if;
  select * into previous from orders where id = p_order_id for update;
  if previous.id is null then raise exception 'Order not found'; end if;
  if previous.version <> p_expected_version then raise exception 'STALE_VERSION'; end if;
  if previous.status = 'Closed' then raise exception 'Closed order cannot be edited'; end if;
  if char_length(trim(p_customer_phone)) = 0 or char_length(trim(p_address)) = 0 then
    raise exception 'Phone and address are required';
  end if;
  update orders set
    service_type = p_service_type,
    customer_phone = trim(p_customer_phone),
    address = trim(p_address),
    scheduled_at = p_scheduled_at,
    building = nullif(trim(p_building), ''),
    address_line_1 = nullif(trim(p_address_line_1), ''),
    address_line_2 = nullif(trim(p_address_line_2), ''),
    postcode = nullif(trim(p_postcode), ''),
    city = nullif(trim(p_city), ''),
    state = nullif(trim(p_state), ''),
    version = version + 1
  where id = p_order_id returning * into result;
  insert into audit_events(order_id, actor_id, action, before_values, after_values)
  values (p_order_id, auth.uid(), 'order.details_updated', to_jsonb(previous), to_jsonb(result));
  return result;
end $$;

revoke all on function public.create_order(text,text,text,text,public.service_type,numeric,uuid,uuid,timestamptz,text,text,text,text,text,text,text) from public;
grant execute on function public.create_order(text,text,text,text,public.service_type,numeric,uuid,uuid,timestamptz,text,text,text,text,text,text,text) to authenticated;
revoke all on function public.update_order_details(uuid,integer,public.service_type,text,text,timestamptz,text,text,text,text,text,text) from public;
grant execute on function public.update_order_details(uuid,integer,public.service_type,text,text,timestamptz,text,text,text,text,text,text) to authenticated;
