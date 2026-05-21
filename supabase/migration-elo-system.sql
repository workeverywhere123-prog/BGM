-- ============================================================
-- ELO System Migration — BGM Board Game League
-- BGA-Style Multiplayer ELO
-- ============================================================

-- 1) players 에 ELO 컬럼 추가
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS elo            INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS elo_game_count INTEGER NOT NULL DEFAULT 0;

-- 2) match_participants 에 ELO 변동 기록
ALTER TABLE public.match_participants ADD COLUMN IF NOT EXISTS elo_before INTEGER;
ALTER TABLE public.match_participants ADD COLUMN IF NOT EXISTS elo_change  INTEGER;
ALTER TABLE public.match_participants ADD COLUMN IF NOT EXISTS elo_after   INTEGER;

-- 3) ELO 이력 테이블 (날짜, 게임, 플레이어, ELO 변동 전체 기록)
CREATE TABLE IF NOT EXISTS public.elo_history (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id   uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  match_id    uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  game_name   text,
  game_type   text,
  rank        integer,
  elo_before  integer NOT NULL,
  elo_change  integer NOT NULL,
  elo_after   integer NOT NULL,
  players_count integer,       -- 해당 게임 참가자 수
  played_at   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_elo_history_player ON public.elo_history(player_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_elo_history_match  ON public.elo_history(match_id);

-- 4) ELO 랭킹 뷰 (활성 플레이어 + 닉네임)
CREATE OR REPLACE VIEW public.elo_rankings AS
  SELECT
    p.id,
    p.username,
    p.nickname,
    p.avatar_url,
    p.elo,
    p.elo_game_count,
    RANK() OVER (ORDER BY p.elo DESC) AS elo_rank
  FROM public.players p
  WHERE p.is_active = true
    AND p.elo_game_count > 0
  ORDER BY p.elo DESC;

-- 5) RLS
ALTER TABLE public.elo_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "elo_history_read"  ON public.elo_history;
DROP POLICY IF EXISTS "elo_history_admin" ON public.elo_history;
CREATE POLICY "elo_history_read"  ON public.elo_history FOR SELECT USING (true);
CREATE POLICY "elo_history_admin" ON public.elo_history FOR ALL TO authenticated
  USING   (EXISTS (SELECT 1 FROM public.players WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.players WHERE id = auth.uid() AND is_admin = true));
