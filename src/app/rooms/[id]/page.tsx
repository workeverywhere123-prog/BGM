import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';
import RoomDetail from './RoomDetail';
import Nav from '../../nav';
import Footer from '../../footer';

export const dynamic = 'force-dynamic';

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: room } = await supabase
    .from('rooms')
    .select('id, title, location, scheduled_at, game_types, max_players, status, note, host_id, youtube_url, last_match_id, games_json, game_order_json, team_result_json, is_online, boardlife_game_id, boardlife_game_name, boardlife_game_thumb, ready_player_ids, started_at, league_match_id, room_members(player_id, bring_game_ids, is_spectator)')
    .eq('id', id)
    .maybeSingle();

  if (!room) notFound();

  const allRoomMembers = room.room_members as { player_id: string; bring_game_ids: string[]; is_spectator: boolean }[];
  const memberIds = allRoomMembers.map(m => m.player_id);
  const allIds = [...new Set([room.host_id, ...memberIds])];

  const { data: players } = await supabase.from('players').select('id, nickname, username, avatar_url').in('id', allIds);
  const pmap = Object.fromEntries((players ?? []).map(p => [p.id, p]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = null;
  try { user = await getSessionUser(); } catch {}

  // MVP vote data (only relevant during 'voting' status)
  const mvpVotes: Record<string, number> = {};
  let userVote: string | null = null;
  if (room.status === 'voting') {
    const { data: votes } = await supabase.from('room_mvp_votes').select('voter_id, nominee_id').eq('room_id', id);
    if (votes) {
      for (const v of votes) {
        mvpVotes[v.nominee_id] = (mvpVotes[v.nominee_id] ?? 0) + 1;
        if (user && v.voter_id === user.id) userVote = v.nominee_id;
      }
    }
  }

  // Auto-add user as spectator if logged in and not already in the room
  if (user && ['open', 'full', 'playing'].includes(room.status)) {
    const alreadyIn = allRoomMembers.some(m => m.player_id === user.id);
    if (!alreadyIn) {
      await supabase.from('room_members').insert({ room_id: id, player_id: user.id, is_spectator: true }).select().maybeSingle();
      // Re-fetch spectators to include the new one
      const { data: newPlayer } = await supabase.from('players').select('id, nickname, username, avatar_url').eq('id', user.id).single();
      if (newPlayer) {
        allRoomMembers.push({ player_id: user.id, bring_game_ids: [], is_spectator: true });
        pmap[user.id] = newPlayer;
      }
    }
  }

  // League match info (if room is linked to a league match)
  let leagueMatchPlayerIds: string[] = [];
  const leagueMatchId: string | null = (room as unknown as { league_match_id?: string | null }).league_match_id ?? null;
  if (leagueMatchId) {
    const { data: matchPlayers } = await supabase
      .from('league_match_players')
      .select('player_id')
      .eq('match_id', leagueMatchId);
    leagueMatchPlayerIds = (matchPlayers ?? []).map(mp => mp.player_id);
  }

  // Pending invitation for current user
  let pendingInvite: { id: string; inviter_id: string } | null = null;
  if (user) {
    const { data: inv } = await supabase
      .from('room_invitations')
      .select('id, inviter_id')
      .eq('room_id', id)
      .eq('invitee_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();
    pendingInvite = inv ?? null;
  }

  // Pending invitations sent by host (for host view)
  let pendingInvitations: { invitee_id: string; invitee: { nickname: string; username: string } }[] = [];
  if (user && room.host_id === user.id) {
    const { data: invs } = await supabase
      .from('room_invitations')
      .select('invitee_id')
      .eq('room_id', id)
      .eq('status', 'pending');
    if (invs?.length) {
      const inviteeIds = invs.map(i => i.invitee_id);
      const { data: inviteePlayers } = await supabase.from('players').select('id, nickname, username').in('id', inviteeIds);
      const ipmap = Object.fromEntries((inviteePlayers ?? []).map(p => [p.id, p]));
      pendingInvitations = invs.map(i => ({ invitee_id: i.invitee_id, invitee: ipmap[i.invitee_id] ?? { nickname: '?', username: '' } }));
    }
  }

  const enriched = {
    ...room,
    host: pmap[room.host_id] ?? { id: room.host_id, nickname: '?', username: '' },
    members: allRoomMembers.filter(m => !m.is_spectator).map(m => ({
      ...pmap[m.player_id], bring_game_ids: m.bring_game_ids ?? [],
    })).filter(m => m.id),
    spectators: allRoomMembers.filter(m => m.is_spectator).map(m => ({
      ...pmap[m.player_id],
    })).filter(m => m.id),
  };

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <RoomDetail room={enriched as any} currentUserId={user?.id ?? null} initialMvpVotes={mvpVotes} initialUserVote={userVote} pendingInvite={pendingInvite} initialPendingInvitations={pendingInvitations} leagueMatchId={leagueMatchId} leagueMatchPlayerIds={leagueMatchPlayerIds} />
      </div>
      <Footer />
    </>
  );
}
