create table custom_shopping_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  note text,
  action text not null default 'add' check (action in ('add', 'remove')),
  created_at timestamptz default now()
);

alter table custom_shopping_items enable row level security;

create policy "coaches manage shopping items"
  on custom_shopping_items for all
  using (
    exists (
      select 1 from clients c
      join profiles p on p.id = auth.uid()
      where c.id = custom_shopping_items.client_id
        and (c.coach_id = auth.uid() or p.role = 'coach')
    )
  );

create policy "clients read own shopping items"
  on custom_shopping_items for select
  using (
    exists (
      select 1 from clients c
      where c.id = custom_shopping_items.client_id
        and c.user_id = auth.uid()
    )
  );
