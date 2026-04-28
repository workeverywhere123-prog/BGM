import { createSupabaseServerClient } from '@/lib/supabase/server';
import AdminPlayersClient from './AdminPlayersClient';

export default async function AdminPlayersPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: players }, { data: chips }, { data: quarterData }, { data: activeQ }] = await Promise.all([
    supabase.from('players').select('id, username, nickname, is_admin, created_at, discord_id').order('created_at', { ascending: false }),
    supabase.from('player_chip_totals').select('player_id, total_chips'),
    supabase.from('player_active_quarter_totals').select('player_id, quarter_points'),
    supabase.from('quarters').select('id').eq('is_active', true).maybeSingle(),
  ]);

  const chipMap    = Object.fromEntries((chips ?? []).map((c: { player_id: string; total_chips: number }) => [c.player_id, c.total_chips]));
  const quarterMap = Object.fromEntries((quarterData ?? []).map((c: { player_id: string; quarter_points: number }) => [c.player_id, c.quarter_points]));

  const enriched = (players ?? []).map((p: { id: string; username: string; nickname: string; is_admin: boolean; created_at: string; discord_id: string | null }) => ({
    ...p,
    total_chips:    chipMap[p.id]    ?? 0,
    quarter_points: quarterMap[p.id] ?? 0,
  }));

  return <AdminPlayersClient players={enriched} activeQuarterId={activeQ?.id ?? null} />;
}
