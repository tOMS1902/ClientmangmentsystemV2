-- Create private storage bucket for E2EE chat images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-images',
  'chat-images',
  false,                           -- private — no public URLs
  10485760,                        -- 10 MB per file
  array['application/octet-stream'] -- encrypted blobs only
)
on conflict (id) do nothing;

-- ── RLS for storage.objects ───────────────────────────────────────────────────

-- Coaches can upload/download images for their own clients
-- Path format: {clientId}/{uuid}.enc  →  foldername[1] is the clientId
create policy "coach_images_select"
  on storage.objects for select
  using (
    bucket_id = 'chat-images'
    and exists (
      select 1 from public.clients
      where id::text = (storage.foldername(name))[1]
        and coach_id = auth.uid()
    )
  );

create policy "coach_images_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-images'
    and exists (
      select 1 from public.clients
      where id::text = (storage.foldername(name))[1]
        and coach_id = auth.uid()
    )
  );

-- Clients can upload/download images only in their own thread folder
create policy "client_images_select"
  on storage.objects for select
  using (
    bucket_id = 'chat-images'
    and exists (
      select 1 from public.clients
      where id::text = (storage.foldername(name))[1]
        and user_id = auth.uid()
    )
  );

create policy "client_images_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-images'
    and exists (
      select 1 from public.clients
      where id::text = (storage.foldername(name))[1]
        and user_id = auth.uid()
    )
  );
