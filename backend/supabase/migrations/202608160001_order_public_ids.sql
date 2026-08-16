-- Compact, URL-safe public order identifiers.
--
-- Orders keep a UUID primary key internally; `public_id` is the short opaque
-- token exposed in URLs (base64url of the row UUID, e.g.
-- `ahawqkwbqkwuqbk112hasajk`). Existing rows are backfilled and new rows get
-- one automatically from a BEFORE INSERT trigger.

alter table public.orders add column public_id text;

update public.orders
set public_id = btrim(translate(encode(uuid_send(id), 'base64'), '+/', '-_'), '=');

alter table public.orders
  alter column public_id set not null,
  add constraint orders_public_id_key unique (public_id);

create or replace function public.orders_set_public_id()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.public_id is null then
    new.public_id := btrim(translate(encode(uuid_send(new.id), 'base64'), '+/', '-_'), '=');
  end if;
  return new;
end $$;

create trigger orders_set_public_id
  before insert on public.orders
  for each row execute function public.orders_set_public_id();

revoke all on function public.orders_set_public_id() from public;
