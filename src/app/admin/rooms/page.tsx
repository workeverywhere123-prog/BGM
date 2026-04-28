import { createSupabaseServerClient } from '@/lib/supabase/server';
import AdminRoomsClient from './AdminRoomsClient';

export default async function AdminRoomsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, title, location, scheduled_at, game_types, max_players, status, host_id, created_at, room_members(player_id)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!rooms?.length) return <AdminRoomsClient initialRooms={[]} />;

  const hostIds = [...new Set(rooms.map(r => r.host_id))];
  const memberIds = [...new Set(rooms.flatMap(r => (r.room_members as { player_id: string }[]).map(m => m.player_id)))];
  const allIds = [...new Set([...hostIds, ...memberIds])];

  const { data: players } = await supabase.from('players').select('id, nickname, username').in('id', allIds);
  const pmap = Object.fromEntries((players ?? []).map(p => [p.id, p]));

  const enriched = rooms.map(r => ({
    ...r,
    host: pmap[r.host_id] ?? { id: r.host_id, nickname: '알 수 없음', username: '' },
    members: (r.room_members as { player_id: string }[]).map(m => pmap[m.player_id]).filter(Boolean),
  }));

  return <AdminRoomsClient initialRooms={enriched as never[]} />;
}
