import { createSupabaseServerClient } from '@/lib/supabase/server';
import LapisClient, { type TxRow, type PlayerOption } from './LapisClient';

async function getData() {
  const supabase = await createSupabaseServerClient();

  const [txResult, playerResult, chipResult] = await Promise.all([
    supabase
      .from('chip_transactions')
      .select(`
        id, player_id, tx_type, amount, note, created_at, match_id, meeting_id,
        players(nickname, username)
      `)
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('players')
      .select('id, nickname, username')
      .eq('is_active', true)
      .order('nickname'),
    supabase
      .from('player_chip_totals')
      .select('player_id, total_chips'),
  ]);

  const chipMap = Object.fromEntries(
    ((chipResult.data ?? []) as { player_id: string; total_chips: number }[])
      .map(c => [c.player_id, c.total_chips])
  );

  const players: PlayerOption[] = ((playerResult.data ?? []) as { id: string; nickname: string; username: string }[]).map(p => ({
    ...p,
    total: chipMap[p.id] ?? 0,
  }));

  return {
    transactions: (txResult.data ?? []) as unknown as TxRow[],
    players,
  };
}

export default async function AdminLapisPage() {
  const { transactions, players } = await getData();
  return <LapisClient transactions={transactions} players={players} />;
}
