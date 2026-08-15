begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

select extensions.ok(exists(select 1 from pg_type where typname='order_status'), 'order_status enum exists');
select extensions.ok(exists(select 1 from pg_proc where proname='complete_order'), 'completion function exists');
select extensions.ok(exists(select 1 from pg_proc where proname='dashboard_metrics'), 'dashboard function exists');
select extensions.ok((select count(*) from public.branches) >= 5, 'five branches are seeded');
select extensions.ok(not exists(select 1 from public.orders where quoted_price < 0), 'quoted prices are non-negative');
select extensions.ok(not exists(
  select 1 from public.service_completions completion
  join public.orders service_order on service_order.id=completion.order_id
  where completion.final_amount <> completion.extra_charges + service_order.quoted_price
), 'completion totals match quote plus extras');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
select extensions.ok(public.can_access_order('30000000-0000-0000-0000-000000000001'), 'assigned technician can access own order');
select extensions.ok(not public.can_access_order('30000000-0000-0000-0000-000000000002'), 'technician cannot access another technician order');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select extensions.ok(public.can_access_order('30000000-0000-0000-0000-000000000002'), 'manager can access operational orders');
select extensions.ok((select count(*) from public.service_checklist_templates)>=18, 'service checklist templates are seeded');
select extensions.ok(not exists(select 1 from public.orders service_order where not exists(select 1 from public.order_checklist_items item where item.order_id=service_order.id)), 'every seeded order has checklist items');
select extensions.ok(not exists(select 1 from public.order_checklist_items item join public.orders service_order on service_order.id=item.order_id where service_order.status in ('Job Done','Reviewed','Closed') and item.required and not item.completed), 'completed lifecycle orders have complete checklists');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select public.assign_order('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000005',(select version from public.orders where id='30000000-0000-0000-0000-000000000001'));
select extensions.ok(exists(
  select 1 from public.notifications
  where order_id='30000000-0000-0000-0000-000000000001'
    and recipient_id='20000000-0000-0000-0000-000000000005'
    and kind='assignment'
    and title='New job assigned'
), 'assignment creates a technician notification');
select public.create_order('Test Customer','60123456789','12, Jalan Sejuk, 40100 Shah Alam, Selangor','Test issue','Cleaning',100,'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003',null,null,'12','Jalan Sejuk',null,'40100','Shah Alam','Selangor');
select extensions.ok(exists(
  select 1 from public.notifications
  where recipient_id='20000000-0000-0000-0000-000000000003'
    and kind='assignment'
    and title='New job assigned'
), 'creating an order with an assigned technician notifies them');
select extensions.ok(exists(
  select 1 from public.orders
  where customer_name='Test Customer'
    and building='12' and address_line_1='Jalan Sejuk'
    and postcode='40100' and city='Shah Alam' and state='Selangor'
), 'created order stores structured address parts');

do $$ declare created public.orders; begin
  created := public.create_order('Edit Test','60123456789','Old Address','Test issue','Repair',100,'10000000-0000-0000-0000-000000000001',null,null,null,'10','Old Street',null,'40000','Old City','Old State');
  perform public.update_order_details(created.id, created.version, 'Cleaning', '0123456789', '22, Jalan Baru, 50000 Kuala Lumpur', '2026-08-20T02:00:00Z', '22', 'Jalan Baru', null, '50000', 'Kuala Lumpur', 'WP Kuala Lumpur');
end $$;
select extensions.ok(exists(
  select 1 from public.orders
  where customer_name='Edit Test'
    and service_type='Cleaning' and customer_phone='0123456789'
    and building='22' and address_line_1='Jalan Baru'
    and postcode='50000' and city='Kuala Lumpur' and state='WP Kuala Lumpur'
    and scheduled_at='2026-08-20T02:00:00Z'
), 'admin can edit service details with structured address');
select extensions.ok(exists(
  select 1 from public.audit_events
  where action='order.details_updated' and after_values->>'customer_phone'='0123456789'
), 'service detail edits are audited');

select * from extensions.finish();

rollback;
