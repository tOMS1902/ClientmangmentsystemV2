-- Drop daily logs table
drop table if exists daily_logs cascade;

-- Create midweek checks table
create table midweek_checks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  coach_id uuid references profiles(id) on delete set null,
  submitted_at timestamptz default now(),
  week_number int not null,
  current_weight numeric,
  training_on_track text check (training_on_track in ('yes', 'slightly_off', 'off')) not null,
  food_on_track text check (food_on_track in ('yes', 'slightly_off', 'off')) not null,
  energy_level int check (energy_level between 1 and 5) not null,
  steps_on_track boolean not null,
  biggest_blocker text,
  unique(client_id, week_number)
);

alter table midweek_checks enable row level security;

create policy "coach_midweek_checks" on midweek_checks for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));

create policy "client_midweek_checks" on midweek_checks for all
  using (client_id in (select id from clients where user_id = auth.uid()));
