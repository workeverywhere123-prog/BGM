-- ============================================================
-- Fix: player_active_quarter_totals gains/losses
-- 문제: manual/attendance 등 모든 tx_type을 게임수로 카운트함
-- 수정: tx_type = 'game' 인 것만 게임 승/패로 집계
-- ============================================================

create or replace view public.player_active_quarter_totals as
  select
    ct.player_id,
    coalesce(sum(ct.amount), 0) as quarter_points,
    count(*) filter (where ct.tx_type = 'game' and ct.amount > 0) as gains,
    count(*) filter (where ct.tx_type = 'game' and ct.amount < 0) as losses
  from public.chip_transactions ct
  join public.quarters q on q.id = ct.quarter_id
  where q.is_active = true
  group by ct.player_id;
