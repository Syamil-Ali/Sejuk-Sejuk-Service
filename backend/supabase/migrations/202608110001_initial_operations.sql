create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'technician', 'manager');
create type public.order_status as enum ('New', 'Assigned', 'In Progress', 'Job Done', 'Reviewed', 'Closed');
create type public.service_type as enum ('Cleaning', 'Repair', 'Installation', 'Gas Refill', 'Inspection', 'Other');
create type public.payment_method as enum ('Cash', 'Card', 'Bank Transfer', 'E-Wallet');
create type public.review_outcome as enum ('accepted', 'returned');
create type public.notification_kind as enum ('assignment', 'job_done', 'correction_required', 'customer_feedback');
create type public.evidence_kind as enum ('image', 'video', 'pdf', 'receipt');

create sequence public.order_number_seq start 1001;

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  state text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.app_role not null,
  branch_id uuid references public.branches(id),
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default ('ORDER' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  customer_name text not null check (char_length(trim(customer_name)) >= 2),
  customer_phone text not null,
  address text not null,
  problem_description text not null,
  service_type public.service_type not null,
  quoted_price numeric(12,2) not null check (quoted_price >= 0),
  assigned_technician_id uuid references public.profiles(id),
  branch_id uuid not null references public.branches(id),
  scheduled_at timestamptz,
  admin_notes text,
  status public.order_status not null default 'New',
  created_by uuid not null references public.profiles(id),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_matches_status check (
    (assigned_technician_id is null and status = 'New') or
    (assigned_technician_id is not null and status <> 'New')
  )
);

create table public.service_completions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  work_done text not null check (char_length(trim(work_done)) > 0),
  extra_charges numeric(12,2) not null default 0 check (extra_charges >= 0),
  final_amount numeric(12,2) not null check (final_amount >= 0),
  remarks text,
  technician_id uuid not null references public.profiles(id),
  completed_at timestamptz not null default now()
);

create table public.service_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  service_type public.service_type not null,
  title text not null check (char_length(trim(title)) > 0),
  position integer not null check (position > 0),
  required boolean not null default true,
  unique(service_type, position)
);

create table public.order_checklist_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  position integer not null check (position > 0),
  required boolean not null default true,
  completed boolean not null default false,
  note text check (note is null or char_length(note) <= 1000),
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id, position),
  check ((completed and completed_by is not null and completed_at is not null) or (not completed and completed_by is null and completed_at is null))
);
create index order_checklist_items_order_idx on public.order_checklist_items(order_id, position);

create table public.job_evidence (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  media_kind public.evidence_kind not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploader_id uuid not null references public.profiles(id),
  checklist_item_id uuid references public.order_checklist_items(id) on delete set null,
  committed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  method public.payment_method not null,
  receipt_evidence_id uuid references public.job_evidence(id),
  recorded_by uuid not null references public.profiles(id),
  received_at timestamptz not null default now()
);

create table public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  previous_scheduled_at timestamptz,
  new_scheduled_at timestamptz not null,
  reason text not null check (char_length(trim(reason)) > 0),
  actor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  outcome public.review_outcome not null,
  notes text,
  reviewer_id uuid not null references public.profiles(id),
  reviewed_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  recipient_id uuid references public.profiles(id),
  recipient_role public.app_role,
  kind public.notification_kind not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  check (recipient_id is not null or recipient_role is not null)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  action text not null,
  before_values jsonb not null default '{}'::jsonb,
  after_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.assistant_logs (
  id bigint generated always as identity primary key,
  manager_id uuid not null references public.profiles(id),
  intent text not null,
  parameters jsonb not null default '{}'::jsonb,
  result_count integer not null default 0,
  latency_ms integer not null default 0,
  error_code text,
  created_at timestamptz not null default now()
);

create index orders_status_created_idx on public.orders(status, created_at desc);
create index orders_assignee_status_idx on public.orders(assigned_technician_id, status);
create index completions_completed_idx on public.service_completions(completed_at desc);
create index schedule_events_created_idx on public.schedule_events(created_at desc);
create index notifications_recipient_idx on public.notifications(recipient_id, read_at, created_at desc);
create index audit_order_created_idx on public.audit_events(order_id, created_at);

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active $$;

create or replace function public.can_access_order(target_order uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = target_order and (
      public.current_role() in ('admin', 'manager') or
      o.assigned_technician_id = auth.uid()
    )
  )
$$;

