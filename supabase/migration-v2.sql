-- ============================================================
-- V2: 관리자 확장 + 리그 + 툴킷
-- ============================================================

-- 플레이어에 discord_id 추가
alter table public.players add column if not exists discord_id text;

-- 보드게임에 boardlife_url 추가
alter table public.player_games add column if not exists boardlife_url text;

-- 방에 youtube_url 추가
alter table public.rooms add column if not exists youtube_url text;

-- 방 멤버에 가져올 게임 목록 추가
alter table public.room_members add column if not exists bring_game_ids uuid[] default '{}';

-- ============================================================
-- 리그 테이블
-- ============================================================
create table if not exists public.leagues (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  start_date  date,
  end_date    date,
  is_active   boolean not null default false,
  prizes      jsonb not null default '[]'::jsonb,
  created_by  uuid references public.players(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.league_participants (
  id         uuid primary key default uuid_generate_v4(),
  league_id  uuid not null references public.leagues(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  score      int not null default 0,
  rank       int,
  note       text,
  joined_at  timestamptz not null default now(),
  unique(league_id, player_id)
);

-- RLS
alter table public.leagues              enable row level security;
alter table public.league_participants  enable row level security;

drop policy if exists "leagues_read"          on public.leagues;
drop policy if exists "leagues_admin"         on public.leagues;
drop policy if exists "lp_read"               on public.league_participants;
drop policy if exists "lp_admin"              on public.league_participants;

create policy "leagues_read"  on public.leagues  for select using (true);
create policy "leagues_admin" on public.leagues  for all to authenticated
  using   (exists (select 1 from public.players where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.players where id = auth.uid() and is_admin = true));

create policy "lp_read"  on public.league_participants for select using (true);
create policy "lp_admin" on public.league_participants for all to authenticated
  using   (exists (select 1 from public.players where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.players where id = auth.uid() and is_admin = true));

-- ============================================================
-- 어드민 포인트 수동 조정을 위한 chip_transactions tx_type 확장
-- (기존 check constraint가 있다면 제거 후 재설정)
-- ============================================================
-- 기존 tx_type 컬럼이 check constraint 없이 text라면 그냥 'admin_adjust' 사용 가능
-- 필요시 아래 주석 해제:
-- alter table public.chip_transactions drop constraint if exists chip_transactions_tx_type_check;
