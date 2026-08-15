-- Link an uploaded receipt to the payment record. The web client stages the
-- receipt as committed job evidence for the order; the RPCs validate it and
-- store the reference on the payment row.

create or replace function public.record_payment(
  p_order_id uuid, p_expected_version integer, p_amount numeric,
  p_method public.payment_method, p_notes text default null,
  p_receipt_evidence_id uuid default null
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
  if p_receipt_evidence_id is not null and not exists (
    select 1 from public.job_evidence
    where id=p_receipt_evidence_id and order_id=p_order_id and committed
  ) then raise exception 'Receipt evidence is not attached to this order'; end if;
  insert into payments(order_id,amount,method,recorded_by,notes,receipt_evidence_id)
  values(p_order_id,p_amount,p_method,auth.uid(),nullif(trim(p_notes),''),p_receipt_evidence_id);
  update orders set version=version+1,updated_at=now() where id=p_order_id returning * into result;
  insert into audit_events(order_id,actor_id,action,after_values) values(p_order_id,auth.uid(),'Payment recorded',jsonb_build_object('amount',p_amount,'method',p_method,'notes',p_notes));
  insert into notifications(order_id,recipient_role,kind,title,body) values(p_order_id,'manager','customer_feedback','Customer payment recorded',result.order_no||': RM'||p_amount||' received.');
  return result;
end $$;

create or replace function public.complete_order(
  p_order_id uuid, p_expected_version integer, p_work_done text, p_extra_charges numeric,
  p_remarks text default null, p_payment_amount numeric default null,
  p_payment_method public.payment_method default null,
  p_receipt_evidence_id uuid default null
) returns public.orders language plpgsql security definer set search_path = public as $$
declare previous public.orders; result public.orders; calculated numeric(12,2);
begin
  select * into previous from orders where id=p_order_id for update;
  if previous.assigned_technician_id <> auth.uid() or previous.status <> 'In Progress' then raise exception 'Active assigned job required'; end if;
  if previous.version <> p_expected_version then raise exception 'STALE_VERSION'; end if;
  if char_length(trim(p_work_done))=0 or p_extra_charges < 0 then raise exception 'Invalid completion'; end if;
  if exists(select 1 from order_checklist_items where order_id=p_order_id and required and not completed) then raise exception 'CHECKLIST_INCOMPLETE'; end if;
  calculated := previous.quoted_price + p_extra_charges;
  if p_payment_amount is not null and (p_payment_amount < 0 or p_payment_amount > calculated or p_payment_method is null) then raise exception 'Invalid payment'; end if;
  if p_receipt_evidence_id is not null and not exists (
    select 1 from public.job_evidence
    where id=p_receipt_evidence_id and order_id=p_order_id and committed
  ) then raise exception 'Receipt evidence is not attached to this order'; end if;
  insert into service_completions(order_id,work_done,extra_charges,final_amount,remarks,technician_id)
    values(p_order_id,trim(p_work_done),p_extra_charges,calculated,nullif(trim(p_remarks),''),auth.uid())
    on conflict(order_id) do update set work_done=excluded.work_done,extra_charges=excluded.extra_charges,final_amount=excluded.final_amount,remarks=excluded.remarks,technician_id=excluded.technician_id,completed_at=now();
  if p_payment_amount is not null then insert into payments(order_id,amount,method,recorded_by,receipt_evidence_id) values(p_order_id,p_payment_amount,p_payment_method,auth.uid(),p_receipt_evidence_id); end if;
  update job_evidence set committed=true where order_id=p_order_id and uploader_id=auth.uid();
  update orders set status='Job Done',version=version+1 where id=p_order_id returning * into result;
  insert into notifications(order_id,recipient_role,kind,title,body) values(p_order_id,'manager','job_done','Job ready for review',result.order_no || ' was completed.');
  insert into audit_events(order_id,actor_id,action,before_values,after_values) values(p_order_id,auth.uid(),'order.completed',to_jsonb(previous),to_jsonb(result));
  return result;
end $$;

revoke all on function public.record_payment(uuid,integer,numeric,public.payment_method,text) from public;
grant execute on function public.record_payment(uuid,integer,numeric,public.payment_method,text,uuid) to authenticated;
revoke all on function public.complete_order(uuid,integer,text,numeric,text,numeric,public.payment_method) from public;
grant execute on function public.complete_order(uuid,integer,text,numeric,text,numeric,public.payment_method,uuid) to authenticated;
