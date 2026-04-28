import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const boardlife_id = req.nextUrl.searchParams.get('boardlife_id') ?? '';
  if (!boardlife_id) return NextResponse.json({ error: 'missing boardlife_id' }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  const [{ data: ownerGames }, { count: play_count }, { data: recentPlays }] = await Promise.all([
    supabase
      .from('player_games')
      .select('id, note, players(id, nickname, username)')
      .eq('boardlife_id', boardlife_id),
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('boardlife_game_id', boardlife_id),
    supabase
      .from('matches')
      .select('id, played_at')
      .eq('boardlife_game_id', boardlife_id)
      .order('played_at', { ascending: false })
      .limit(5),
  ]);

  let is_owned = false;
  let owned_game_id: string | null = null;
  try {
    const user = await getSessionUser();
    if (!user) throw new Error('no user');
    const { data: ug } = await supabase
      .from('player_games')
      .select('id')
      .eq('player_id', user.id)
      .eq('boardlife_id', boardlife_id)
      .maybeSingle();
    is_owned = !!ug;
    owned_game_id = ug?.id ?? null;
  } catch {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const owners = (ownerGames ?? []).map((og: any) => {
    const p = Array.isArray(og.players) ? og.players[0] : og.players;
    if (!p) return null;
    return { id: p.id as string, nickname: p.nickname as string, username: p.username as string, note: og.note as string | null };
  }).filter((o): o is { id: string; nickname: string; username: string; note: string | null } => o !== null);

  return NextResponse.json({
    owners,
    play_count: play_count ?? 0,
    recent_plays: recentPlays ?? [],
    is_owned,
    owned_game_id,
  });
}
