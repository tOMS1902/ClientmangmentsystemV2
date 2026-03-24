-- ─── messages table ───────────────────────────────────────────────────────────
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  sender_role  text not null check (sender_role in ('coach', 'client')),
  body         text not null check (char_length(body) > 0 and char_length(body) <= 4000),
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Index for primary access pattern: all messages in a thread, chronological
create index messages_client_id_created_at_idx
  on public.messages (client_id, created_at asc);

-- Enable RLS
alter table public.messages enable row level security;

-- ── SELECT ────────────────────────────────────────────────────────────────────
create policy "coach_select_messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

create policy "client_select_messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.clients
      where id = messages.client_id
        and user_id = auth.uid()
    )
  );

-- ── INSERT ────────────────────────────────────────────────────────────────────
create policy "coach_insert_messages"
  on public.messages for insert
  with check (
    sender_role = 'coach'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

create policy "client_insert_messages"
  on public.messages for insert
  with check (
    sender_role = 'client'
    and exists (
      select 1 from public.clients
      where id = messages.client_id
        and user_id = auth.uid()
    )
  );

-- ── UPDATE (mark-read only) ───────────────────────────────────────────────────
-- Coach can mark client messages as read
create policy "coach_markread_messages"
  on public.messages for update
  using (
    sender_role = 'client'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  )
  with check (is_read = true);

-- Client can mark coach messages as read in their own thread
create policy "client_markread_messages"
  on public.messages for update
  using (
    sender_role = 'coach'
    and exists (
      select 1 from public.clients
      where id = messages.client_id
        and user_id = auth.uid()
    )
  )
  with check (is_read = true);

-- Enable Realtime (run this in Supabase SQL editor after migration)
-- alter publication supabase_realtime add table public.messages;
