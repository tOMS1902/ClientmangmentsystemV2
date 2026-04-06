-- New columns on clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS goal_event_name text,
  ADD COLUMN IF NOT EXISTS goal_event_date date,
  ADD COLUMN IF NOT EXISTS welcome_video_url text,
  ADD COLUMN IF NOT EXISTS welcome_video_views int DEFAULT 0;

-- New column on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Loom videos per client per week
CREATE TABLE weekly_loom_videos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  coach_id    uuid REFERENCES profiles(id) NOT NULL,
  loom_url    text NOT NULL,
  week_number int NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE weekly_loom_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_manage_loom" ON weekly_loom_videos
  FOR ALL USING (coach_id = auth.uid());
CREATE POLICY "client_view_loom" ON weekly_loom_videos
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- Client badges
CREATE TABLE client_badges (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  badge_key   text NOT NULL,
  awarded_at  timestamptz DEFAULT now() NOT NULL,
  awarded_by  text NOT NULL DEFAULT 'auto',
  UNIQUE(client_id, badge_key)
);
ALTER TABLE client_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_manage_badges" ON client_badges
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE coach_id = auth.uid())
  );
CREATE POLICY "client_view_badges" ON client_badges
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );
