import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// GET: 특정 모임 RSVP 목록
export async function GET(req: NextRequest) {
  const meeting_id = req.nextUrl.searchParams.get('meeting_id');
  if (!meeting_id) return NextResponse.json([]);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('meeting_rsvps')
    .select('player_id, status, players(id, nickname, username, avatar_url)')
    .eq('meeting_id', meeting_id);
  return NextResponse.json(data ?? []);
}

// POST: 참석/불참 등록 또는 변경
export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = await createSupabaseServerClient();
    const { meeting_id, status } = await req.json();

    if (!meeting_id || !['attending', 'absent'].includes(status))
      return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });

    await supabase.from('meeting_rsvps').upsert(
      { meeting_id, player_id: user.id, status },
      { onConflict: 'meeting_id,player_id' }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// DELETE: RSVP 취소
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = await createSupabaseServerClient();
    const { meeting_id } = await req.json();

    await supabase.from('meeting_rsvps')
      .delete()
      .eq('meeting_id', meeting_id)
      .eq('player_id', user.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