create or replace function public.touch_order()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger orders_touch before update on public.orders for each row execute function public.touch_order();

create or replace function public.create_order(
  p_customer_name text, p_customer_phone text, p_address text,
  p_problem_description text, p_service_type public.service_type,
  p_quoted_price numeric, p_branch_id uuid, p_assigned_technician_id uuid default null,
  p_scheduled_at timestamptz default null, p_admin_notes text default null
) returns public.orders language plpgsql security definer set search_path = public as $$
declare result public.orders;
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
  return result;
end $$;

create or replace function public.assign_order(p_order_id uuid, p_technician_id uuid, p_expected_version integer)
returns public.orders language plpgsql security definer set search_path = public as $$
declare previous public.orders; result public.orders;
begin
  if public.current_role() <> 'admin' then raise exception 'Admin access required'; end if;
  select * into previous from orders where id = p_order_id for update;
  if previous.version <> p_expected_version then raise exception 'STALE_VERSION'; end if;
  if previous.status in ('Job Done','Reviewed','Closed') then raise exception 'Order can no longer be reassigned'; end if;
  if not exists(select 1 from profiles where id=p_technician_id and role='technician' and active) then raise exception 'Active technician required'; end if;
  update orders set assigned_technician_id=p_technician_id, status='Assigned', version=version+1 where id=p_order_id returning * into result;
  insert into audit_events(order_id,actor_id,action,before_values,after_values) values(p_order_id,auth.uid(),'order.assigned',to_jsonb(previous),to_jsonb(result));
  return result;
end $$;

create or replace function public.start_order(p_order_id uuid, p_expected_version integer)
returns public.orders language plpgsql security definer set search_path = public as $$
declare previous public.orders; result public.orders;
begin
  select * into previous from orders where id=p_order_id for update;
  if previous.assigned_technician_id <> auth.uid() then raise exception 'Assigned technician required'; end if;
  if previous.status <> 'Assigned' then raise exception 'Order must be Assigned'; end if;
  if previous.version <> p_expected_version then raise exception 'STALE_VERSION'; end if;
  update orders set status='In Progress',version=version+1 where id=p_order_id returning * into result;
  insert into audit_events(order_id,actor_id,action,before_values,after_values) values(p_order_id,auth.uid(),'order.started',to_jsonb(previous),to_jsonb(result));
  return result;
end $$;

create or replace function public.reschedule_order(p_order_id uuid, p_expected_version integer, p_new_time timestamptz, p_reason text)
returns public.orders language plpgsql security definer set search_path = public as $$
declare previous public.orders; result public.orders;
begin
  select * into previous from orders where id=p_order_id for update;
  if previous.assigned_technician_id <> auth.uid() or previous.status not in ('Assigned','In Progress') then raise exception 'Active assigned job required'; end if;
  if previous.version <> p_expected_version then raise exception 'STALE_VERSION'; end if;
  if p_new_time <= now() or char_length(trim(p_reason))=0 then raise exception 'Future time and reason required'; end if;
  insert into schedule_events(order_id,previous_scheduled_at,new_scheduled_at,reason,actor_id) values(p_order_id,previous.scheduled_at,p_new_time,trim(p_reason),auth.uid());
  update orders set scheduled_at=p_new_time,version=version+1 where id=p_order_id returning * into result;
  insert into audit_events(order_id,actor_id,action,before_values,after_values) values(p_order_id,auth.uid(),'order.rescheduled',to_jsonb(previous),to_jsonb(result));
  return result;
end $$;

