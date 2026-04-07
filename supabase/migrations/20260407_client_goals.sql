create table if not exists client_goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  event_name text not null,
  event_date date not null,
  created_at timestamptz not null default now()
);

alter table client_goals enable row level security;

create policy "Coach can manage their clients goals" on client_goals
  for all using (
    exists (
      select 1 from clients c
      where c.id = client_goals.client_id
        and c.coach_id = auth.uid()
    )
  );

create policy "Client can view own goals" on client_goals
  for select using (
    exists (
      select 1 from clients c
      where c.id = client_goals.client_id
        and c.user_id = auth.uid()
    )
  );
