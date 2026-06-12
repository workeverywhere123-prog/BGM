import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createSupabaseAdminClient();

  const [raffleRes, entryRes] = await Promise.all([
    supabase
      .from('raffles')
      .select('id, name, prize, description, status, created_at, ends_at, drawn_at, winner_id, quarter_id')
      .order('created_at', { ascending: false }),
    supabase
      .from('raffle_entries')
      .select('raffle_id, tickets'),
  ]);

  const raffles = raffleRes.data ?? [];
  const entries = entryRes.data ?? [];

  // Aggregate entry counts per raffle
  const countMap: Record<string, { count: number; total: number }> = {};
  for (const e of entries) {
    if (!countMap[e.raffle_id]) countMap[e.raffle_id] = { count: 0, total: 0 };
    countMap[e.raffle_id].count++;
    countMap[e.raffle_id].total += e.tickets;
  }

  // Fetch winner names
  const winnerIds = raffles.filter(r => r.winner_id).map(r => r.winner_id!);
  const winnerMap: Record<string, { nickname: string; username: string }> = {};
  if (winnerIds.length) {
    const { data: winners } = await supabase
      .from('players')
      .select('id, nickname, username')
      .in('id', winnerIds);
    for (const w of winners ?? []) winnerMap[w.id] = { nickname: w.nickname, username: w.username };
  }

  const result = raffles.map(r => ({
    ...r,
    entry_count: countMap[r.id]?.count ?? 0,
    total_tickets: countMap[r.id]?.total ?? 0,
    winner_nickname: r.winner_id ? (winnerMap[r.winner_id]?.nickname ?? null) : null,
    winner_username: r.winner_id ? (winnerMap[r.winner_id]?.username ?? null) : null,
  }));

  return NextResponse.json({ raffles: result });
}
