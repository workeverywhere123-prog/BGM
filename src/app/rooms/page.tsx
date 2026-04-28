import Nav from '../nav';
import { isSupabaseConfigured } from '@/lib/env';
import { getSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import RoomsClient from './RoomsClient';
import Footer from '../footer';

export const dynamic = 'force-dynamic';

async function getRooms() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, title, location, scheduled_at, game_types, max_players, status, note, host_id, boardlife_game_id, boardlife_game_name, boardlife_game_thumb, games_json, is_online, room_members(player_id, is_spectator)')
      .in('status', ['open', 'full', 'playing'])
      .order('scheduled_at', { ascending: true });

    if (!rooms?.length) return [];

    const hostIds = [...new Set(rooms.map(r => r.host_id))];
    const allRoomMembers = rooms.flatMap(r => r.room_members as { player_id: string; is_spectator: boolean }[]);
    const memberIds = [...new Set(allRoomMembers.map(m => m.player_id))];
    const allIds = [...new Set([...hostIds, ...memberIds])];

    const { data: players } = await supabase.from('players').select('id, nickname, username, avatar_url').in('id', allIds);
    const pmap = Object.fromEntries((players ?? []).map(p => [p.id, p]));

    return rooms.map(r => {
      const rm = r.room_members as { player_id: string; is_spectator: boolean }[];
      return {
        ...r,
        host: pmap[r.host_id] ?? { id: r.host_id, nickname: '알 수 없음', username: '' },
        members: rm.filter(m => !m.is_spectator).map(m => pmap[m.player_id]).filter(Boolean),
        spectators: rm.filter(m => m.is_spectator).map(m => pmap[m.player_id]).filter(Boolean),
      };
    });
  } catch { return []; }
}

export default async function RoomsPage() {
  const configured = isSupabaseConfigured();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = null;
  let userGames: { id: string; name: string; thumbnail_url: string | null }[] = [];
  if (configured) {
    try {
      user = await getSessionUser();
      if (user) {
        const supabase = await createSupabaseServerClient();
        const { data } = await supabase
          .from('player_games')
          .select('id, name, thumbnail_url')
          .eq('player_id', user.id)
          .eq('is_available', true)
          .order('name');
        userGames = data ?? [];
      }
    } catch {}
  }
  const rooms = configured ? await getRooms() : [];

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <RoomsClient initialRooms={rooms as any[]} currentUserId={user?.id ?? null} currentUserNickname={user?.nickname ?? null} userGames={userGames} />
      </div>
      <Footer />
    </>
  );
}
