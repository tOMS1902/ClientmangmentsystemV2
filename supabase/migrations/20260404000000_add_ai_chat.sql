CREATE TABLE ai_chat_messages (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  coach_id    uuid REFERENCES profiles(id) NOT NULL,
  role        text CHECK (role IN ('user', 'assistant')) NOT NULL,
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_own_messages" ON ai_chat_messages
  FOR ALL USING (coach_id = auth.uid());
