import Nav from '../nav';
import { isSupabaseConfigured } from '@/lib/env';
import { getSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import RoomsClient from './RoomsClient';

async function getRooms() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, title, location, scheduled_at, game_types, max_players, status, note, host_id, room_members(player_id)')
      .in('status', ['open', 'full'])
      .order('scheduled_at', { ascending: true });

    if (!rooms?.length) return [];

    const hostIds = [...new Set(rooms.map(r => r.host_id))];
    const memberIds = [...new Set(rooms.flatMap(r => (r.room_members as { player_id: string }[]).map(m => m.player_id)))];
    const allIds = [...new Set([...hostIds, ...memberIds])];

    const { data: players } = await supabase.from('players').select('id, nickname, username').in('id', allIds);
    const pmap = Object.fromEntries((players ?? []).map(p => [p.id, p]));

    return rooms.map(r => ({
      ...r,
      host: pmap[r.host_id] ?? { id: r.host_id, nickname: '알 수 없음', username: '' },
      members: (r.room_members as { player_id: string }[]).map(m => pmap[m.player_id]).filter(Boolean),
    }));
  } catch { return []; }
}

export default async function RoomsPage() {
  const configured = isSupabaseConfigured();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = null;
  if (configured) {
    try { user = await getSessionUser(); } catch {}
  }
  const rooms = configured ? await getRooms() : [];

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <RoomsClient initialRooms={rooms as any[]} currentUserId={user?.id ?? null} currentUserNickname={user?.nickname ?? null} />
      </div>
      <footer className="bgm-footer">
        <div className="footer-logo">BGM</div>
        <div className="footer-copy">© 2026 Boardgame in Melbourne.</div>
        <div className="footer-links"><a href="#">인스타그램</a><a href="#">디스코드</a></div>
      </footer>
    </>
  );
}
