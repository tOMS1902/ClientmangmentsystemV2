-- Logbook entries: coach-side per-set exercise logs
create table logbook_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  exercise_id uuid references exercises(id) on delete cascade not null,
  log_date date not null default current_date,
  set_number int not null,
  weight_kg numeric,
  reps_completed int,
  created_at timestamptz default now(),
  unique(client_id, exercise_id, log_date, set_number)
);

alter table logbook_entries enable row level security;

create policy "coach_logbook_entries" on logbook_entries for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));

create policy "client_logbook_entries" on logbook_entries for select
  using (client_id in (select id from clients where user_id = auth.uid()));
