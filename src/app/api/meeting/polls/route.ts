import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { requireSessionUser } from '@/lib/session';

// GET: 전체 투표 목록 (+ 각 옵션별 투표수)
export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data: polls } = await supabase
    .from('meeting_polls')
    .select('id, title, description, options, deadline, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!polls?.length) return NextResponse.json([]);

  const pollIds = polls.map(p => p.id);
  const { data: votes } = await supabase
    .from('meeting_poll_votes')
    .select('poll_id, player_id, option_index')
    .in('poll_id', pollIds);

  const result = polls.map(poll => {
    const pollVotes = (votes ?? []).filter(v => v.poll_id === poll.id);
    const optionVotes = (poll.options as unknown[]).map((_, i) =>
      pollVotes.filter(v => v.option_index === i).map(v => v.player_id),
    );
    return { ...poll, optionVotes };
  });

  return NextResponse.json(result);
}

// POST: 투표 생성 (어드민 전용)
export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();

    const { data: adminCheck } = await supabase.from('players').select('is_admin').eq('id', user.id).single();
    if (!adminCheck?.is_admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

    const { title, description, options, deadline } = await req.json();
    if (!title || !options?.length || !deadline)
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 });

    const { data, error } = await supabase
      .from('meeting_polls')
      .insert({ title, description: description || null, options, deadline, created_by: user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 전체 회원에게 알림 발송
    const { data: players } = await supabase.from('players').select('id').eq('is_active', true);
    if (players?.length) {
      await supabase.from('notifications').insert(
        players.map(p => ({
          player_id: p.id,
          title: '📅 모임 일정 투표가 열렸습니다',
          message: `${title} — 마감: ${new Date(deadline).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          type: 'meeting_poll',
          created_by: user.id,
        })),
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
