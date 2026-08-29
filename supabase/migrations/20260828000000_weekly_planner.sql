-- Weekly Planner tables
-- 5 tables: weekly_plans, weekly_plan_days, weekly_plan_items, weekly_plan_templates, weekly_plan_changes

-- ─── weekly_plans ────────────────────────────────────────────────────────────
create table if not exists weekly_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  coach_id uuid not null references profiles(id),
  week_start_date date not null,
  week_number int not null default 1,
  coach_message text,
  status text not null default 'draft' check (status in ('draft', 'published', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, week_start_date)
);

create index idx_weekly_plans_client_week on weekly_plans (client_id, week_start_date);

-- ─── weekly_plan_days ────────────────────────────────────────────────────────
create table if not exists weekly_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references weekly_plans(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  programme_day_id uuid references programme_days(id) on delete set null,
  day_type text not null default 'rest' check (day_type in ('training', 'rest', 'off')),
  nutrition_type text not null default 'rest' check (nutrition_type in ('training', 'rest')),
  step_target int,
  notes text,
  
  created_at timestamptz not null default now(),
  unique (plan_id, day_of_week)
);

create index idx_weekly_plan_days_plan on weekly_plan_days (plan_id);

-- ─── weekly_plan_items ───────────────────────────────────────────────────────
create table if not exists weekly_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references weekly_plan_days(id) on delete cascade,
  item_type text not null check (item_type in ('training', 'cardio', 'steps', 'nutrition', 'habit', 'custom')),
  title text not null,
  description text,
  target text,
  session_log_id uuid references session_logs(id) on delete set null,
  programme_day_id uuid references programme_days(id) on delete set null,
  completed boolean not null default false,
  completed_by text check (completed_by in ('client', 'coach', 'auto')),
  completed_at timestamptz,
  moved_from_day int,
  moved_by text check (moved_by in ('client', 'coach')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_weekly_plan_items_day on weekly_plan_items (plan_day_id);
create index idx_weekly_plan_items_session on weekly_plan_items (session_log_id);

-- ─── weekly_plan_templates ───────────────────────────────────────────────────
create table if not exists weekly_plan_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  template_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── weekly_plan_changes ─────────────────────────────────────────────────────
create table if not exists weekly_plan_changes (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references weekly_plans(id) on delete cascade,
  changed_by uuid not null references profiles(id),
  change_type text not null check (change_type in ('move', 'complete', 'skip', 'add', 'delete', 'edit', 'status')),
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_weekly_plan_changes_plan on weekly_plan_changes (plan_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table weekly_plans enable row level security;
alter table weekly_plan_days enable row level security;
alter table weekly_plan_items enable row level security;
alter table weekly_plan_templates enable row level security;
alter table weekly_plan_changes enable row level security;

-- Coaches: full access to plans for their clients
create policy "Coaches can manage weekly plans"
  on weekly_plans for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Clients: read plans where they are the client
create policy "Clients can read their plans"
  on weekly_plans for select
  using (
    exists (
      select 1 from clients c
      where c.id = weekly_plans.client_id
      and c.user_id = auth.uid()
    )
  );

-- Plan days: coaches via plan ownership
create policy "Coaches can manage plan days"
  on weekly_plan_days for all
  using (
    exists (
      select 1 from weekly_plans wp
      where wp.id = weekly_plan_days.plan_id
      and wp.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from weekly_plans wp
      where wp.id = weekly_plan_days.plan_id
      and wp.coach_id = auth.uid()
    )
  );

-- Clients: read plan days
create policy "Clients can read plan days"
  on weekly_plan_days for select
  using (
    exists (
      select 1 from weekly_plans wp
      join clients c on c.id = wp.client_id
      where wp.id = weekly_plan_days.plan_id
      and c.user_id = auth.uid()
    )
  );

-- Plan items: coaches full access
create policy "Coaches can manage plan items"
  on weekly_plan_items for all
  using (
    exists (
      select 1 from weekly_plan_days wpd
      join weekly_plans wp on wp.id = wpd.plan_id
      where wpd.id = weekly_plan_items.plan_day_id
      and wp.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from weekly_plan_days wpd
      join weekly_plans wp on wp.id = wpd.plan_id
      where wpd.id = weekly_plan_items.plan_day_id
      and wp.coach_id = auth.uid()
    )
  );

-- Clients: read + update items (complete/move)
create policy "Clients can read plan items"
  on weekly_plan_items for select
  using (
    exists (
      select 1 from weekly_plan_days wpd
      join weekly_plans wp on wp.id = wpd.plan_id
      join clients c on c.id = wp.client_id
      where wpd.id = weekly_plan_items.plan_day_id
      and c.user_id = auth.uid()
    )
  );

create policy "Clients can update plan items"
  on weekly_plan_items for update
  using (
    exists (
      select 1 from weekly_plan_days wpd
      join weekly_plans wp on wp.id = wpd.plan_id
      join clients c on c.id = wp.client_id
      where wpd.id = weekly_plan_items.plan_day_id
      and c.user_id = auth.uid()
    )
  );

-- Templates: coach-private
create policy "Coaches own templates"
  on weekly_plan_templates for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Changes: coaches read all for their plans; clients insert + read
create policy "Coaches can manage plan changes"
  on weekly_plan_changes for all
  using (
    exists (
      select 1 from weekly_plans wp
      where wp.id = weekly_plan_changes.plan_id
      and wp.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from weekly_plans wp
      where wp.id = weekly_plan_changes.plan_id
      and wp.coach_id = auth.uid()
    )
  );

create policy "Clients can read plan changes"
  on weekly_plan_changes for select
  using (
    exists (
      select 1 from weekly_plans wp
      join clients c on c.id = wp.client_id
      where wp.id = weekly_plan_changes.plan_id
      and c.user_id = auth.uid()
    )
  );

create policy "Clients can insert plan changes"
  on weekly_plan_changes for insert
  with check (
    exists (
      select 1 from weekly_plans wp
      join clients c on c.id = wp.client_id
      where wp.id = weekly_plan_changes.plan_id
      and c.user_id = auth.uid()
    )
    and changed_by = auth.uid()
  );
