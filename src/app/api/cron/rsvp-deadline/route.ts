import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

// 매 5분 실행 — RSVP 마감된 모임의 미투표 활성 회원에게 LAPIS -1 차감
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const now = new Date();

  // 마감됐지만 아직 처리 안 된 모임 (최근 2시간 이내 마감 — 놓친 경우 대비)
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, number')
    .in('status', ['upcoming', 'active'])
    .eq('rsvp_processed', false)
    .lt('rsvp_deadline', now.toISOString())
    .gte('rsvp_deadline', twoHoursAgo.toISOString());

  if (!meetings?.length) return NextResponse.json({ processed: 0 });

  // 현재 활성 분기
  const { data: quarter } = await supabase
    .from('quarters')
    .select('id')
    .lte('start_date', now.toISOString())
    .gte('end_date', now.toISOString())
    .maybeSingle();
  const quarter_id = quarter?.id ?? null;

  let totalDeducted = 0;
  for (const m of meetings) {
    // 투표한 사람
    const { data: rsvps } = await supabase.from('meeting_rsvps').select('player_id').eq('meeting_id', m.id);
    const voted = new Set((rsvps ?? []).map(r => r.player_id));

    // 활성 회원 중 미투표자
    const { data: players } = await supabase.from('players').select('id').eq('is_active', true);
    const unvoted = (players ?? []).filter(p => !voted.has(p.id));

    if (unvoted.length) {
      // LAPIS -1 차감
      await supabase.from('chip_transactions').insert(
        unvoted.map(p => ({
          player_id: p.id,
          meeting_id: m.id,
          tx_type: 'rsvp_skip',
          amount: -1,
          quarter_id,
          note: `제${m.number}회 모임 참석 투표 미참여`,
        })),
      );

      // 알림 발송
      await supabase.from('notifications').insert(
        unvoted.map(p => ({
          player_id: p.id,
          title: '💸 LAPIS -1 차감',
          message: `제${m.number}회 정기 모임 참석 투표에 참여하지 않아 LAPIS 1점이 차감되었습니다.`,
          type: 'rsvp_skip',
        })),
      );

      totalDeducted += unvoted.length;
    }

    // 처리 완료 표시
    await supabase.from('meetings').update({ rsvp_processed: true }).eq('id', m.id);
  }

  return NextResponse.json({ processed: meetings.length, deducted: totalDeducted });
}
