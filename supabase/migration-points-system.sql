-- ============================================================
-- M4: 포인트 시스템 + 분기별 랭킹
-- chip → point 개념 확장, quarters 테이블 추가
-- ============================================================

-- ============================================================
-- quarters (분기 관리)
-- ============================================================
create table if not exists public.quarters (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,           -- 예: '2026 Q1', '2026 Q2'
  started_at  timestamptz not null,
  ended_at    timestamptz,             -- null = 현재 진행 중
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index if not exists idx_quarters_active on public.quarters(is_active) where is_active = true;

-- chip_transactions에 quarter_id 추가
alter table public.chip_transactions
  add column if not exists quarter_id uuid references public.quarters(id) on delete set null;
create index if not exists idx_chip_tx_quarter on public.chip_transactions(quarter_id);

-- ============================================================
-- 현재 분기 포인트 뷰 (랭킹용 — 분기 초기화 반영)
-- ============================================================
create or replace view public.player_quarter_totals as
  select
    ct.player_id,
    ct.quarter_id,
    coalesce(sum(ct.amount), 0) as quarter_points,
    count(*) filter (where ct.amount > 0) as gains,
    count(*) filter (where ct.amount < 0) as losses
  from public.chip_transactions ct
  where ct.quarter_id is not null
  group by ct.player_id, ct.quarter_id;

-- ============================================================
-- 현재 활성 분기 포인트 뷰
-- ============================================================
create or replace view public.player_active_quarter_totals as
  select
    ct.player_id,
    coalesce(sum(ct.amount), 0) as quarter_points,
    count(*) filter (where ct.amount > 0) as gains,
    count(*) filter (where ct.amount < 0) as losses
  from public.chip_transactions ct
  join public.quarters q on q.id = ct.quarter_id
  where q.is_active = true
  group by ct.player_id;

-- ============================================================
-- 전체 누적 보유량 뷰 (기존 player_chip_totals 유지)
-- ============================================================
-- player_chip_totals 뷰는 기존 유지 (전체 보유량)

-- ============================================================
-- 포인트 지급 규칙 메타 테이블 (참고용 / 자동 계산용)
-- ============================================================
create table if not exists public.point_rules (
  id          uuid primary key default uuid_generate_v4(),
  game_type   text not null,
  player_count integer,        -- null = 해당 없음
  rank        integer,         -- null = 해당 없음 (예: MVP, 출석)
  points      integer not null,
  label       text not null,
  description text
);

-- 팀전/순위전 포인트 규칙
insert into public.point_rules (game_type, player_count, rank, points, label) values
  ('ranking', 3, 1,  1, '3인 1등'),
  ('ranking', 3, 2,  0, '3인 2등'),
  ('ranking', 3, 3, -1, '3인 3등'),
  ('ranking', 4, 1,  2, '4인 1등'),
  ('ranking', 4, 2,  1, '4인 2등'),
  ('ranking', 4, 3, -1, '4인 3등'),
  ('ranking', 4, 4, -2, '4인 4등'),
  ('ranking', 5, 1,  2, '5인+ 1등'),
  ('ranking', 5, 2,  2, '5인+ 2등'),
  ('ranking', 5, 3,  1, '5인+ 3등'),
  ('ranking', 5, 4,  0, '5인+ 4등'),
  ('ranking', 5, 5, -1, '5인+ 5등'),
  ('ranking', 6, 6, -2, '6인+ 6등'),
  -- 마피아
  ('mafia', null, null, 2, '마피아 승리 (마피아팀)'),
  ('mafia', null, null, 1, '마피아 승리 (시민팀 생존)'),
  ('mafia', null, null, 3, '독립캐릭터 우승'),
  -- 협력게임
  ('coop', null, null, 1, '협력 MVP 득표'),
  -- 1vs다수
  ('onevsmany', null, null,  2, '1인팀 승리'),
  ('onevsmany', null, null, -1, '1인팀 패배'),
  ('onevsmany', null, null,  1, '다인팀 승리 (각각)'),
  ('onevsmany', null, null, -1, '다인팀 패배 (각각)'),
  -- 팀전
  ('team', null, null,  1, '팀전 승리'),
  ('team', null, null, -1, '팀전 패배'),
  -- 데스매치
  ('deathmatch', null, null, 0, '데스매치 (베팅 기반)'),
  -- 출석
  ('attendance', null, null,  1, '정시 참석'),
  ('attendance', null, null, -1, '지각 또는 불참'),
  ('attendance', null, null, -1, '투표 미참여')
on conflict do nothing;

-- ============================================================
-- RLS
-- ============================================================
alter table public.quarters    enable row level security;
alter table public.point_rules enable row level security;

drop policy if exists "quarters_read" on public.quarters;
create policy "quarters_read" on public.quarters for select using (true);

drop policy if exists "quarters_write_admin" on public.quarters;
create policy "quarters_write_admin" on public.quarters for all to authenticated
  using (exists (select 1 from public.players where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.players where id = auth.uid() and is_admin = true));

drop policy if exists "point_rules_read" on public.point_rules;
create policy "point_rules_read" on public.point_rules for select using (true);
