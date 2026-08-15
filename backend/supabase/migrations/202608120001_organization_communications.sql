create type public.conversation_kind as enum ('order', 'direct', 'announcement');
create type public.notification_priority as enum ('normal', 'high');

alter table public.notifications add column if not exists category text not null default 'order';
alter table public.notifications add column if not exists priority public.notification_priority not null default 'normal';
alter table public.notifications add column if not exists href text;
alter table public.notifications add column if not exists dedupe_key text;
create unique index if not exists notifications_recipient_dedupe_idx on public.notifications(recipient_id, dedupe_key) where dedupe_key is not null;

create table public.conversations (
  id uuid primary key default gen_random_uuid(), kind public.conversation_kind not null,
  title text not null check (char_length(trim(title)) between 1 and 100),
  order_id uuid unique references public.orders(id) on delete cascade,
  direct_key text unique, audience_role public.app_role, created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check ((kind='order' and order_id is not null) or (kind='direct' and direct_key is not null) or kind='announcement')
);
create table public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  last_read_at timestamptz, joined_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id), body text not null check (char_length(trim(body)) between 1 and 2000),
  mentions uuid[] not null default '{}', created_at timestamptz not null default now(), edited_at timestamptz, deleted_at timestamptz
);
create table public.message_attachments (
  id uuid primary key default gen_random_uuid(), message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null unique, file_name text not null, mime_type text not null,
  size_bytes bigint not null check(size_bytes between 1 and 10485760), created_at timestamptz not null default now()
);

create or replace function public.populate_conversation_members()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.kind='order' then
    insert into conversation_members(conversation_id,user_id)
    select new.id,p.id from profiles p
    where p.active and (p.role in ('admin','manager') or p.id=(select assigned_technician_id from orders where id=new.order_id))
    on conflict do nothing;
  elsif new.kind='announcement' then
    insert into conversation_members(conversation_id,user_id)
    select new.id,p.id from profiles p where p.active and (new.audience_role is null or p.role=new.audience_role)
    on conflict do nothing;
  elsif new.kind='direct' then
    insert into conversation_members(conversation_id,user_id)
    select new.id,member_id::uuid from unnest(string_to_array(new.direct_key,':')) member_id
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger conversations_populate_members after insert on public.conversations
for each row execute function public.populate_conversation_members();

create or replace function public.sync_order_conversation_technician()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_conversation uuid;
begin
  if old.assigned_technician_id is distinct from new.assigned_technician_id then
    select id into target_conversation from conversations where order_id=new.id;
    if target_conversation is not null then
      delete from conversation_members cm using profiles p
      where cm.conversation_id=target_conversation and cm.user_id=p.id and p.role='technician';
      if new.assigned_technician_id is not null then
        insert into conversation_members(conversation_id,user_id) values(target_conversation,new.assigned_technician_id)
        on conflict do nothing;
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger orders_sync_conversation_technician after update of assigned_technician_id on public.orders
for each row execute function public.sync_order_conversation_technician();
create index messages_conversation_created_idx on public.messages(conversation_id,created_at desc);
create index conversation_members_user_idx on public.conversation_members(user_id,conversation_id);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;

create or replace function public.is_conversation_member(target uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from conversation_members where conversation_id=target and user_id=auth.uid())
$$;
create policy conversations_select on public.conversations for select using (public.is_conversation_member(id));
create policy conversations_insert on public.conversations for insert with check (
  created_by=auth.uid() and (
    kind='direct' or
    (kind='announcement' and public.current_role() in ('admin','manager')) or
    (kind='order' and public.can_access_order(order_id))
  )
);
create policy members_select on public.conversation_members for select using (public.is_conversation_member(conversation_id));
create policy members_insert on public.conversation_members for insert with check (
  exists(select 1 from public.conversations c where c.id=conversation_id and c.created_by=auth.uid())
);
create policy members_update_read on public.conversation_members for update using (user_id=auth.uid()) with check(user_id=auth.uid());
create policy messages_select on public.messages for select using (public.is_conversation_member(conversation_id));
create policy messages_insert on public.messages for insert with check(sender_id=auth.uid() and public.is_conversation_member(conversation_id));
create policy messages_update_own on public.messages for update using(sender_id=auth.uid()) with check(sender_id=auth.uid());
create policy attachments_select on public.message_attachments for select using(exists(select 1 from messages m where m.id=message_id and public.is_conversation_member(m.conversation_id)));
create policy attachments_insert on public.message_attachments for insert with check(exists(select 1 from messages m where m.id=message_id and m.sender_id=auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('message-attachments','message-attachments',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;
create policy message_attachment_objects_select on storage.objects for select using (
  bucket_id='message-attachments' and exists(
    select 1 from public.message_attachments a join public.messages m on m.id=a.message_id
    where a.storage_path=name and public.is_conversation_member(m.conversation_id)
  )
);
create policy message_attachment_objects_insert on storage.objects for insert with check (
  bucket_id='message-attachments' and auth.uid() is not null
);

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_members;
