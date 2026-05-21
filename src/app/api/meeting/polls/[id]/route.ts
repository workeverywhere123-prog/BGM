import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { requireSessionUser } from '@/lib/session';

// POST: 투표 토글
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: poll_id } = await params;
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();
    const { option_index } = await req.json();

    const { data: poll } = await supabase
      .from('meeting_polls').select('status, deadline, title, created_by').eq('id', poll_id).single();
    if (!poll) return NextResponse.json({ error: '투표를 찾을 수 없습니다' }, { status: 404 });
    if (poll.status === 'closed' || new Date(poll.deadline) < new Date())
      return NextResponse.json({ error: '마감된 투표입니다' }, { status: 400 });

    const { data: existing } = await supabase
      .from('meeting_poll_votes')
      .select('id')
      .eq('poll_id', poll_id)
      .eq('player_id', user.id)
      .eq('option_index', option_index)
      .maybeSingle();

    if (existing) {
      await supabase.from('meeting_poll_votes').delete().eq('id', existing.id);
      return NextResponse.json({ action: 'removed' });
    }

    await supabase.from('meeting_poll_votes').insert({ poll_id, player_id: user.id, option_index });

    if (poll.created_by) {
      const { data: voter } = await supabase.from('players').select('nickname').eq('id', user.id).single();
      await supabase.from('notifications').insert({
        player_id: poll.created_by,
        title: '✅ 새 투표가 등록되었습니다',
        message: `${voter?.nickname ?? '회원'}님이 "${poll.title}"에 투표했습니다.`,
        type: 'meeting_poll',
        created_by: user.id,
      });
    }

    return NextResponse.json({ action: 'added' });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// PATCH: 투표 마감 + 모임 확정 생성
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: poll_id } = await params;
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();

    const { data: adminCheck } = await supabase.from('players').select('is_admin').eq('id', user.id).single();
    if (!adminCheck?.is_admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

    const body = await req.json();
    const { action, meeting_number, confirmed_date, rsvp_deadline, note } = body;
    if (action !== 'close') return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    if (!meeting_number || !confirmed_date)
      return NextResponse.json({ error: '모임 회차와 확정 날짜를 입력해주세요' }, { status: 400 });

    // 1. 모임(meetings) 생성
    const { data: meeting, error: meetingErr } = await supabase
      .from('meetings')
      .insert({
        number: parseInt(meeting_number),
        held_at: new Date(confirmed_date).toISOString(),
        status: 'upcoming',
        note: note || null,
        rsvp_deadline: rsvp_deadline ? new Date(rsvp_deadline).toISOString() : null,
        rsvp_processed: false,
      })
      .select('id')
      .single();

    if (meetingErr) return NextResponse.json({ error: meetingErr.message }, { status: 500 });

    // 2. 투표 마감 + meeting_id 연결
    await supabase
      .from('meeting_polls')
      .update({ status: 'closed', meeting_id: meeting.id })
      .eq('id', poll_id);

    // 3. 전체 활성 회원에게 확정 알림
    const { data: poll } = await supabase.from('meeting_polls').select('title').eq('id', poll_id).single();
    const { data: players } = await supabase.from('players').select('id').eq('is_active', true);

    if (players?.length) {
      const dateLabel = new Date(confirmed_date).toLocaleDateString('ko-KR', {
        month: 'long', day: 'numeric', weekday: 'short',
      });
      await supabase.from('notifications').insert(
        players.map(p => ({
          player_id: p.id,
          title: `📅 제${meeting_number}회 모임 일정이 확정되었습니다`,
          message: `${dateLabel}${rsvp_deadline ? ` · 참석 투표 마감: ${new Date(rsvp_deadline).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}`,
          type: 'meeting_confirmed',
          created_by: user.id,
        })),
      );
    }

    return NextResponse.json({ ok: true, meeting_id: meeting.id });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// DELETE: 투표 삭제 (어드민)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: poll_id } = await params;
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();

    const { data: adminCheck } = await supabase.from('players').select('is_admin').eq('id', user.id).single();
    if (!adminCheck?.is_admin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });

    await supabase.from('meeting_polls').delete().eq('id', poll_id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
