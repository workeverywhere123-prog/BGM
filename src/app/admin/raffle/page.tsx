import { createSupabaseServiceClient as createSupabaseAdminClient } from '@/lib/supabase/service';
import type { RaffleRow } from './types';
import RaffleAdminClient from './RaffleAdminClient';

async function getData() {
  const supabase = createSupabaseAdminClient();

  const [raffleRes, entryRes, quarterRes] = await Promise.all([
    supabase
      .from('raffles')
      .select('id, name, prize, description, status, created_at, ends_at, drawn_at, winner_id, quarter_id')
      .order('created_at', { ascending: false }),
    supabase
      .from('raffle_entries')
      .select('raffle_id, tickets'),
    supabase
      .from('quarters')
      .select('id, name')
      .order('created_at', { ascending: false }),
  ]);

  const raffles = (raffleRes.data ?? []) as {
    id: string; name: string; prize: string; description: string | null;
    status: string; created_at: string; ends_at: string | null;
    drawn_at: string | null; winner_id: string | null; quarter_id: string | null;
  }[];
  const entries = entryRes.data ?? [];
  const quarters = (quarterRes.data ?? []) as { id: string; name: string }[];

  // Aggregate entry counts
  const countMap: Record<string, { count: number; total: number }> = {};
  for (const e of entries) {
    if (!countMap[e.raffle_id]) countMap[e.raffle_id] = { count: 0, total: 0 };
    countMap[e.raffle_id].count++;
    countMap[e.raffle_id].total += e.tickets;
  }

  // Winner names
  const winnerIds = raffles.filter(r => r.winner_id).map(r => r.winner_id!);
  const winnerMap: Record<string, { nickname: string; username: string }> = {};
  if (winnerIds.length) {
    const { data: winners } = await supabase
      .from('players')
      .select('id, nickname, username')
      .in('id', winnerIds);
    for (const w of winners ?? []) winnerMap[w.id] = { nickname: w.nickname, username: w.username };
  }

  const result: RaffleRow[] = raffles.map(r => ({
    id: r.id,
    name: r.name,
    prize: r.prize,
    description: r.description,
    status: r.status as RaffleRow['status'],
    created_at: r.created_at,
    ends_at: r.ends_at,
    drawn_at: r.drawn_at,
    winner_id: r.winner_id,
    winner_nickname: r.winner_id ? (winnerMap[r.winner_id]?.nickname ?? null) : null,
    winner_username: r.winner_id ? (winnerMap[r.winner_id]?.username ?? null) : null,
    entry_count: countMap[r.id]?.count ?? 0,
    total_tickets: countMap[r.id]?.total ?? 0,
  }));

  return { raffles: result, quarters };
}

export default async function AdminRafflePage() {
  const { raffles, quarters } = await getData();
  return <RaffleAdminClient initialRaffles={raffles} quarters={quarters} />;
}
