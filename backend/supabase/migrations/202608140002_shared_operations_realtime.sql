-- Missing write boundaries used by the web client. All functions keep RLS-like
-- role checks inside the transaction and use optimistic order versions.
alter table public.payments add column if not exists notes text;

create or replace function public.update_checklist_item(
  p_order_id uuid, p_item_id uuid, p_expected_version integer,
  p_completed boolean, p_note text default null
) returns public.orders language plpgsql security definer set search_path=public as $$
declare result public.orders;
begin
  select * into result from orders where id=p_order_id for update;
  if result.id is null then raise exception 'Order not found'; end if;
  if public.current_role() <> 'technician'::public.app_role or result.assigned_technician_id<>auth.uid() or result.status<>'In Progress' then raise exception 'Not authorized'; end if;
  if result.version<>p_expected_version then raise exception 'Version conflict'; end if;
  update order_checklist_items set completed=p_completed, note=nullif(trim(p_note),''),
    completed_by=case when p_completed then auth.uid() else null end,
    completed_at=case when p_completed then now() else null end
    where id=p_item_id and order_id=p_order_id;
  if not found then raise exception 'Checklist item not found'; end if;
  update orders set version=version+1,updated_at=now() where id=p_order_id returning * into result;
  insert into audit_events(order_id,actor_id,action,after_values) values(p_order_id,auth.uid(),'Checklist item updated',jsonb_build_object('item_id',p_item_id,'completed',p_completed,'note',p_note));
  return result;
end $$;

create or replace function public.replace_order_checklist(
  p_order_id uuid, p_expected_version integer, p_titles text[]
) returns public.orders language plpgsql security definer set search_path=public as $$
declare result public.orders; title text; pos integer:=0;
begin
  if public.current_role() <> 'admin'::public.app_role then raise exception 'Admin access required'; end if;
  select * into result from orders where id=p_order_id for update;
  if result.id is null then raise exception 'Order not found'; end if;
  if result.version<>p_expected_version then raise exception 'Version conflict'; end if;
  if result.status not in ('New','Assigned') then raise exception 'Checklist is locked'; end if;
  if cardinality(p_titles)=0 then raise exception 'At least one checklist item is required'; end if;
  delete from order_checklist_items where order_id=p_order_id;
  foreach title in array p_titles loop
    pos:=pos+1;
    insert into order_checklist_items(order_id,title,position) values(p_order_id,trim(title),pos);
  end loop;
  update orders set version=version+1,updated_at=now() where id=p_order_id returning * into result;
  insert into audit_events(order_id,actor_id,action,after_values) values(p_order_id,auth.uid(),'Checklist customized',jsonb_build_object('items',p_titles));
  return result;
end $$;

create or replace function public.record_payment(
  p_order_id uuid, p_expected_version integer, p_amount numeric,
  p_method public.payment_method, p_notes text default null
) returns public.orders language plpgsql security definer set search_path=public as $$
declare result public.orders; final numeric; received numeric;
begin
  if public.current_role() <> 'admin'::public.app_role then raise exception 'Admin access required'; end if;
  select * into result from orders where id=p_order_id for update;
  if result.id is null then raise exception 'Order not found'; end if;
  if result.version<>p_expected_version then raise exception 'Version conflict'; end if;
  select final_amount into final from service_completions where order_id=p_order_id;
  if final is null then raise exception 'Job is not completed'; end if;
  select coalesce(sum(amount),0) into received from payments where order_id=p_order_id;
  if p_amount<=0 or received+p_amount>final then raise exception 'Payment exceeds outstanding amount'; end if;
  insert into payments(order_id,amount,method,recorded_by,notes) values(p_order_id,p_amount,p_method,auth.uid(),nullif(trim(p_notes),''));
  update orders set version=version+1,updated_at=now() where id=p_order_id returning * into result;
  insert into audit_events(order_id,actor_id,action,after_values) values(p_order_id,auth.uid(),'Payment recorded',jsonb_build_object('amount',p_amount,'method',p_method,'notes',p_notes));
  insert into notifications(order_id,recipient_role,kind,title,body) values(p_order_id,'manager','customer_feedback','Customer payment recorded',result.order_no||': RM'||p_amount||' received.');
  return result;
end $$;

grant execute on function public.update_checklist_item(uuid,uuid,integer,boolean,text) to authenticated;
grant execute on function public.replace_order_checklist(uuid,integer,text[]) to authenticated;
grant execute on function public.record_payment(uuid,integer,numeric,public.payment_method,text) to authenticated;

do $$ declare t text; begin
  foreach t in array array['orders','service_completions','order_checklist_items','job_evidence','payments','schedule_events','reviews','notifications','audit_events'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;
