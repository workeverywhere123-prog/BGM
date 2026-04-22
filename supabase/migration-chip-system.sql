-- ============================================================
-- boardgame-league — M2 Migration: Chip System
-- BGM (Boardgame in Melbourne) 칩 기반 점수 시스템으로 전환
--
-- 기존 테이블에서 변경:
--   - matches: Elo 전용 → 다인/멀티팀/다양한 게임 타입 지원
--   - 신규: meetings, match_participants, meeting_attendances, chip_transactions
--   - 제거: rounds, brackets, match_participations, ranking_snapshots (사용 안 함)
--
-- Supabase SQL Editor에서 한 번 실행하세요.
-- ============================================================

-- ============================================================
-- Step 1: 기존 미사용 테이블 제거
-- ============================================================
drop table if exists public.ranking_snapshots cascade;
drop table if exists public.match_participations cascade;
drop table if exists public.brackets cascade;
drop table if exists public.rounds cascade;

-- 기존 matches 제거 (재설계)
drop table if exists public.matches cascade;

-- ============================================================
-- Step 2: seasons → meetings 개념으로 대체
--   seasons 테이블은 유지(league 그루핑용)하되
--   실제 모임은 meetings 테이블로 관리
-- ============================================================

-- 2-1) meetings (BGM 모임 회차)
create table if not exists public.meetings (
  id          uuid primary key default uuid_generate_v4(),
  league_id   uuid not null references public.leagues(id) on delete cascade,
  number      integer not null,          -- 1회, 2회, ...
  held_at     timestamptz not null default now(),
  status      text not null default 'upcoming'
              check (status in ('upcoming','active','closed')),
  note        text,
  created_at  timestamptz not null default now(),
  unique (league_id, number)
);
create index if not exists idx_meetings_league on public.meetings(league_id, number desc);

