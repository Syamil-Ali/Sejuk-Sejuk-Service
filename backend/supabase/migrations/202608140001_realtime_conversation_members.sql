create or replace function public.populate_conversation_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The creator must always remain a member, including announcements aimed at
  -- a role different from their own.
  insert into conversation_members(conversation_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;

  if new.kind = 'order' then
    insert into conversation_members(conversation_id, user_id)
    select new.id, p.id
    from profiles p
    where p.active
      and (
        p.role in ('admin', 'manager')
        or p.id = (
          select assigned_technician_id from orders where id = new.order_id
        )
      )
    on conflict do nothing;
  elsif new.kind = 'announcement' then
    insert into conversation_members(conversation_id, user_id)
    select new.id, p.id
    from profiles p
    where p.active
      and (new.audience_role is null or p.role = new.audience_role)
    on conflict do nothing;
  elsif new.kind = 'direct' then
    insert into conversation_members(conversation_id, user_id)
    select new.id, member_id::uuid
    from unnest(string_to_array(new.direct_key, ':')) member_id
    on conflict do nothing;
  end if;

  return new;
end
$$;

-- RLS remains the authorization boundary; these grants only allow authenticated
-- clients to attempt the operations covered by the policies above.
grant select, insert on public.conversations to authenticated;
grant select, insert, update on public.conversation_members to authenticated;
grant select, insert, update on public.messages to authenticated;
grant select, insert on public.message_attachments to authenticated;
