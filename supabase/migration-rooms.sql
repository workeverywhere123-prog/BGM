-- ============================================================
-- 보드게임방 시스템
-- ============================================================

create table if not exists public.rooms (
  id           uuid primary key default uuid_generate_v4(),
  host_id      uuid not null references public.players(id) on delete cascade,
  title        text,
  location     text not null,
  scheduled_at timestamptz not null,
  game_types   text[] not null default '{}',
  max_players  int not null default 6 check (max_players between 2 and 20),
  status       text not null default 'open' check (status in ('open', 'full', 'closed')),
  note         text,
  created_at   timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id    uuid not null references public.rooms(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (room_id, player_id)
);

create index if not exists idx_rooms_status      on public.rooms(status);
create index if not exists idx_rooms_scheduled   on public.rooms(scheduled_at);
create index if not exists idx_room_members_room on public.room_members(room_id);

-- RLS
alter table public.rooms        enable row level security;
alter table public.room_members enable row level security;

drop policy if exists "rooms_read"           on public.rooms;
drop policy if exists "rooms_insert"         on public.rooms;
drop policy if exists "rooms_update"         on public.rooms;
drop policy if exists "rooms_delete"         on public.rooms;
drop policy if exists "room_members_read"    on public.room_members;
drop policy if exists "room_members_insert"  on public.room_members;
drop policy if exists "room_members_delete"  on public.room_members;

create policy "rooms_read"    on public.rooms for select using (true);
create policy "rooms_insert"  on public.rooms for insert to authenticated
  with check (host_id = auth.uid());
create policy "rooms_update"  on public.rooms for update to authenticated
  using (host_id = auth.uid());
create policy "rooms_delete"  on public.rooms for delete to authenticated
  using (host_id = auth.uid());

create policy "room_members_read"   on public.room_members for select using (true);
create policy "room_members_insert" on public.room_members for insert to authenticated
  with check (player_id = auth.uid());
create policy "room_members_delete" on public.room_members for delete to authenticated
  using (player_id = auth.uid());
