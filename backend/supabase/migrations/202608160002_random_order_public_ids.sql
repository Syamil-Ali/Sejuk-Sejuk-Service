-- Make public order ids independent random tokens instead of base64url of the
-- row UUID, so demo/seed orders get random-looking URLs too. Existing tokens
-- are regenerated in place; old derived-token links still resolve through the
-- UUID fallback in the order detail page.

update public.orders
set public_id = btrim(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_'), '=');

create or replace function public.orders_set_public_id()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.public_id is null then
    new.public_id := btrim(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_'), '=');
  end if;
  return new;
end $$;