create or replace function public.complete_order(
  p_order_id uuid, p_expected_version integer, p_work_done text, p_extra_charges numeric,
  p_remarks text default null, p_payment_amount numeric default null, p_payment_method public.payment_method default null
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
  insert into service_completions(order_id,work_done,extra_charges,final_amount,remarks,technician_id)
    values(p_order_id,trim(p_work_done),p_extra_charges,calculated,nullif(trim(p_remarks),''),auth.uid())
    on conflict(order_id) do update set work_done=excluded.work_done,extra_charges=excluded.extra_charges,final_amount=excluded.final_amount,remarks=excluded.remarks,technician_id=excluded.technician_id,completed_at=now();
  if p_payment_amount is not null then insert into payments(order_id,amount,method,recorded_by) values(p_order_id,p_payment_amount,p_payment_method,auth.uid()); end if;
  update job_evidence set committed=true where order_id=p_order_id and uploader_id=auth.uid();
  update orders set status='Job Done',version=version+1 where id=p_order_id returning * into result;
  insert into notifications(order_id,recipient_role,kind,title,body) values(p_order_id,'manager','job_done','Job ready for review',result.order_no || ' was completed.');
  insert into audit_events(order_id,actor_id,action,before_values,after_values) values(p_order_id,auth.uid(),'order.completed',to_jsonb(previous),to_jsonb(result));
  return result;
end $$;

create or replace function public.reopen_checklist_items(p_order_id uuid, p_item_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() <> 'manager' then raise exception 'Manager access required'; end if;
  if not exists(select 1 from orders where id=p_order_id and status='In Progress') then raise exception 'Returned in-progress order required'; end if;
  update order_checklist_items set completed=false,completed_by=null,completed_at=null
    where order_id=p_order_id and id=any(p_item_ids);
  insert into audit_events(order_id,actor_id,action,after_values)
    values(p_order_id,auth.uid(),'checklist.items_reopened',jsonb_build_object('itemIds',p_item_ids));
end $$;

create or replace function public.review_order(p_order_id uuid, p_expected_version integer, p_outcome public.review_outcome, p_notes text default null)
returns public.orders language plpgsql security definer set search_path = public as $$
declare previous public.orders; result public.orders;
begin
  if public.current_role() <> 'manager' then raise exception 'Manager access required'; end if;
  select * into previous from orders where id=p_order_id for update;
  if previous.status <> 'Job Done' or previous.version <> p_expected_version then raise exception 'Job Done order and current version required'; end if;
  if p_outcome='returned' and char_length(trim(coalesce(p_notes,'')))=0 then raise exception 'Return reason required'; end if;
  insert into reviews(order_id,outcome,notes,reviewer_id) values(p_order_id,p_outcome,nullif(trim(p_notes),''),auth.uid());
  update orders set status=(case when p_outcome='accepted' then 'Reviewed' else 'In Progress' end)::public.order_status,version=version+1 where id=p_order_id returning * into result;
  if p_outcome='returned' then insert into notifications(order_id,recipient_id,kind,title,body) values(p_order_id,result.assigned_technician_id,'correction_required','Correction required',coalesce(p_notes,'Please review this job.')); end if;
  insert into audit_events(order_id,actor_id,action,before_values,after_values) values(p_order_id,auth.uid(),'order.reviewed.'||p_outcome,to_jsonb(previous),to_jsonb(result));
  return result;
end $$;

create or replace function public.close_order(p_order_id uuid, p_expected_version integer)
returns public.orders language plpgsql security definer set search_path = public as $$
declare previous public.orders; result public.orders;
begin
  if public.current_role() <> 'manager' then raise exception 'Manager access required'; end if;
  select * into previous from orders where id=p_order_id for update;
  if previous.status <> 'Reviewed' or previous.version <> p_expected_version then raise exception 'Reviewed order and current version required'; end if;
  update orders set status='Closed',version=version+1 where id=p_order_id returning * into result;
  insert into audit_events(order_id,actor_id,action,before_values,after_values) values(p_order_id,auth.uid(),'order.closed',to_jsonb(previous),to_jsonb(result));
  return result;
end $$;

create or replace function public.dashboard_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  with completions as (
    select sc.*,o.assigned_technician_id,p.display_name from service_completions sc join orders o on o.id=sc.order_id join profiles p on p.id=o.assigned_technician_id
    where sc.completed_at >= p_from and sc.completed_at < p_to
  ), paid as (select coalesce(sum(amount),0) total from payments where received_at>=p_from and received_at<p_to),
  postponed as (select count(*) total from schedule_events where created_at>=p_from and created_at<p_to),
  tech as (select assigned_technician_id id,display_name,count(*) jobs,coalesce(sum(final_amount),0) amount from completions group by 1,2)
  select jsonb_build_object('jobsCompleted',(select count(*) from completions),'totalAmount',coalesce((select sum(final_amount) from completions),0),
    'paymentsReceived',(select total from paid),'outstanding',greatest(coalesce((select sum(final_amount) from completions),0)-(select total from paid),0),
    'postponements',(select total from postponed),'technicians',coalesce((select jsonb_agg(to_jsonb(tech) order by jobs desc,amount desc) from tech),'[]'::jsonb))
  where public.current_role()='manager'
$$;

create or replace function public.technician_completions(p_technician uuid, p_from timestamptz, p_to timestamptz)
returns table(order_no text, service_type public.service_type, completed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.order_no,o.service_type,sc.completed_at from orders o join service_completions sc on sc.order_id=o.id
  where public.current_role()='manager' and o.assigned_technician_id=p_technician and sc.completed_at>=p_from and sc.completed_at<p_to order by sc.completed_at desc
$$;

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.service_checklist_templates enable row level security;
alter table public.order_checklist_items enable row level security;
alter table public.service_completions enable row level security;
alter table public.job_evidence enable row level security;
alter table public.payments enable row level security;
alter table public.schedule_events enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_events enable row level security;
alter table public.assistant_logs enable row level security;

create policy "authenticated branches read" on public.branches for select to authenticated using (true);
create policy "profiles visible to authenticated" on public.profiles for select to authenticated using (true);
create policy "authorized order read" on public.orders for select to authenticated using (public.current_role() in ('admin','manager') or assigned_technician_id=auth.uid());
create policy "authenticated checklist templates read" on public.service_checklist_templates for select to authenticated using (true);
create policy "authorized checklist read" on public.order_checklist_items for select to authenticated using (public.can_access_order(order_id));
create policy "admin checklist create" on public.order_checklist_items for insert to authenticated with check (public.current_role()='admin' and public.can_access_order(order_id));
create policy "checklist item update" on public.order_checklist_items for update to authenticated using (
  public.can_access_order(order_id) and (public.current_role()='admin' or exists(select 1 from orders where id=order_id and assigned_technician_id=auth.uid() and status='In Progress'))
) with check (public.can_access_order(order_id));
create policy "admin checklist delete" on public.order_checklist_items for delete to authenticated using (public.current_role()='admin' and public.can_access_order(order_id));
create policy "authorized completion read" on public.service_completions for select to authenticated using (public.can_access_order(order_id));
create policy "authorized evidence read" on public.job_evidence for select to authenticated using (public.can_access_order(order_id));
create policy "technician evidence stage" on public.job_evidence for insert to authenticated with check (uploader_id=auth.uid() and public.can_access_order(order_id));
create policy "technician abandoned evidence cleanup" on public.job_evidence for delete to authenticated using (uploader_id=auth.uid() and not committed);
create policy "authorized payment read" on public.payments for select to authenticated using (public.can_access_order(order_id));
create policy "authorized schedule read" on public.schedule_events for select to authenticated using (public.can_access_order(order_id));
create policy "manager review read" on public.reviews for select to authenticated using (public.current_role() in ('admin','manager') or public.can_access_order(order_id));
create policy "own or role notifications" on public.notifications for select to authenticated using (recipient_id=auth.uid() or recipient_role=public.current_role());
create policy "notification read update" on public.notifications for update to authenticated using (recipient_id=auth.uid() or recipient_role=public.current_role()) with check (recipient_id=auth.uid() or recipient_role=public.current_role());
create policy "admin manager audit read" on public.audit_events for select to authenticated using (public.current_role() in ('admin','manager'));
create policy "manager assistant logs" on public.assistant_logs for select to authenticated using (manager_id=auth.uid() and public.current_role()='manager');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('job-evidence','job-evidence',false,10485760,array['image/jpeg','image/png','image/webp','video/mp4','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "job evidence object read" on storage.objects for select to authenticated
using (bucket_id='job-evidence' and public.can_access_order(((storage.foldername(name))[1])::uuid));
create policy "job evidence object upload" on storage.objects for insert to authenticated
with check (bucket_id='job-evidence' and public.can_access_order(((storage.foldername(name))[1])::uuid));
create policy "job evidence staged object cleanup" on storage.objects for delete to authenticated
using (bucket_id='job-evidence' and owner_id=auth.uid()::text);

revoke all on function public.create_order(text,text,text,text,public.service_type,numeric,uuid,uuid,timestamptz,text) from public;
grant execute on function public.create_order(text,text,text,text,public.service_type,numeric,uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.assign_order(uuid,uuid,integer), public.start_order(uuid,integer), public.reschedule_order(uuid,integer,timestamptz,text), public.complete_order(uuid,integer,text,numeric,text,numeric,public.payment_method), public.review_order(uuid,integer,public.review_outcome,text), public.close_order(uuid,integer), public.dashboard_metrics(timestamptz,timestamptz), public.technician_completions(uuid,timestamptz,timestamptz) to authenticated;
grant execute on function public.reopen_checklist_items(uuid,uuid[]) to authenticated;
