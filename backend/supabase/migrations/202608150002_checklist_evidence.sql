-- The assigned technician can detach proof from a checklist item while the
-- job is in progress. The row is removed here; the caller then removes the
-- storage object through the Storage API (direct storage table deletes are
-- blocked by Supabase).
create or replace function public.remove_checklist_evidence(p_order_id uuid, p_evidence_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare target public.job_evidence;
begin
  select * into target from public.job_evidence where id = p_evidence_id for update;
  if target.id is null then return; end if;
  if target.order_id <> p_order_id or target.checklist_item_id is null then
    raise exception 'Evidence does not belong to this checklist';
  end if;
  if target.uploader_id <> auth.uid() then
    raise exception 'Only the uploader can remove evidence';
  end if;
  if public.current_role() <> 'technician'::public.app_role or not exists (
    select 1 from public.orders
    where id = p_order_id and assigned_technician_id = auth.uid() and status = 'In Progress'
  ) then
    raise exception 'Not authorized';
  end if;
  delete from public.job_evidence where id = p_evidence_id;
end $$;

revoke all on function public.remove_checklist_evidence(uuid, uuid) from public;
grant execute on function public.remove_checklist_evidence(uuid, uuid) to authenticated;
