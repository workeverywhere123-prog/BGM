-- ============================================================
-- Welcome bonus + Rules read bonus
-- Supabase 대시보드 SQL Editor에서 실행하세요
-- ============================================================

-- 1. players 테이블에 rules_read_at 추가
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS rules_read_at TIMESTAMPTZ;

-- 2. chip_transactions tx_type 제약 확장
ALTER TABLE public.chip_transactions
  DROP CONSTRAINT IF EXISTS chip_transactions_tx_type_check;

ALTER TABLE public.chip_transactions
  ADD CONSTRAINT chip_transactions_tx_type_check
  CHECK (tx_type IN (
    'game', 'attendance', 'late', 'absence',
    'vote_skip', 'draw_use', 'draw_win', 'manual',
    'welcome',     -- 첫 가입 보너스 +10
    'rules_read'   -- 규칙 정독 보너스 +1
  ));
