-- Assessment-only demo credentials. Do not reuse these accounts in production.
insert into public.branches(id,name,state) values
  ('10000000-0000-0000-0000-000000000001','Shah Alam','Selangor'),
  ('10000000-0000-0000-0000-000000000002','Kuala Lumpur','Kuala Lumpur'),
  ('10000000-0000-0000-0000-000000000003','Johor Bahru','Johor'),
  ('10000000-0000-0000-0000-000000000004','George Town','Penang'),
  ('10000000-0000-0000-0000-000000000005','Kota Kinabalu','Sabah')
on conflict(id) do nothing;

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',id,'authenticated','authenticated',email,crypt('SejukDemo2026!',gen_salt('bf')),now(),'{}'::jsonb,jsonb_build_object('display_name',name),now(),now()
from (values
  ('20000000-0000-0000-0000-000000000001'::uuid,'admin@sejuk.demo','Nadia'),
  ('20000000-0000-0000-0000-000000000002'::uuid,'manager@sejuk.demo','Farah'),
  ('20000000-0000-0000-0000-000000000003'::uuid,'ali@sejuk.demo','Ali'),
  ('20000000-0000-0000-0000-000000000004'::uuid,'john@sejuk.demo','John'),
  ('20000000-0000-0000-0000-000000000005'::uuid,'bala@sejuk.demo','Bala'),
  ('20000000-0000-0000-0000-000000000006'::uuid,'yusoff@sejuk.demo','Yusoff')
) as users(id,email,name)
on conflict(id) do nothing;

-- GoTrue scans token columns as strings; use empty values for local demo users.
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, '')
where email like '%@sejuk.demo';

insert into auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
select id,id,email,jsonb_build_object('sub',id::text,'email',email),'email',now(),now(),now()
from (values
  ('20000000-0000-0000-0000-000000000001'::uuid,'admin@sejuk.demo'),
  ('20000000-0000-0000-0000-000000000002'::uuid,'manager@sejuk.demo'),
  ('20000000-0000-0000-0000-000000000003'::uuid,'ali@sejuk.demo'),
  ('20000000-0000-0000-0000-000000000004'::uuid,'john@sejuk.demo'),
  ('20000000-0000-0000-0000-000000000005'::uuid,'bala@sejuk.demo'),
  ('20000000-0000-0000-0000-000000000006'::uuid,'yusoff@sejuk.demo')
) as users(id,email)
on conflict(id) do nothing;

insert into public.profiles(id,display_name,role,branch_id,phone) values
  ('20000000-0000-0000-0000-000000000001','Nadia (Admin)','admin','10000000-0000-0000-0000-000000000001','601122334455'),
  ('20000000-0000-0000-0000-000000000002','Farah (Manager)','manager','10000000-0000-0000-0000-000000000001','601133445566'),
  ('20000000-0000-0000-0000-000000000003','Ali','technician','10000000-0000-0000-0000-000000000001','60123456789'),
  ('20000000-0000-0000-0000-000000000004','John','technician','10000000-0000-0000-0000-000000000002','60134567890'),
  ('20000000-0000-0000-0000-000000000005','Bala','technician','10000000-0000-0000-0000-000000000003','60145678901'),
  ('20000000-0000-0000-0000-000000000006','Yusoff','technician','10000000-0000-0000-0000-000000000004','60156789012')
on conflict(id) do update set display_name=excluded.display_name,role=excluded.role,branch_id=excluded.branch_id,phone=excluded.phone;

insert into public.service_checklist_templates(service_type,title,position) values
  ('Cleaning','Inspect unit condition and protect work area',1),('Cleaning','Clean filters, coil, blower, and drain line',2),('Cleaning','Test cooling, airflow, and drainage',3),
  ('Repair','Diagnose and confirm the reported fault',1),('Repair','Repair or replace the affected component',2),('Repair','Test operation and confirm fault is resolved',3),
  ('Installation','Confirm mounting location and electrical supply',1),('Installation','Install indoor/outdoor units and pipework',2),('Installation','Vacuum, commission, and test system',3),('Installation','Clean work area and brief customer',4),
  ('Gas Refill','Inspect system and identify leak indicators',1),('Gas Refill','Repair leak where applicable and pressure test',2),('Gas Refill','Recharge refrigerant to specification',3),('Gas Refill','Test operating pressure and cooling output',4),
  ('Inspection','Inspect unit, electrical, drainage, and performance',1),('Inspection','Record findings and recommended actions',2),
  ('Other','Confirm requested scope with customer',1),('Other','Complete agreed service work',2),('Other','Test result and obtain customer acknowledgement',3)
on conflict(service_type,position) do update set title=excluded.title;

insert into public.orders(id,order_no,customer_name,customer_phone,address,problem_description,service_type,quoted_price,assigned_technician_id,branch_id,scheduled_at,status,created_by,version,created_at) values
  ('30000000-0000-0000-0000-000000000001','ORDER001234','Ahmad','60123400001','No. 12, Jalan Sejuk, Shah Alam','Air conditioner is not cooling','Cleaning',180,'20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001',date_trunc('day',now())+interval '14 hours','Assigned','20000000-0000-0000-0000-000000000001',1,now()-interval '1 day'),
  ('30000000-0000-0000-0000-000000000002','ORDER001237','Mei Ling','60123400002','Bangsar South, Kuala Lumpur','Indoor unit leaking water','Repair',260,'20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002',now()+interval '1 day','In Progress','20000000-0000-0000-0000-000000000001',2,now()-interval '2 days'),
  ('30000000-0000-0000-0000-000000000003','ORDER001241','Siti Aisyah','60123400003','Taman Universiti, Johor Bahru','Low refrigerant pressure','Gas Refill',220,'20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000003',now()-interval '1 day','Job Done','20000000-0000-0000-0000-000000000001',3,now()-interval '4 days')
on conflict(id) do nothing;

insert into public.order_checklist_items(order_id,title,position,required,completed,note,completed_by,completed_at)
select o.id,t.title,t.position,t.required,o.status in ('Job Done','Reviewed','Closed'),
  case when o.status in ('Job Done','Reviewed','Closed') then 'Completed during field service.' end,
  case when o.status in ('Job Done','Reviewed','Closed') then o.assigned_technician_id end,
  case when o.status in ('Job Done','Reviewed','Closed') then now()-interval '1 day' end
from public.orders o join public.service_checklist_templates t on t.service_type=o.service_type
on conflict(order_id,position) do nothing;

insert into public.service_completions(order_id,work_done,extra_charges,final_amount,remarks,technician_id,completed_at)
values('30000000-0000-0000-0000-000000000003','Leak check and R32 gas refill',40,260,'Monitor for 48 hours','20000000-0000-0000-0000-000000000005',(date_trunc('week', now() at time zone 'Asia/Kuala_Lumpur') + interval '2 days') at time zone 'Asia/Kuala_Lumpur')
on conflict(order_id) do nothing;

insert into public.payments(order_id,amount,method,recorded_by,received_at)
select '30000000-0000-0000-0000-000000000003',260,'E-Wallet','20000000-0000-0000-0000-000000000005',(date_trunc('week', now() at time zone 'Asia/Kuala_Lumpur') + interval '2 days') at time zone 'Asia/Kuala_Lumpur'
where not exists(select 1 from public.payments where order_id='30000000-0000-0000-0000-000000000003');

insert into public.notifications(order_id,recipient_role,kind,title,body)
select '30000000-0000-0000-0000-000000000003','manager','job_done','Job ready for review','ORDER001241 was completed by Bala.'
where not exists(select 1 from public.notifications where order_id='30000000-0000-0000-0000-000000000003' and kind='job_done');