-- ============================================================
-- Step 3: matches (재설계 — 다인/멀티팀/다양 게임 타입)
-- ============================================================
create table if not exists public.matches (
  id          uuid primary key default uuid_generate_v4(),
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  game_id     uuid references public.games(id) on delete set null,
  game_type   text not null
              check (game_type in ('team','mafia','deathmatch','onevsmany','coop','ranking')),
  played_at   timestamptz not null default now(),
  note        text,
  created_by  uuid not null references public.players(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_matches_meeting on public.matches(meeting_id, played_at desc);

-- ============================================================
-- Step 4: match_participants (경기 참여자별 결과 + 칩 변동)
-- ============================================================
-- game_type별 사용 필드 설명:
--   team      → team('A'|'B'), is_winner, chip_change
--   mafia     → role('mafia'|'citizen'|'special'), is_winner, chip_change
--   deathmatch→ team(nullable), is_winner, chip_change (bet 기반 계산 후)
--   onevsmany → team('solo'|'group'), is_winner, chip_change
--   coop      → is_mvp, chip_change
--   ranking   → rank(1,2,...), chip_change
create table if not exists public.match_participants (
  id            uuid primary key default uuid_generate_v4(),
  match_id      uuid not null references public.matches(id) on delete cascade,
  player_id     uuid not null references public.players(id),
  team          text,          -- 'A'|'B'|'solo'|'group' (team/deathmatch/onevsmany)
  rank          integer,       -- 순위게임: 1,2,3,...
  role          text           -- 마피아: 'mafia'|'citizen'|'special'
                check (role is null or role in ('mafia','citizen','special')),
  is_winner     boolean,       -- 팀전/데스매치/1vs多: 승/패
  is_mvp        boolean not null default false,  -- 협력게임 MVP
  chip_change   integer not null default 0,
  unique (match_id, player_id)
);
create index if not exists idx_mp_player on public.match_participants(player_id);

-- ============================================================
-- Step 5: meeting_attendances (모임 출석 + 투표 기록)
-- ============================================================
-- status:
--   attended  → 참석 (+1칩)
--   late      → 지각 (-1칩)
--   absent    → 불참 (-1칩)
-- voted: false → 투표미참여 (-1칩)
create table if not exists public.meeting_attendances (
  id          uuid primary key default uuid_generate_v4(),
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  player_id   uuid not null references public.players(id),
  status      text not null default 'attended'
              check (status in ('attended','late','absent')),
  voted       boolean not null default true,  -- 기본값: 투표 참여
  unique (meeting_id, player_id)
);
create index if not exists idx_attendance_meeting on public.meeting_attendances(meeting_id);

-- ============================================================
-- Step 6: chip_transactions (칩 이동 단일 소스)
-- ============================================================
-- tx_type:
--   game        → match_participants의 chip_change 기반 (match_id 있음)
--   attendance  → 모임 참석 +1 (meeting_id 있음)
--   late        → 지각 -1
--   absence     → 불참 -1
--   vote_skip   → 투표 미참여 -1
--   draw_use    → 추첨 시 칩 사용 (음수 amount)
--   draw_win    → 추첨 당첨 (양수 amount)
--   manual      → 운영진 수동 조정
create table if not exists public.chip_transactions (
  id          uuid primary key default uuid_generate_v4(),
  player_id   uuid not null references public.players(id),
  meeting_id  uuid references public.meetings(id) on delete set null,
  match_id    uuid references public.matches(id) on delete set null,
  tx_type     text not null
              check (tx_type in ('game','attendance','late','absence','vote_skip','draw_use','draw_win','manual')),
  amount      integer not null,  -- 양수: 획득, 음수: 차감
  note        text,
  created_by  uuid references public.players(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_chip_tx_player on public.chip_transactions(player_id, created_at desc);
create index if not exists idx_chip_tx_meeting on public.chip_transactions(meeting_id);

-- ============================================================
-- Step 7: 칩 잔고 뷰 (player_chip_totals)
-- ============================================================
create or replace view public.player_chip_totals as
  select
    player_id,
    coalesce(sum(amount), 0) as total_chips,
    count(*) filter (where amount > 0) as total_gains,
    count(*) filter (where amount < 0) as total_losses
  from public.chip_transactions
  group by player_id;

-- ============================================================
-- Step 8: leagues 테이블 — elo_k 컬럼은 칩 시스템에선 불필요
--         (삭제하면 기존 코드 오류 가능하므로 soft-deprecate 처리)
--         필요 시 나중에 drop column 가능
-- ============================================================
comment on column public.leagues.elo_k is 'deprecated: Elo 시스템 제거 후 미사용. 칩 시스템으로 전환됨.';

-- ============================================================
-- Step 9: leagues — default_game_id FK 재확인
-- ============================================================
alter table public.leagues drop constraint if exists leagues_default_game_fk;
alter table public.leagues
  add constraint leagues_default_game_fk
  foreign key (default_game_id) references public.games(id)
  on delete set null
  deferrable initially deferred;

-- ============================================================
-- Step 10: RLS 활성화
-- ============================================================
alter table public.meetings             enable row level security;
alter table public.matches              enable row level security;
alter table public.match_participants   enable row level security;
alter table public.meeting_attendances  enable row level security;
alter table public.chip_transactions    enable row level security;

-- ============================================================
-- Step 11: RLS 정책
-- ============================================================

-- meetings ----------------------------------------------------
drop policy if exists "meetings_read" on public.meetings;
create policy "meetings_read" on public.meetings for select using (
  exists (
    select 1 from public.leagues l
    where l.id = meetings.league_id
      and (l.is_public or public.has_league_role(l.id, array['owner','manager','player']))
  )
);

drop policy if exists "meetings_write_staff" on public.meetings;
create policy "meetings_write_staff" on public.meetings for all
  using (public.has_league_role(league_id, array['owner','manager']))
  with check (public.has_league_role(league_id, array['owner','manager']));

-- matches ----------------------------------------------------
drop policy if exists "matches_read" on public.matches;
create policy "matches_read" on public.matches for select using (
  exists (
    select 1 from public.meetings m
    join public.leagues l on l.id = m.league_id
    where m.id = matches.meeting_id
      and (l.is_public or public.has_league_role(l.id, array['owner','manager','player']))
  )
);

drop policy if exists "matches_write_staff" on public.matches;
create policy "matches_write_staff" on public.matches for all
  using (
    exists (
      select 1 from public.meetings m
      where m.id = matches.meeting_id
        and public.has_league_role(m.league_id, array['owner','manager'])
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = matches.meeting_id
        and public.has_league_role(m.league_id, array['owner','manager'])
    )
  );

-- match_participants -----------------------------------------
drop policy if exists "mp_read" on public.match_participants;
create policy "mp_read" on public.match_participants for select using (
  exists (
    select 1 from public.matches mt
    join public.meetings m on m.id = mt.meeting_id
    join public.leagues l on l.id = m.league_id
    where mt.id = match_participants.match_id
      and (l.is_public or public.has_league_role(l.id, array['owner','manager','player']))
  )
);

drop policy if exists "mp_write_staff" on public.match_participants;
create policy "mp_write_staff" on public.match_participants for all
  using (
    exists (
      select 1 from public.matches mt
      join public.meetings m on m.id = mt.meeting_id
      where mt.id = match_participants.match_id
        and public.has_league_role(m.league_id, array['owner','manager'])
    )
  )
  with check (
    exists (
      select 1 from public.matches mt
      join public.meetings m on m.id = mt.meeting_id
      where mt.id = match_participants.match_id
        and public.has_league_role(m.league_id, array['owner','manager'])
    )
  );

-- meeting_attendances ----------------------------------------
drop policy if exists "attendance_read" on public.meeting_attendances;
create policy "attendance_read" on public.meeting_attendances for select using (
  exists (
    select 1 from public.meetings m
    join public.leagues l on l.id = m.league_id
    where m.id = meeting_attendances.meeting_id
      and (l.is_public or public.has_league_role(l.id, array['owner','manager','player']))
  )
);

drop policy if exists "attendance_write_staff" on public.meeting_attendances;
create policy "attendance_write_staff" on public.meeting_attendances for all
  using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_attendances.meeting_id
        and public.has_league_role(m.league_id, array['owner','manager'])
    )
  )
  with check (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_attendances.meeting_id
        and public.has_league_role(m.league_id, array['owner','manager'])
    )
  );

-- chip_transactions ------------------------------------------
drop policy if exists "chip_tx_read_self_or_staff" on public.chip_transactions;
create policy "chip_tx_read_self_or_staff" on public.chip_transactions for select using (
  player_id = auth.uid()
  or exists (
    select 1 from public.meetings m
    where m.id = chip_transactions.meeting_id
      and public.has_league_role(m.league_id, array['owner','manager'])
  )
);

-- 쓰기: service_role 또는 SECURITY DEFINER 함수에서만
drop policy if exists "chip_tx_no_client_writes" on public.chip_transactions;
create policy "chip_tx_no_client_writes" on public.chip_transactions for all to authenticated
  using (false) with check (false);

-- ============================================================
-- done — M2 칩 시스템 마이그레이션 완료
-- ============================================================
