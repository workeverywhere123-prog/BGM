import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

// GET: 내 알림 목록
export async function GET() {
  try {
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, type, read_at, created_at')
      .eq('player_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([], { status: 401 });
  }
}

// POST: 어드민 알림 발송
export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();

    const { data: adminCheck } = await supabase.from('players').select('is_admin').eq('id', user.id).single();
    if (!adminCheck?.is_admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

    const body = await req.json();
    const { title, message, type, target } = body as {
      title: string; message: string; type: string; target: 'all' | string;
    };
    if (!title || !message) return NextResponse.json({ error: '제목과 내용을 입력하세요' }, { status: 400 });

    if (target === 'all') {
      const { data: players } = await supabase.from('players').select('id');
      const notifs = (players ?? []).map(p => ({
        player_id: p.id, title, message, type: type || 'info', created_by: user.id,
      }));
      await supabase.from('notifications').insert(notifs);
      return NextResponse.json({ ok: true, count: notifs.length });
    } else {
      await supabase.from('notifications').insert({
        player_id: target, title, message, type: type || 'info', created_by: user.id,
      });
      return NextResponse.json({ ok: true, count: 1 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
