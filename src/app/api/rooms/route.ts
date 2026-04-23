import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, title, location, scheduled_at, game_types, max_players, status, note, host_id, room_members(player_id)')
      .in('status', ['open', 'full'])
      .order('scheduled_at', { ascending: true });

    if (!rooms?.length) return NextResponse.json([]);

    const hostIds = [...new Set(rooms.map(r => r.host_id))];
    const memberIds = [...new Set(rooms.flatMap(r => (r.room_members as { player_id: string }[]).map(m => m.player_id)))];
    const allIds = [...new Set([...hostIds, ...memberIds])];

    const { data: players } = await supabase.from('players').select('id, nickname, username').in('id', allIds);
    const pmap = Object.fromEntries((players ?? []).map(p => [p.id, p]));

    return NextResponse.json(rooms.map(r => ({
      ...r,
      host: pmap[r.host_id] ?? { nickname: '알 수 없음', username: '' },
      members: (r.room_members as { player_id: string }[]).map(m => pmap[m.player_id]).filter(Boolean),
    })));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const supabase = await createSupabaseServerClient();
    const { title, location, scheduled_at, game_types, max_players, note } = await req.json();

    if (!location || !scheduled_at) {
      return NextResponse.json({ error: '장소와 일시를 입력해주세요' }, { status: 400 });
    }

    const { data: room, error } = await supabase
      .from('rooms')
      .insert({ host_id: user.id, title: title || null, location, scheduled_at, game_types: game_types ?? [], max_players: max_players ?? 6, note: note || null })
      .select('id, title, location, scheduled_at, game_types, max_players, status, note, host_id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from('room_members').insert({ room_id: room.id, player_id: user.id });

    const { data: hostPlayer } = await supabase.from('players').select('id, nickname, username').eq('id', user.id).single();

    return NextResponse.json({
      ...room,
      host: hostPlayer,
      members: [hostPlayer],
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
