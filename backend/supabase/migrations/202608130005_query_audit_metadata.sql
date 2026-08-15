create or replace function public.write_assistant_query_audit_event(
  p_actor_role public.app_role,
  p_correlation_id uuid,
  p_policy_outcome text,
  p_tool_names text[],
  p_source_ids text[],
  p_latency_ms integer,
  p_completion_status text,
  p_safe_parameters jsonb default '{}'::jsonb,
  p_error_code text default null
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.assistant_audit_events(
    actor_id, actor_role, correlation_id, policy_outcome, tool_names, safe_parameters,
    source_ids, latency_ms, completion_status, error_code, retention_until
  ) values (
    auth.uid(), p_actor_role, p_correlation_id, p_policy_outcome,
    coalesce(p_tool_names, '{}'), coalesce(p_safe_parameters, '{}'::jsonb),
    coalesce(p_source_ids, '{}'), greatest(p_latency_ms, 0),
    left(p_completion_status, 80), left(p_error_code, 80), now() + interval '365 days'
  );
end
$$;

revoke all on function public.write_assistant_query_audit_event(
  public.app_role, uuid, text, text[], text[], integer, text, jsonb, text
) from public, anon;
grant execute on function public.write_assistant_query_audit_event(
  public.app_role, uuid, text, text[], text[], integer, text, jsonb, text
) to authenticated;
