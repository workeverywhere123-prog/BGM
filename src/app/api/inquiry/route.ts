import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from('inquiries')
      .select('id, title, message, status, admin_reply, replied_at, created_at')
      .eq('player_id', user.id)
      .order('created_at', { ascending: false });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([], { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();
    const { title, message } = await req.json() as { title: string; message: string };
    if (!title || !message) return NextResponse.json({ error: '제목과 내용을 입력하세요' }, { status: 400 });

    const { data, error } = await supabase
      .from('inquiries')
      .insert({ player_id: user.id, title, message })
      .select('id, title, message, status, admin_reply, replied_at, created_at')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 어드민에게 알림
    const { data: admins } = await supabase.from('players').select('id').eq('is_admin', true);
    if (admins?.length) {
      const { data: sender } = await supabase.from('players').select('nickname').eq('id', user.id).single();
      await supabase.from('notifications').insert(
        admins.map(a => ({
          player_id: a.id,
          title: '📩 새 문의가 도착했습니다',
          message: `${sender?.nickname ?? '플레이어'}님의 문의: "${title}"`,
          type: 'info',
          created_by: user.id,
        }))
      );
    }

    return NextResponse.json({ ok: true, inquiry: data });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
