import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import MeetingDetailClient from './MeetingDetailClient';

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [
    { data: meeting },
    { data: players },
    { data: attendances },
    { data: matches },
    { data: activeQuarter },
  ] = await Promise.all([
    supabase.from('meetings').select('id, number, held_at, status, note').eq('id', id).maybeSingle(),
    supabase.from('players').select('id, nickname, username').eq('is_active', true).order('nickname'),
    supabase.from('meeting_attendances').select('player_id, status, voted').eq('meeting_id', id),
    supabase.from('matches').select('id, game_type, played_at, note, match_participants(player_id, team, rank, role, is_winner, is_mvp, chip_change)').eq('meeting_id', id).order('played_at'),
    supabase.from('quarters').select('id, name').eq('is_active', true).maybeSingle(),
  ]);

  if (!meeting) notFound();

  // player map
  const pmap = Object.fromEntries((players ?? []).map(p => [p.id, p]));

  const enrichedMatches = (matches ?? []).map(m => ({
    ...m,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    participants: ((m.match_participants as any[]) ?? []).map((mp: { player_id: string; team: string | null; rank: number | null; role: string | null; is_winner: boolean | null; is_mvp: boolean; chip_change: number }) => ({
      ...mp,
      player: pmap[mp.player_id] ?? { id: mp.player_id, nickname: '?', username: '' },
    })),
  }));

  return (
    <MeetingDetailClient
      meeting={meeting}
      players={players ?? []}
      attendances={attendances ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matches={enrichedMatches as any}
      activeQuarterId={(activeQuarter as { id?: string } | null)?.id ?? null}
      activeQuarterName={(activeQuarter as { name?: string } | null)?.name ?? null}
    />
  );
}
