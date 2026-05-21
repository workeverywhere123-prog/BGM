import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

// 매 5분 실행 — RSVP 마감 30~35분 남은 모임의 미투표자에게 알림
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 60 * 1000);
  const in35 = new Date(now.getTime() + 35 * 60 * 1000);

  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, number, rsvp_deadline')
    .in('status', ['upcoming', 'active'])
    .gte('rsvp_deadline', in30.toISOString())
    .lte('rsvp_deadline', in35.toISOString());

  if (!meetings?.length) return NextResponse.json({ sent: 0 });

  let totalSent = 0;
  for (const m of meetings) {
    const { data: rsvps } = await supabase.from('meeting_rsvps').select('player_id').eq('meeting_id', m.id);
    const voted = new Set((rsvps ?? []).map(r => r.player_id));
    const { data: players } = await supabase.from('players').select('id').eq('is_active', true);
    const unvoted = (players ?? []).filter(p => !voted.has(p.id));
    if (!unvoted.length) continue;

    await supabase.from('notifications').insert(
      unvoted.map(p => ({
        player_id: p.id,
        title: '⏰ 참석 투표 마감 30분 전입니다',
        message: `제${m.number}회 정기 모임 참석 여부를 아직 등록하지 않으셨습니다. 30분 내 투표하지 않으면 LAPIS -1이 차감됩니다.`,
        type: 'meeting_rsvp',
      })),
    );
    totalSent += unvoted.length;
  }

  return NextResponse.json({ sent: totalSent });
}
