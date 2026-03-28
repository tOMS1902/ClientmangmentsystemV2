-- ─── check_in_photos table ───────────────────────────────────────────────────
create table public.check_in_photos (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  check_in_id     uuid references public.weekly_checkins(id) on delete set null,
  week_number     integer not null,
  photo_type      text not null check (photo_type in ('front', 'back')),
  storage_path    text not null,
  file_size_bytes integer,
  uploaded_by     text not null check (uploaded_by in ('client', 'coach')),
  created_at      timestamptz not null default now()
);

-- Index for primary access pattern: all photos for a client by week
create index check_in_photos_client_week_idx
  on public.check_in_photos (client_id, week_number);

-- Index for lookups by client alone
create index check_in_photos_client_id_idx
  on public.check_in_photos (client_id);

-- Enable RLS
alter table public.check_in_photos enable row level security;

-- ── SELECT ────────────────────────────────────────────────────────────────────
create policy "client_select_own_photos"
  on public.check_in_photos for select
  using (
    exists (
      select 1 from public.clients
      where id = check_in_photos.client_id
        and user_id = auth.uid()
    )
  );

create policy "coach_select_client_photos"
  on public.check_in_photos for select
  using (
    exists (
      select 1 from public.clients
      where id = check_in_photos.client_id
        and coach_id = auth.uid()
    )
  );

-- ── INSERT ────────────────────────────────────────────────────────────────────
create policy "client_insert_own_photos"
  on public.check_in_photos for insert
  with check (
    uploaded_by = 'client'
    and exists (
      select 1 from public.clients
      where id = check_in_photos.client_id
        and user_id = auth.uid()
    )
  );

create policy "coach_insert_client_photos"
  on public.check_in_photos for insert
  with check (
    uploaded_by = 'coach'
    and exists (
      select 1 from public.clients
      where id = check_in_photos.client_id
        and coach_id = auth.uid()
    )
  );

-- ── DELETE ────────────────────────────────────────────────────────────────────
create policy "client_delete_own_photos"
  on public.check_in_photos for delete
  using (
    exists (
      select 1 from public.clients
      where id = check_in_photos.client_id
        and user_id = auth.uid()
    )
  );

create policy "coach_delete_client_photos"
  on public.check_in_photos for delete
  using (
    exists (
      select 1 from public.clients
      where id = check_in_photos.client_id
        and coach_id = auth.uid()
    )
  );

-- Storage bucket: create 'progress-photos' as a private bucket in Supabase dashboard
-- or via: insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false);
-- Storage RLS: coach and client access scoped to their own client_id in the path
