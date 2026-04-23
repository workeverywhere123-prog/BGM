import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const supabase = await createSupabaseServerClient();
    const { action } = await req.json();

    if (action === 'join') {
      const { data: room } = await supabase.from('rooms').select('max_players, status, host_id').eq('id', id).single();
      if (!room || room.status === 'closed') return NextResponse.json({ error: '입장할 수 없는 방입니다' }, { status: 400 });

      const { count } = await supabase.from('room_members').select('*', { count: 'exact', head: true }).eq('room_id', id);
      if ((count ?? 0) >= room.max_players) return NextResponse.json({ error: '방이 꽉 찼습니다' }, { status: 400 });

      const { error } = await supabase.from('room_members').insert({ room_id: id, player_id: user.id });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const newCount = (count ?? 0) + 1;
      if (newCount >= room.max_players) {
        await supabase.from('rooms').update({ status: 'full' }).eq('id', id);
      }

      const { data: player } = await supabase.from('players').select('id, nickname, username').eq('id', user.id).single();
      return NextResponse.json({ ok: true, player, status: newCount >= room.max_players ? 'full' : 'open' });
    }

    if (action === 'leave') {
      const { data: room } = await supabase.from('rooms').select('host_id, status').eq('id', id).single();
      if (room?.host_id === user.id) return NextResponse.json({ error: '방장은 퇴장할 수 없습니다. 방을 닫아주세요.' }, { status: 400 });

      await supabase.from('room_members').delete().eq('room_id', id).eq('player_id', user.id);
      if (room?.status === 'full') {
        await supabase.from('rooms').update({ status: 'open' }).eq('id', id);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'close') {
      const { data: room } = await supabase.from('rooms').select('host_id').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

      await supabase.from('rooms').update({ status: 'closed' }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
