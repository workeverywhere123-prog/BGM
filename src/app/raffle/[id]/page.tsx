import { notFound } from 'next/navigation';
import Nav from '../../nav';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';
import RaffleDetail from './RaffleDetail';
import Footer from '../../footer';

export const dynamic = 'force-dynamic';

export default async function RaffleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: raffle } = await supabase
    .from('raffles')
    .select('id, name, prize, description, status, drawn_at, winner_id, created_at, quarter_id')
    .eq('id', id)
    .maybeSingle();

  if (!raffle) notFound();

  const { data: entries } = await supabase
    .from('raffle_entries')
    .select('player_id, tickets, created_at')
    .eq('raffle_id', id)
    .order('tickets', { ascending: false });

  const playerIds = [...new Set((entries ?? []).map(e => e.player_id))];
  let playerMap: Record<string, { nickname: string; username: string }> = {};
  if (playerIds.length) {
    const { data: players } = await supabase.from('players').select('id, nickname, username').in('id', playerIds);
    playerMap = Object.fromEntries((players ?? []).map(p => [p.id, p]));
  }

  let winner = null;
  if (raffle.winner_id) {
    const { data: w } = await supabase.from('players').select('id, nickname, username').eq('id', raffle.winner_id).single();
    winner = w;
  }

  let user = null;
  try { user = await getSessionUser(); } catch {}

  let myBalance = 0;
  let myEntry = null;
  let isAdmin = false;

  if (user) {
    const { data: txs } = await supabase.from('chip_transactions').select('amount').eq('player_id', user.id);
    myBalance = (txs ?? []).reduce((s, r) => s + r.amount, 0);
    myEntry = (entries ?? []).find(e => e.player_id === user.id) ?? null;
    const { data: adminCheck } = await supabase.from('players').select('is_admin').eq('id', user.id).maybeSingle();
    isAdmin = adminCheck?.is_admin ?? false;
  }

  const totalTickets = (entries ?? []).reduce((s, e) => s + e.tickets, 0);
  const enrichedEntries = (entries ?? []).map(e => ({
    ...e,
    player: playerMap[e.player_id] ?? { nickname: '?', username: '' },
  }));

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <RaffleDetail
          raffle={raffle}
          entries={enrichedEntries}
          totalTickets={totalTickets}
          winner={winner}
          currentUserId={user?.id ?? null}
          myBalance={myBalance}
          myEntry={myEntry}
          isAdmin={isAdmin}
        />
      </div>
      <Footer />
    </>
  );
}
