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
    { data: rsvps },
    { data: activeQuarter },
  ] = await Promise.all([
    supabase.from('meetings').select('id, number, held_at, status, note, rsvp_deadline, rsvp_processed').eq('id', id).maybeSingle(),
    supabase.from('players').select('id, nickname, username, avatar_url').eq('is_active', true).order('nickname'),
    supabase.from('meeting_attendances').select('player_id, status, voted').eq('meeting_id', id),
    supabase.from('meeting_rsvps').select('player_id, status, players(id, nickname, username, avatar_url)').eq('meeting_id', id),
    supabase.from('quarters').select('id, name').eq('is_active', true).maybeSingle(),
  ]);

  if (!meeting) notFound();

  return (
    <MeetingDetailClient
      meeting={meeting as typeof meeting & { rsvp_deadline: string | null; rsvp_processed: boolean }}
      players={players ?? []}
      attendances={attendances ?? []}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rsvps={rsvps as any[] ?? []}
      activeQuarterId={(activeQuarter as { id?: string } | null)?.id ?? null}
      activeQuarterName={(activeQuarter as { name?: string } | null)?.name ?? null}
    />
  );
}
