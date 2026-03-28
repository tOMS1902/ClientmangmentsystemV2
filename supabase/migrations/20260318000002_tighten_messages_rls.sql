-- Fix coach_select_messages: coaches can only read messages for their own clients
drop policy if exists "coach_select_messages" on public.messages;

create policy "coach_select_messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.clients
      where id = messages.client_id
        and coach_id = auth.uid()
    )
  );

-- Fix coach_insert_messages: coaches can only insert into threads they own
drop policy if exists "coach_insert_messages" on public.messages;

create policy "coach_insert_messages"
  on public.messages for insert
  with check (
    sender_role = 'coach'
    and exists (
      select 1 from public.clients
      where id = messages.client_id
        and coach_id = auth.uid()
    )
  );

-- Fix coach_markread_messages: coaches can only mark-read messages in their own threads
drop policy if exists "coach_markread_messages" on public.messages;

create policy "coach_markread_messages"
  on public.messages for update
  using (
    sender_role = 'client'
    and exists (
      select 1 from public.clients
      where id = messages.client_id
        and coach_id = auth.uid()
    )
  )
  with check (is_read = true);
