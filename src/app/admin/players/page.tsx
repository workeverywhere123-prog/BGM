import { createSupabaseServerClient } from '@/lib/supabase/server';
import AdminPlayersClient from './AdminPlayersClient';

export default async function AdminPlayersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: players } = await supabase
    .from('players')
    .select('id, username, nickname, is_admin, is_active, created_at')
    .order('created_at', { ascending: false });

  const { data: chips } = await supabase
    .from('player_chip_totals')
    .select('player_id, total_chips');

  const chipMap = Object.fromEntries((chips ?? []).map((c: { player_id: string; total_chips: number }) => [c.player_id, c.total_chips]));

  const enriched = (players ?? []).map((p: { id: string; username: string; nickname: string; is_admin: boolean; is_active: boolean; created_at: string }) => ({
    ...p, total_chips: chipMap[p.id] ?? 0,
  }));

  return <AdminPlayersClient players={enriched} />;
}
