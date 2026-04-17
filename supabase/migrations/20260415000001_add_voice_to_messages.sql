-- Add voice_url to messages
alter table public.messages add column if not exists voice_url text;

-- Relax body constraint: allow empty body when voice_url is present
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) <= 4000 and (char_length(body) > 0 or voice_url is not null));

-- Private storage bucket for message voice notes (not public)
insert into storage.buckets (id, name, public)
  values ('message-voice-notes', 'message-voice-notes', false)
  on conflict (id) do nothing;
