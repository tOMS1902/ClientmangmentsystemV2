-- ─── diagnostics migration ────────────────────────────────────────────────────
-- Creates three tables for blood work and genetics diagnostic reports:
--   diagnostic_reports   — top-level report record per client
--   diagnostic_markers   — individual biomarker readings within a report
--   diagnostic_insights  — coach-authored insight cards attached to a report
-- Includes RLS policies scoped to the owning coach and (for published reports)
-- the linked client, plus an updated_at trigger on diagnostic_reports.
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── diagnostic_reports ───────────────────────────────────────────────────────
create table public.diagnostic_reports (
  id                uuid        primary key default gen_random_uuid(),
  client_id         uuid        not null references public.clients(id) on delete cascade,
  coach_id          uuid        not null references public.profiles(id),
  report_type       text        not null default 'bloodwork' check (report_type in ('bloodwork', 'genetics')),
  report_title      text        not null default 'Blood Diagnostics Report',
  report_date       date        not null,
  lab_source        text        not null default '',
  health_score      integer     not null default 0,
  coach_summary     text        not null default '',
  loom_url          text        not null default '',
  loom_description  text        not null default '',
  action_nutrition  text        not null default '',
  action_training   text        not null default '',
  action_recovery   text        not null default '',
  action_supplements text       not null default '',
  action_followup   text        not null default '',
  pdf_file_url      text        not null default '',
  status            text        not null default 'draft' check (status in ('draft', 'published')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── diagnostic_markers ───────────────────────────────────────────────────────
create table public.diagnostic_markers (
  id                   uuid        primary key default gen_random_uuid(),
  report_id            uuid        not null references public.diagnostic_reports(id) on delete cascade,
  marker_name          text        not null,
  value                decimal     not null,
  unit                 text        not null default '',
  reference_range_low  decimal     not null,
  reference_range_high decimal     not null,
  status               text        not null default 'optimal' check (status in ('optimal', 'borderline-low', 'borderline-high', 'low', 'high')),
  category             text        not null default 'Full Blood Count',
  short_explanation    text        not null default '',
  coach_note           text        not null default '',
  recommendation       text        not null default '',
  is_flagged           boolean     not null default false,
  display_order        integer     not null default 0,
  created_at           timestamptz not null default now()
);

-- ─── diagnostic_insights ──────────────────────────────────────────────────────
create table public.diagnostic_insights (
  id            uuid        primary key default gen_random_uuid(),
  report_id     uuid        not null references public.diagnostic_reports(id) on delete cascade,
  title         text        not null,
  description   text        not null default '',
  category      text        not null default 'general' check (category in ('priority-focus', 'key-risks', 'nutrition', 'training', 'recovery', 'general')),
  priority      text        not null default 'medium' check (priority in ('high', 'medium', 'low')),
  coach_note    text        not null default '',
  recommendation text       not null default '',
  display_order integer     not null default 0,
  created_at    timestamptz not null default now()
);

-- ─── indexes ──────────────────────────────────────────────────────────────────
create index diagnostic_reports_client_id_idx  on public.diagnostic_reports (client_id);
create index diagnostic_reports_coach_id_idx   on public.diagnostic_reports (coach_id);
create index diagnostic_markers_report_id_idx  on public.diagnostic_markers (report_id);
create index diagnostic_insights_report_id_idx on public.diagnostic_insights (report_id);

-- ─── RLS: diagnostic_reports ──────────────────────────────────────────────────
alter table public.diagnostic_reports enable row level security;

-- ── SELECT ────────────────────────────────────────────────────────────────────
create policy "coach_select_reports"
  on public.diagnostic_reports for select
  using (coach_id = auth.uid());

create policy "client_select_published_reports"
  on public.diagnostic_reports for select
  using (
    status = 'published'
    and exists (
      select 1 from public.clients
      where id = diagnostic_reports.client_id
        and user_id = auth.uid()
    )
  );

-- ── INSERT ────────────────────────────────────────────────────────────────────
create policy "coach_insert_reports"
  on public.diagnostic_reports for insert
  with check (coach_id = auth.uid());

-- ── UPDATE ────────────────────────────────────────────────────────────────────
create policy "coach_update_reports"
  on public.diagnostic_reports for update
  using (coach_id = auth.uid());

-- ── DELETE ────────────────────────────────────────────────────────────────────
create policy "coach_delete_reports"
  on public.diagnostic_reports for delete
  using (coach_id = auth.uid());

-- ─── RLS: diagnostic_markers ──────────────────────────────────────────────────
alter table public.diagnostic_markers enable row level security;

-- ── ALL (coach) ───────────────────────────────────────────────────────────────
create policy "coach_all_markers"
  on public.diagnostic_markers for all
  using (
    exists (
      select 1 from public.diagnostic_reports
      where id = diagnostic_markers.report_id
        and coach_id = auth.uid()
    )
  );

-- ── SELECT (client, published only) ───────────────────────────────────────────
create policy "client_select_markers"
  on public.diagnostic_markers for select
  using (
    exists (
      select 1 from public.diagnostic_reports
      where id = diagnostic_markers.report_id
        and status = 'published'
        and exists (
          select 1 from public.clients
          where id = diagnostic_reports.client_id
            and user_id = auth.uid()
        )
    )
  );

-- ─── RLS: diagnostic_insights ─────────────────────────────────────────────────
alter table public.diagnostic_insights enable row level security;

-- ── ALL (coach) ───────────────────────────────────────────────────────────────
create policy "coach_all_insights"
  on public.diagnostic_insights for all
  using (
    exists (
      select 1 from public.diagnostic_reports
      where id = diagnostic_insights.report_id
        and coach_id = auth.uid()
    )
  );

-- ── SELECT (client, published only) ───────────────────────────────────────────
create policy "client_select_insights"
  on public.diagnostic_insights for select
  using (
    exists (
      select 1 from public.diagnostic_reports
      where id = diagnostic_insights.report_id
        and status = 'published'
        and exists (
          select 1 from public.clients
          where id = diagnostic_reports.client_id
            and user_id = auth.uid()
        )
    )
  );

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger diagnostic_reports_updated_at
  before update on public.diagnostic_reports
  for each row execute function public.set_updated_at();
