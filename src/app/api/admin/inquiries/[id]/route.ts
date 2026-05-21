import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();

    const { data: adminCheck } = await supabase.from('players').select('is_admin').eq('id', user.id).single();
    if (!adminCheck?.is_admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

    const { reply, status } = await req.json() as { reply: string; status?: string };
    if (!reply) return NextResponse.json({ error: '답변을 입력하세요' }, { status: 400 });

    const { data: inquiry } = await supabase.from('inquiries').select('player_id, title').eq('id', id).single();
    if (!inquiry) return NextResponse.json({ error: '문의를 찾을 수 없습니다' }, { status: 404 });

    await supabase.from('inquiries').update({
      admin_reply: reply,
      status: status ?? 'answered',
      replied_by: user.id,
      replied_at: new Date().toISOString(),
    }).eq('id', id);

    // 플레이어에게 답변 알림
    await supabase.from('notifications').insert({
      player_id: inquiry.player_id,
      title: '📩 문의 답변이 도착했습니다',
      message: `"${inquiry.title}" 문의에 관리자 답변이 등록됐습니다. 프로필 > 문의사항에서 확인하세요.`,
      type: 'info',
      created_by: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
