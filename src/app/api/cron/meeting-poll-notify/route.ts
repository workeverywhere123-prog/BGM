import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

// Vercel Cron: 매 5분마다 호출 → 마감 30분 내 open 투표 감지 후 미투표자에게 알림
// vercel.json cron: { "path": "/api/cron/meeting-poll-notify", "schedule": "*/5 * * * *" }
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 60 * 1000);
  const in35 = new Date(now.getTime() + 35 * 60 * 1000);

  // 마감 30~35분 남은 open 투표 조회 (이미 알림 보낸 것 방지)
  const { data: polls } = await supabase
    .from('meeting_polls')
    .select('id, title, deadline')
    .eq('status', 'open')
    .gte('deadline', in30.toISOString())
    .lte('deadline', in35.toISOString());

  if (!polls?.length) return NextResponse.json({ sent: 0 });

  let totalSent = 0;

  for (const poll of polls) {
    // 이미 투표한 플레이어 ID 수집
    const { data: votes } = await supabase
      .from('meeting_poll_votes').select('player_id').eq('poll_id', poll.id);
    const votedIds = new Set((votes ?? []).map(v => v.player_id));

    // 활성 플레이어 중 미투표자
    const { data: players } = await supabase.from('players').select('id').eq('is_active', true);
    const unvoted = (players ?? []).filter(p => !votedIds.has(p.id));

    if (unvoted.length) {
      await supabase.from('notifications').insert(
        unvoted.map(p => ({
          player_id: p.id,
          title: '⏰ 모임 투표 마감 30분 전입니다',
          message: `"${poll.title}" 투표가 30분 후 마감됩니다. 아직 투표하지 않으셨다면 서둘러 주세요!`,
          type: 'meeting_poll',
        })),
      );
      totalSent += unvoted.length;
    }
  }

  return NextResponse.json({ sent: totalSent, polls: polls.length });
}
