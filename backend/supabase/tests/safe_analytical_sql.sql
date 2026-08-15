begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

select extensions.has_view('public', 'assistant_analytics_orders', 'orders analytics view exists');
select extensions.has_view('public', 'assistant_analytics_completions', 'completion analytics view exists');
select extensions.has_view('public', 'assistant_analytics_payments', 'payment analytics view exists');
select extensions.has_function(
  'public', 'execute_assistant_analytical_query', array['text', 'integer', 'integer'],
  'caller-bound analytical RPC exists'
);
select extensions.ok(not exists(
  select 1 from information_schema.routine_privileges
  where routine_schema='public'
    and routine_name='execute_assistant_analytical_query'
    and grantee in ('PUBLIC', 'anon')
), 'analytical RPC is unavailable to PUBLIC and anon');

select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
set local role authenticated;
select extensions.is(
  (public.execute_assistant_analytical_query(
    'select order_no from assistant_analytics_orders order by order_no', 100, 3000
  )->>'rowCount')::integer,
  1,
  'Ali sees only Ali assigned orders without an explicit ownership predicate'
);
select extensions.is(
  (public.execute_assistant_analytical_query(
    $$select order_no from assistant_analytics_orders where order_no='ORDER001237'$$, 100, 3000
  )->>'rowCount')::integer,
  0,
  'Ali cannot discover John order by direct identifier'
);
select extensions.is(
  (public.execute_assistant_analytical_query(
    'select o.order_no, c.final_amount from assistant_analytics_orders o left join assistant_analytics_completions c on c.order_id=o.order_id',
    100, 3000
  )->>'rowCount')::integer,
  1,
  'Ali cross-relation join remains caller scoped'
);
select extensions.throws_ok(
  $$select public.execute_assistant_analytical_query('delete from orders',100,3000)$$,
  '22023',
  'read-only select required',
  'mutation is rejected by RPC'
);
select extensions.throws_ok(
  $$select public.execute_assistant_analytical_query('select order_no from assistant_analytics_orders; select 1',100,3000)$$,
  '22023',
  'read-only select required',
  'multiple statements are rejected by RPC'
);
reset role;

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000004',true);
set local role authenticated;
select extensions.is(
  (public.execute_assistant_analytical_query(
    'select order_no from assistant_analytics_orders order by order_no', 100, 3000
  )->>'rowCount')::integer,
  1,
  'John sees only John assigned orders'
);
select extensions.is(
  (public.execute_assistant_analytical_query(
    $$select order_no from assistant_analytics_orders where order_no='ORDER001234'$$, 100, 3000
  )->>'rowCount')::integer,
  0,
  'John cannot discover Ali order by direct identifier'
);
reset role;

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select extensions.is(
  (public.execute_assistant_analytical_query(
    'select order_no from assistant_analytics_orders order by order_no', 100, 3000
  )->>'rowCount')::integer,
  3,
  'Manager can run organization order analytics'
);
select extensions.is(
  (public.execute_assistant_analytical_query(
    'select o.order_no, coalesce(sum(p.amount),0) as paid from assistant_analytics_orders o left join assistant_analytics_payments p on p.order_id=o.order_id group by o.order_no',
    100, 3000
  )->>'rowCount')::integer,
  3,
  'Manager can run approved multi-table aggregate analytics'
);
select extensions.ok(
  (public.execute_assistant_analytical_query(
    'select order_no from assistant_analytics_orders order by order_no', 1, 3000
  )->>'truncated')::boolean,
  'RPC enforces row bounds and reports truncation'
);
reset role;

select set_config('request.jwt.claim.sub','',true);
set local role authenticated;
select extensions.throws_ok(
  $$select public.execute_assistant_analytical_query('select order_no from assistant_analytics_orders',100,3000)$$,
  '42501',
  'authentication required',
  'unauthenticated execution is rejected'
);
reset role;

select extensions.ok(
  (select reloptions @> array['security_barrier=true','security_invoker=true']
   from pg_class where oid='public.assistant_analytics_orders'::regclass),
  'analytics views preserve invoker RLS and security barrier'
);

select * from extensions.finish();
rollback;
