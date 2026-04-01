create extension if not exists "uuid-ossp";

-- Profiles
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('coach', 'client')) not null default 'client',
  full_name text,
  email text,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

-- Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  coach_id uuid references profiles(id) not null,
  full_name text not null,
  email text,
  phone text,
  start_date date,
  goal_weight numeric,
  start_weight numeric,
  current_weight numeric,
  goal_text text,
  check_in_day text,
  is_active boolean default true,
  portal_access boolean default false,
  track_weight boolean default true,
  created_at timestamptz default now()
);

-- Onboarding
create table onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references profiles(id) on delete cascade unique,
  responses jsonb not null,
  created_at timestamptz default now()
);

-- Nutrition targets
create table nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade unique,
  td_calories int, td_protein int, td_carbs int, td_fat int,
  ntd_calories int, ntd_protein int, ntd_carbs int, ntd_fat int,
  daily_steps int,
  sleep_target_hours numeric,
  updated_at timestamptz default now()
);

-- Midweek checks
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

-- Weekly check-ins
create table weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  week_number int,
  check_in_date date,
  weight numeric,
  week_summary text,
  sleep_summary text,
  biggest_win text,
  diet_summary text,
  training_sessions text,
  energy_summary text,
  main_challenge text,
  focus_next_week text,
  improve_next_week text,
  coach_support text,
  avg_steps text,
  anything_else text,
  coach_notes text,
  created_at timestamptz default now(),
  unique(client_id, week_number)
);

-- Programmes
create table programmes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table programme_days (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid references programmes(id) on delete cascade,
  day_number int,
  day_label text,
  sort_order int
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid references programme_days(id) on delete cascade,
  name text,
  sets int,
  reps text,
  rest_seconds int,
  video_url text,
  notes text,
  sort_order int
);

-- Session logs
create table session_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  programme_day_id uuid references programme_days(id) on delete set null,
  day_label text,
  log_date date not null default current_date,
  exercises_logged jsonb default '[]',
  completed boolean default false,
  created_at timestamptz default now()
);

-- Habits
create table habits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  log_date date not null,
  completed boolean default false,
  unique(habit_id, log_date)
);

-- Meal plans
create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  day_type text check (day_type in ('training', 'rest')) not null,
  name text,
  meals jsonb not null default '[]',
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(client_id, day_type)
);

-- Supplements
create table supplements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  dose text not null,
  timing text not null,
  notes text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
alter table clients enable row level security;
alter table onboarding_responses enable row level security;
alter table nutrition_targets enable row level security;
alter table midweek_checks enable row level security;
alter table weekly_checkins enable row level security;
alter table programmes enable row level security;
alter table programme_days enable row level security;
alter table exercises enable row level security;
alter table session_logs enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table meal_plans enable row level security;
alter table supplements enable row level security;

-- Profiles: users can read own
create policy "own_profile" on profiles for all using (id = auth.uid());

-- Coach: full access to all client data
create policy "coach_clients" on clients for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));
create policy "coach_onboarding" on onboarding_responses for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));
create policy "coach_targets" on nutrition_targets for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));
create policy "coach_midweek_checks" on midweek_checks for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));
create policy "coach_checkins" on weekly_checkins for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));
create policy "coach_programmes" on programmes for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));
create policy "coach_days" on programme_days for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));
create policy "coach_exercises" on exercises for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));
create policy "coach_session_logs" on session_logs for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));
create policy "coach_habits" on habits for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));
create policy "coach_habit_logs" on habit_logs for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));
create policy "coach_meal_plans" on meal_plans for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));

-- Client: own data only
create policy "client_own_record" on clients for select
  using (user_id = auth.uid());
create policy "client_onboarding" on onboarding_responses for all
  using (client_id = auth.uid());
create policy "client_midweek_checks" on midweek_checks for all
  using (client_id in (select id from clients where user_id = auth.uid()));
create policy "client_checkins" on weekly_checkins for all
  using (client_id in (select id from clients where user_id = auth.uid()));
create policy "client_targets" on nutrition_targets for select
  using (client_id in (select id from clients where user_id = auth.uid()));
create policy "client_programmes" on programmes for select
  using (client_id in (select id from clients where user_id = auth.uid()));
create policy "client_days" on programme_days for select
  using (programme_id in (
    select id from programmes where client_id in (
      select id from clients where user_id = auth.uid()
    )
  ));
create policy "client_exercises" on exercises for select
  using (day_id in (
    select id from programme_days where programme_id in (
      select id from programmes where client_id in (
        select id from clients where user_id = auth.uid()
      )
    )
  ));
create policy "client_session_logs" on session_logs for all
  using (client_id in (select id from clients where user_id = auth.uid()));
create policy "client_habits" on habits for select
  using (client_id in (select id from clients where user_id = auth.uid()));
create policy "client_habit_logs" on habit_logs for all
  using (client_id in (select id from clients where user_id = auth.uid()));
create policy "client_meal_plans" on meal_plans for select
  using (client_id in (select id from clients where user_id = auth.uid()));
create policy "coach_supplements" on supplements for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'coach'));
create policy "client_supplements" on supplements for select
  using (client_id in (select id from clients where user_id = auth.uid()));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
