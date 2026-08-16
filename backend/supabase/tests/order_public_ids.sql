begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

select extensions.has_column('public', 'orders', 'public_id', 'orders have a public id column');
select extensions.ok(
  (select is_nullable = 'NO'
   from information_schema.columns
   where table_schema = 'public' and table_name = 'orders' and column_name = 'public_id'),
  'public id is required'
);
select extensions.ok(
  exists(
    select 1
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'public.orders'::regclass
      and c.contype = 'u'
      and a.attname = 'public_id'
  ),
  'public id is unique'
);
select extensions.ok(
  (select bool_and(char_length(public_id) = 22) from public.orders),
  'all orders have 22-char public ids'
);
select extensions.ok(
  (select count(distinct public_id) = count(*) from public.orders),
  'public ids are distinct across rows'
);

insert into public.orders(
  id, customer_name, customer_phone, address, problem_description,
  service_type, quoted_price, branch_id, created_by
)
values (
  gen_random_uuid(), 'Public ID Test', '60120000000', '1, Test Road',
  'Test issue', 'Cleaning', 99,
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001'
);

select extensions.is(
  (select char_length(public_id) from public.orders where customer_name = 'Public ID Test'),
  22,
  'trigger assigns a public id to new orders'
);

select extensions.finish();
rollback;
