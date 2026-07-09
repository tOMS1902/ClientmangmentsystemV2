alter table clients
  add column next_call_at timestamptz,
  add column next_call_link text,
  add column next_call_notes text;
