create table client_milestones (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  label text not null,
  is_unlocked boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz default now()
);

alter table client_milestones enable row level security;

-- Coaches can manage milestones for their clients
create policy "coaches manage milestones"
  on client_milestones for all
  using (
    exists (
      select 1 from clients c
      join profiles p on p.id = auth.uid()
      where c.id = client_milestones.client_id
        and (c.coach_id = auth.uid() or p.role = 'coach')
    )
  );

-- Clients can read their own milestones
create policy "clients read own milestones"
  on client_milestones for select
  using (
    exists (
      select 1 from clients c
      where c.id = client_milestones.client_id
        and c.user_id = auth.uid()
    )
  );
