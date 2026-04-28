import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

// POST: admin creates a room for a league match
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: league_id } = await params;
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();

    const { data: admin } = await supabase.from('players').select('is_admin').eq('id', user.id).single();
    if (!admin?.is_admin) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

    const { match_id } = await req.json();
    if (!match_id) return NextResponse.json({ error: 'match_id 필요' }, { status: 400 });

    // Get match info
    const { data: match } = await supabase
      .from('league_matches')
      .select('id, round, match_index, scheduled_date, league_id, league_match_players(player_id)')
      .eq('id', match_id)
      .eq('league_id', league_id)
      .single();
    if (!match) return NextResponse.json({ error: '경기를 찾을 수 없습니다' }, { status: 404 });

    // Check if room already exists
    const { data: existingRoom } = await supabase
      .from('rooms')
      .select('id')
      .eq('league_match_id', match_id)
      .maybeSingle();
    if (existingRoom) return NextResponse.json({ room_id: existingRoom.id, already_exists: true });

    const { data: league } = await supabase.from('leagues').select('name, players_per_game').eq('id', league_id).single();
    const roundLabel = `${match.round}라운드 ${match.match_index + 1}경기`;
    const scheduled_at = match.scheduled_date
      ? new Date(match.scheduled_date).toISOString()
      : new Date().toISOString();

    // Create the room
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .insert({
        title: `[리그] ${league?.name ?? ''} — ${roundLabel}`,
        location: '리그 경기',
        scheduled_at,
        max_players: league?.players_per_game ?? 4,
        status: 'open',
        host_id: user.id,
        game_types: ['순위전'],
        league_match_id: match_id,
        is_online: false,
        ready_player_ids: [],
      })
      .select('id')
      .single();
    if (roomErr || !room) return NextResponse.json({ error: roomErr?.message ?? '방 생성 실패' }, { status: 500 });

    // Add host as member first
    await supabase.from('room_members').insert({ room_id: room.id, player_id: user.id, is_spectator: false });

    // Add match players as members
    const matchPlayerIds = (match.league_match_players as { player_id: string }[]).map(mp => mp.player_id);
    for (const pid of matchPlayerIds) {
      if (pid === user.id) continue;
      await supabase.from('room_members').upsert(
        { room_id: room.id, player_id: pid, is_spectator: false },
        { onConflict: 'room_id,player_id' }
      );
    }

    return NextResponse.json({ ok: true, room_id: room.id });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
