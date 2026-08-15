-- Allow photo invoices, receipts and client forms in the assistant document
-- bucket (JPG/PNG/WebP) alongside the existing office formats.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values(
  'assistant-documents', 'assistant-documents', false, 26214400,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict(id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
