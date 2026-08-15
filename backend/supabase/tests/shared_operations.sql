begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

select extensions.ok(
  has_column_privilege('authenticated','public.notifications','read_at','UPDATE'),
  'authenticated users can update notification read state'
);

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000004',true);
do $$ declare item record; current_version integer:=2; begin
  for item in select id from public.order_checklist_items where order_id='30000000-0000-0000-0000-000000000002' order by position loop
    perform public.update_checklist_item('30000000-0000-0000-0000-000000000002',item.id,current_version,true,'Integration verified');
    current_version:=current_version+1;
  end loop;
  perform public.complete_order('30000000-0000-0000-0000-000000000002',current_version,'Repaired drain system',0,null,null,null);
end $$;
select extensions.is((select status::text from public.orders where id='30000000-0000-0000-0000-000000000002'),'Job Done','technician completion persists for manager review');
select extensions.ok(exists(select 1 from public.notifications where order_id='30000000-0000-0000-0000-000000000002' and recipient_role='manager' and kind='job_done'),'completion creates manager notification');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select public.review_order('30000000-0000-0000-0000-000000000002',(select version from public.orders where id='30000000-0000-0000-0000-000000000002'),'returned','Retest drainage');
select public.reopen_checklist_items('30000000-0000-0000-0000-000000000002',array[(select id from public.order_checklist_items where order_id='30000000-0000-0000-0000-000000000002' order by position limit 1)]);
select extensions.is((select status::text from public.orders where id='30000000-0000-0000-0000-000000000002'),'In Progress','manager correction is visible as in progress');
select extensions.is((select count(*)::integer from public.order_checklist_items where order_id='30000000-0000-0000-0000-000000000002' and not completed),1,'selected correction item is reopened');
select extensions.ok(exists(select 1 from public.notifications where order_id='30000000-0000-0000-0000-000000000002' and recipient_id='20000000-0000-0000-0000-000000000004' and kind='correction_required'),'assigned technician receives correction notification');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000004',true);
select public.update_checklist_item('30000000-0000-0000-0000-000000000002',(select id from public.order_checklist_items where order_id='30000000-0000-0000-0000-000000000002' and not completed),(select version from public.orders where id='30000000-0000-0000-0000-000000000002'),true,'Retested');
select public.complete_order('30000000-0000-0000-0000-000000000002',(select version from public.orders where id='30000000-0000-0000-0000-000000000002'),'Retested drainage',0,null,null,null);
select public.record_whatsapp_feedback_opened('30000000-0000-0000-0000-000000000002');
select extensions.ok(exists(select 1 from public.audit_events where order_id='30000000-0000-0000-0000-000000000002' and action='whatsapp.feedback_opened' and after_values->>'delivery_confirmed'='false'),'WhatsApp open is audited without claiming delivery');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select public.record_payment('30000000-0000-0000-0000-000000000002',(select version from public.orders where id='30000000-0000-0000-0000-000000000002'),100,'Cash','Balance due next month');
select extensions.is((select sum(amount)::numeric from public.payments where order_id='30000000-0000-0000-0000-000000000002'),100::numeric,'admin payment persists');
select extensions.is((select notes from public.payments where order_id='30000000-0000-0000-0000-000000000002' order by received_at desc limit 1),'Balance due next month','payment notes persist');

update public.notifications set read_at=now() where order_id='30000000-0000-0000-0000-000000000002' and recipient_role='manager';
select extensions.ok(exists(select 1 from public.notifications where order_id='30000000-0000-0000-0000-000000000002' and recipient_role='manager' and read_at is not null),'notification read state persists');

select * from extensions.finish();
rollback;
