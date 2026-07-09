create table exercise_videos (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  title text not null check (length(title) <= 200),
  url text not null check (length(url) <= 500),
  created_at timestamptz not null default now()
);

alter table exercise_videos enable row level security;

create policy "coach manages own videos"
  on exercise_videos for all using (coach_id = auth.uid());
