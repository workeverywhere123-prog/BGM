-- ================================================================
-- Security Fix Migration
-- 1. Security Definer View → SECURITY INVOKER
-- 2. RLS 미설정 테이블 활성화
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- Part 1: chip_transactions 읽기 허용 (뷰가 SECURITY INVOKER로
--         바뀌면 anon/authenticated가 직접 읽을 수 있어야 함)
-- ────────────────────────────────────────────────────────────────

-- 이미 RLS enabled 상태. SELECT 정책만 추가
DROP POLICY IF EXISTS "Public can read chip_transactions" ON public.chip_transactions;
CREATE POLICY "Public can read chip_transactions"
  ON public.chip_transactions FOR SELECT USING (true);


-- ────────────────────────────────────────────────────────────────
-- Part 2: Security Definer Views → SECURITY INVOKER
-- ────────────────────────────────────────────────────────────────

-- player_chip_totals
CREATE OR REPLACE VIEW public.player_chip_totals
  WITH (security_invoker = true)
AS
  SELECT
    player_id,
    coalesce(sum(amount), 0)              AS total_chips,
    count(*) FILTER (WHERE amount > 0)   AS total_gains,
    count(*) FILTER (WHERE amount < 0)   AS total_losses
  FROM public.chip_transactions
  GROUP BY player_id;

-- player_quarter_totals
CREATE OR REPLACE VIEW public.player_quarter_totals
  WITH (security_invoker = true)
AS
  SELECT
    ct.player_id,
    ct.quarter_id,
    coalesce(sum(ct.amount), 0)              AS quarter_points,
    count(*) FILTER (WHERE ct.amount > 0)   AS gains,
    count(*) FILTER (WHERE ct.amount < 0)   AS losses
  FROM public.chip_transactions ct
  WHERE ct.quarter_id IS NOT NULL
  GROUP BY ct.player_id, ct.quarter_id;

-- player_active_quarter_totals (game_count 버그 수정 포함)
CREATE OR REPLACE VIEW public.player_active_quarter_totals
  WITH (security_invoker = true)
AS
  SELECT
    ct.player_id,
    coalesce(sum(ct.amount), 0)                                         AS quarter_points,
    count(*) FILTER (WHERE ct.tx_type = 'game' AND ct.amount > 0)      AS gains,
    count(*) FILTER (WHERE ct.tx_type = 'game' AND ct.amount < 0)      AS losses
  FROM public.chip_transactions ct
  JOIN public.quarters q ON q.id = ct.quarter_id
  WHERE q.is_active = true
  GROUP BY ct.player_id;

-- game_stats (현재 정의를 SECURITY INVOKER로만 재생성)
CREATE OR REPLACE VIEW public.game_stats
  WITH (security_invoker = true)
AS
  SELECT
    m.boardlife_game_name                          AS game_name,
    count(*)                                       AS total_matches,
    count(DISTINCT mp.player_id)                   AS unique_players,
    max(m.played_at)                               AS last_played_at
  FROM public.matches m
  JOIN public.match_participants mp ON mp.match_id = m.id
  WHERE m.boardlife_game_name IS NOT NULL
  GROUP BY m.boardlife_game_name;

-- player_win_stats (현재 정의를 SECURITY INVOKER로만 재생성)
CREATE OR REPLACE VIEW public.player_win_stats
  WITH (security_invoker = true)
AS
  SELECT
    mp.player_id,
    count(*)                                            AS total_games,
    count(*) FILTER (WHERE mp.is_winner = true)         AS wins,
    count(*) FILTER (WHERE mp.is_winner = false)        AS losses,
    round(
      count(*) FILTER (WHERE mp.is_winner = true)::numeric
      / NULLIF(count(*), 0) * 100, 1
    )                                                   AS win_rate
  FROM public.match_participants mp
  GROUP BY mp.player_id;

-- 뷰에 대한 SELECT 권한 부여
GRANT SELECT ON public.player_chip_totals           TO anon, authenticated;
GRANT SELECT ON public.player_quarter_totals        TO anon, authenticated;
GRANT SELECT ON public.player_active_quarter_totals TO anon, authenticated;
GRANT SELECT ON public.game_stats                   TO anon, authenticated;
GRANT SELECT ON public.player_win_stats             TO anon, authenticated;


-- ────────────────────────────────────────────────────────────────
-- Part 3: RLS 미설정 테이블 활성화
-- ────────────────────────────────────────────────────────────────

-- ── room_invitations ──────────────────────────────────────────
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;

-- 초대한 사람 / 초대받은 사람만 조회 가능
DROP POLICY IF EXISTS "Invitation parties can read" ON public.room_invitations;
CREATE POLICY "Invitation parties can read"
  ON public.room_invitations FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- 로그인한 사용자가 초대 생성 (inviter = 본인)
DROP POLICY IF EXISTS "Inviter can insert" ON public.room_invitations;
CREATE POLICY "Inviter can insert"
  ON public.room_invitations FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

-- 초대받은 사람 또는 초대한 사람이 상태 변경
DROP POLICY IF EXISTS "Invitation parties can update" ON public.room_invitations;
CREATE POLICY "Invitation parties can update"
  ON public.room_invitations FOR UPDATE
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- 초대한 사람이 취소 가능
DROP POLICY IF EXISTS "Inviter can delete" ON public.room_invitations;
CREATE POLICY "Inviter can delete"
  ON public.room_invitations FOR DELETE
  USING (auth.uid() = inviter_id);


-- ── league_player_availability ────────────────────────────────
ALTER TABLE public.league_player_availability ENABLE ROW LEVEL SECURITY;

-- 누구나 가용 일정 조회 가능 (공개 정보)
DROP POLICY IF EXISTS "Anyone can read availability" ON public.league_player_availability;
CREATE POLICY "Anyone can read availability"
  ON public.league_player_availability FOR SELECT
  USING (true);

-- 본인 가용 일정만 추가/삭제 가능
DROP POLICY IF EXISTS "Users manage own availability" ON public.league_player_availability;
CREATE POLICY "Users manage own availability"
  ON public.league_player_availability FOR ALL
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);


-- ── player_game_elos (구 Elo 시스템, 현재 미사용) ────────────
ALTER TABLE public.player_game_elos ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (공개 통계)
DROP POLICY IF EXISTS "Anyone can read game elos" ON public.player_game_elos;
CREATE POLICY "Anyone can read game elos"
  ON public.player_game_elos FOR SELECT
  USING (true);

-- 쓰기는 서비스 롤만 (앱에서 service_role 클라이언트 사용)
-- authenticated 사용자는 본인 데이터만 수정 가능 (service client 통해 우회)
DROP POLICY IF EXISTS "Authenticated can manage own elos" ON public.player_game_elos;
CREATE POLICY "Authenticated can manage own elos"
  ON public.player_game_elos FOR ALL
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);
