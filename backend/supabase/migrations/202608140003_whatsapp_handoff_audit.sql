create or replace function public.record_whatsapp_feedback_opened(p_order_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare target public.orders;
begin
  select * into target from public.orders where id=p_order_id;
  if target.id is null then raise exception 'Order not found'; end if;
  if target.assigned_technician_id<>auth.uid() or target.status not in ('Job Done','Reviewed','Closed') then
    raise exception 'Completed assigned job required';
  end if;
  insert into public.audit_events(order_id,actor_id,action,after_values)
  values(p_order_id,auth.uid(),'whatsapp.feedback_opened',jsonb_build_object('delivery_confirmed',false));
end $$;

grant execute on function public.record_whatsapp_feedback_opened(uuid) to authenticated;
