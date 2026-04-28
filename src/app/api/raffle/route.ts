import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();

    const { data: adminCheck } = await supabase.from('players').select('is_admin').eq('id', user.id).single();
    if (!adminCheck?.is_admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

    const body = await req.json();
    const { name, prize, description, quarter_id, starts_at, ends_at } = body as {
      name: string; prize: string; description?: string;
      quarter_id?: string; starts_at?: string; ends_at?: string;
    };
    if (!name || !prize) return NextResponse.json({ error: '이름과 상품을 입력하세요' }, { status: 400 });

    const { data, error } = await supabase.from('raffles').insert({
      name,
      prize,
      description: description || null,
      quarter_id: quarter_id || null,  // fix: empty string → null
      starts_at: starts_at || new Date().toISOString(),
      ends_at: ends_at || null,
      created_by: user.id,
    }).select('id').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 전체 플레이어에게 알림 발송
    const { data: allPlayers } = await supabase.from('players').select('id');
    if (allPlayers?.length) {
      const notifs = allPlayers.map(p => ({
        player_id: p.id,
        title: '🎲 새 추첨 시작!',
        message: `"${name}" 추첨이 시작됐습니다.\n\n상품: ${prize}${ends_at ? `\n마감: ${new Date(ends_at).toLocaleDateString('ko-KR')}` : ''}`,
        type: 'raffle' as const,
        created_by: user.id,
      }));
      await supabase.from('notifications').insert(notifs);
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
