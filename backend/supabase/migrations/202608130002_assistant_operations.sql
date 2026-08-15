create or replace function public.write_assistant_audit_event(
  p_actor_role public.app_role,
  p_correlation_id uuid,
  p_policy_outcome text,
  p_tool_names text[],
  p_source_ids text[],
  p_latency_ms integer,
  p_completion_status text,
  p_error_code text default null
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.assistant_audit_events(
    actor_id, actor_role, correlation_id, policy_outcome, tool_names, source_ids,
    latency_ms, completion_status, error_code, retention_until
  ) values (
    auth.uid(), p_actor_role, p_correlation_id, p_policy_outcome,
    coalesce(p_tool_names, '{}'), coalesce(p_source_ids, '{}'), greatest(p_latency_ms, 0),
    left(p_completion_status, 80), left(p_error_code, 80), now() + interval '365 days'
  );
end
$$;

create or replace function public.cleanup_expired_assistant_data()
returns table(deleted_threads bigint, anonymized_audits bigint)
language plpgsql security definer set search_path = public
as $$
declare thread_count bigint; audit_count bigint;
begin
  delete from public.assistant_threads where retention_until <= now();
  get diagnostics thread_count = row_count;
  update public.assistant_audit_events
    set source_ids = '{}', safe_parameters = '{}', usage_metadata = '{}', error_code = null
    where retention_until <= now() and (source_ids <> '{}' or safe_parameters <> '{}' or usage_metadata <> '{}');
  get diagnostics audit_count = row_count;
  return query select thread_count, audit_count;
end
$$;

revoke all on function public.write_assistant_audit_event(public.app_role, uuid, text, text[], text[], integer, text, text) from public;
grant execute on function public.write_assistant_audit_event(public.app_role, uuid, text, text[], text[], integer, text, text) to authenticated;
revoke all on function public.cleanup_expired_assistant_data() from public, anon, authenticated;
grant execute on function public.cleanup_expired_assistant_data() to service_role;
