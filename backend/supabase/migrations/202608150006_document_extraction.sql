-- AI document understanding: persist extracted fields on the document version
-- and mark the document ready so authorized staff can view it. Extraction is
-- performed by the Agno service; this RPC is the audited write path.

create or replace function public.save_document_extraction(
  p_document_id uuid,
  p_fields jsonb,
  p_confidence jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare target_checksum text; next_version integer;
begin
  if public.current_role() not in ('admin', 'manager') then
    raise exception 'Admin or manager access required';
  end if;
  if jsonb_typeof(p_fields) <> 'object' or jsonb_typeof(p_confidence) <> 'object' then
    raise exception 'Extraction payload must be JSON objects';
  end if;
  if not exists (
    select 1 from public.assistant_documents d
    where d.id = p_document_id
      and (d.created_by = auth.uid() or public.can_access_assistant_document(d.id))
  ) then raise exception 'Document is not accessible'; end if;
  select checksum_sha256 into target_checksum
  from public.assistant_documents where id = p_document_id;
  if target_checksum is null then raise exception 'Document not found'; end if;
  if exists (
    select 1 from public.assistant_document_versions
    where document_id = p_document_id and checksum_sha256 = target_checksum
  ) then
    update public.assistant_document_versions
    set extraction_metadata = jsonb_build_object(
      'fields', p_fields, 'confidence', p_confidence, 'extracted_at', now()
    )
    where document_id = p_document_id and checksum_sha256 = target_checksum;
  else
    select coalesce(max(version), 0) + 1 into next_version
    from public.assistant_document_versions where document_id = p_document_id;
    insert into public.assistant_document_versions(document_id, version, checksum_sha256, extraction_metadata)
    values (p_document_id, next_version, target_checksum,
      jsonb_build_object('fields', p_fields, 'confidence', p_confidence, 'extracted_at', now()));
  end if;
  update public.assistant_documents set status = 'ready', updated_at = now()
  where id = p_document_id;
end $$;

-- The uploader can always see their own pending document while it is being
-- processed; managers see ready documents through the existing policy.
create policy assistant_documents_creator_select on public.assistant_documents
for select to authenticated using (created_by = auth.uid());

revoke all on function public.save_document_extraction(uuid, jsonb, jsonb) from public;
grant execute on function public.save_document_extraction(uuid, jsonb, jsonb) to authenticated;
