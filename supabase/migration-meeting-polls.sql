-- ============================================================
-- Meeting Poll System: 정기 모임 일정 투표
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meeting_polls (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       text NOT NULL,
  description text,
  options     jsonb NOT NULL DEFAULT '[]',
  -- options: [{label: "5월 3일 (토)", date: "2026-05-03", time: "14:00"}]
  deadline    timestamptz NOT NULL,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by  uuid REFERENCES public.players(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meeting_poll_votes (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id      uuid NOT NULL REFERENCES public.meeting_polls(id) ON DELETE CASCADE,
  player_id    uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  option_index int NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, player_id, option_index)
);

ALTER TABLE public.meeting_polls      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "polls_read"   ON public.meeting_polls;
DROP POLICY IF EXISTS "polls_admin"  ON public.meeting_polls;
DROP POLICY IF EXISTS "votes_read"   ON public.meeting_poll_votes;
DROP POLICY IF EXISTS "votes_write"  ON public.meeting_poll_votes;

CREATE POLICY "polls_read"  ON public.meeting_polls FOR SELECT USING (true);
CREATE POLICY "polls_admin" ON public.meeting_polls FOR ALL TO authenticated
  USING   (EXISTS (SELECT 1 FROM public.players WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.players WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "votes_read"  ON public.meeting_poll_votes FOR SELECT USING (true);
CREATE POLICY "votes_write" ON public.meeting_poll_votes FOR ALL TO authenticated
  USING   (player_id = auth.uid() OR EXISTS (SELECT 1 FROM public.players WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (player_id = auth.uid() OR EXISTS (SELECT 1 FROM public.players WHERE id = auth.uid() AND is_admin = true));
