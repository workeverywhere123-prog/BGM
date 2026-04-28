import { notFound } from 'next/navigation';
import Nav from '../../nav';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/env';
import Footer from '../../footer';
import LeagueAvailability from './LeagueAvailability';
import MatchRoomButton from './MatchRoomButton';

export const dynamic = 'force-dynamic';

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtShortDate(s: string | null) {
  if (!s) return null;
  return new Date(s + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

// Discord channel assignment by match_index (0-based within round)
function discordChannels(match_index: number) {
  const n = match_index + 1;
  return {
    game: `리그-${n}번-게임방`,
    spectator: `리그-${n}번-관전방`,
  };
}

type MatchPlayer = {
  id: string; player_id: string; rank: number | null; score: number | null; points_earned: number;
  player: { nickname: string; username: string };
};
type ScheduleMatch = {
  id: string; round: number; match_index: number; status: string; played_at: string | null;
  scheduled_date: string | null;
  matchPlayers: MatchPlayer[];
  room_id: string | null;
};

export default async function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  let sessionUser = null;
  if (isSupabaseConfigured()) {
    try { sessionUser = await getSessionUser(); } catch {}
  }

  const { data: league } = await supabase
    .from('leagues')
    .select(`
      id, name, description, start_date, end_date, is_active, prizes, created_at, players_per_game,
      league_participants(id, player_id, score, rank, note),
      league_matches(
        id, round, match_index, status, played_at, scheduled_date,
        league_match_players(id, player_id, rank, score, points_earned)
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (!league) notFound();

  type RawLP = { id: string; player_id: string; score: number; rank: number | null; note: string | null };
  type RawMP = { id: string; player_id: string; rank: number | null; score: number | null; points_earned: number };
  type RawMatch = { id: string; round: number; match_index: number; status: string; played_at: string | null; scheduled_date: string | null; league_match_players: RawMP[] };

  const rawMatches = ((league as unknown as { league_matches?: RawMatch[] }).league_matches ?? []);

  // Collect all player IDs
  const participantIds = (league.league_participants as RawLP[]).map(p => p.player_id);
  const matchPlayerIds = rawMatches.flatMap(m => m.league_match_players.map(mp => mp.player_id));
  const allIds = [...new Set([...participantIds, ...matchPlayerIds])];

  const { data: players } = await supabase
    .from('players').select('id, nickname, username, is_admin')
    .in('id', allIds.length ? allIds : ['00000000-0000-0000-0000-000000000000']);
  const pmap = Object.fromEntries((players ?? []).map(p => [p.id, p]));

  // Check if current user is admin
  const isAdmin = sessionUser
    ? ((players ?? []).find(p => p.id === sessionUser!.id) as { is_admin?: boolean } | undefined)?.is_admin ?? false
    : false;

  const participants = (league.league_participants as RawLP[])
    .map(lp => ({ ...lp, player: pmap[lp.player_id] ?? { nickname: '?', username: '' } }))
    .sort((a, b) => b.score - a.score)
    .map((lp, i) => ({ ...lp, rank: lp.rank ?? i + 1 }));

  // Fetch rooms linked to league matches
  const matchIds = rawMatches.map(m => m.id);
  let roomMap: Record<string, string> = {};
  if (matchIds.length) {
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, league_match_id')
      .in('league_match_id', matchIds);
    roomMap = Object.fromEntries((rooms ?? []).map(r => [r.league_match_id as string, r.id]));
  }

  const allSchedule: ScheduleMatch[] = rawMatches
    .map(m => ({
      ...m,
      matchPlayers: m.league_match_players.map(mp => ({
        ...mp,
        player: pmap[mp.player_id] ?? { nickname: '?', username: '' },
      })),
      room_id: roomMap[m.id] ?? null,
    }))
    .sort((a, b) => a.round !== b.round ? a.round - b.round : a.match_index - b.match_index);

  // Round progression: show up to first incomplete round
  const totalRounds = allSchedule.length ? Math.max(...allSchedule.map(m => m.round)) : 0;
  let visibleUpToRound = 1;
  for (let r = 1; r <= totalRounds; r++) {
    const roundMatches = allSchedule.filter(m => m.round === r);
    const allDone = roundMatches.every(m => m.status === 'completed');
    visibleUpToRound = r;
    if (!allDone) break;
    if (r === totalRounds) visibleUpToRound = totalRounds;
  }
  const schedule = allSchedule.filter(m => m.round <= visibleUpToRound);

  const prizes: { rank: number; label: string; value: string }[] = Array.isArray(league.prizes) ? league.prizes as { rank: number; label: string; value: string }[] : [];
  const maxScore = Math.max(...participants.map(p => p.score), 1);
  const totalPlayers = participants.length;
  const playersPerGame = (league as unknown as { players_per_game: number }).players_per_game ?? 4;
  const participantSet = new Set(participants.map(p => p.player_id));

  // Availability data
  const { data: availData } = await supabase
    .from('league_player_availability')
    .select('player_id, available_date')
    .eq('league_id', id)
    .order('available_date');

  const matchesForAvailability = allSchedule
    .filter(m => m.status !== 'completed')
    .map(m => ({
      id: m.id,
      round: m.round,
      match_index: m.match_index,
      player_ids: m.matchPlayers.map(mp => mp.player_id),
      scheduled_date: m.scheduled_date,
    }));

  return (
    <>
      <Nav />
      <div style={{ minHeight: '100vh', paddingTop: '6rem' }}>

        {/* Hero */}
        <div style={{ position: 'relative', overflow: 'hidden', padding: '4rem 2rem 3rem', textAlign: 'center', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <Link href="/league" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>
            ← 리그 목록
          </Link>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', padding: '0.25rem 0.8rem', border: `1px solid ${league.is_active ? 'rgba(74,222,128,0.5)' : 'rgba(201,168,76,0.2)'}`, color: league.is_active ? '#4ade80' : 'var(--white-dim)' }}>
              {league.is_active ? '● 진행중' : '종료'}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', padding: '0.25rem 0.8rem', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--gold-dim)' }}>
              {playersPerGame}인 게임
            </span>
          </div>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: 'var(--foreground)', lineHeight: 1.1, marginBottom: '0.5rem' }}>{league.name}</h1>
          {league.description && (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.7, maxWidth: 600, margin: '0 auto 1rem' }}>{league.description}</p>
          )}
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em', color: 'var(--gold-dim)' }}>
            {fmtDate(league.start_date)} — {fmtDate(league.end_date)}
          </p>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 2rem 6rem' }}>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', marginBottom: '3rem' }}>
            {[
              { label: '참가자', value: `${totalPlayers}명` },
              { label: '게임 인원', value: `${playersPerGame}인` },
              { label: '총 경기', value: `${allSchedule.length}경기` },
              { label: '완료', value: `${allSchedule.filter(m => m.status === 'completed').length}경기` },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(30,74,52,0.2)', border: '1px solid rgba(201,168,76,0.1)', padding: '1.2rem', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--white-dim)', marginBottom: '0.3rem' }}>{s.label}</p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1.2rem', color: 'var(--gold)' }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: prizes.length ? '1fr 280px' : '1fr', gap: '2.5rem', alignItems: 'start' }}>

            {/* Standings */}
            <div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1.5rem' }}>STANDINGS — 순위표</p>

              {participants.length === 0 ? (
                <div className="board-empty"><p>참가자가 없습니다</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Top 3 podium */}
                  {participants.length >= 3 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                      {[1, 0, 2].map(idx => {
                        const p = participants[idx];
                        if (!p) return <div key={idx} />;
                        const podiumColors = ['#c9a84c', '#c8c8c8', '#a0732a'];
                        const podiumHeights = ['120px', '90px', '70px'];
                        const podiumRanks = [2, 1, 3];
                        const rank = podiumRanks[idx];
                        const pi = participants.findIndex(x => x.player_id === p.player_id);
                        const color = podiumColors[pi] ?? 'rgba(244,239,230,0.3)';
                        const height = podiumHeights[idx];
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <Link href={`/profile/${p.player.username}`} style={{ textDecoration: 'none', textAlign: 'center', marginBottom: '0.5rem' }}>
                              <div style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${color}`, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color, margin: '0 auto 0.3rem' }}>
                                {p.player.nickname[0]}
                              </div>
                              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)' }}>{p.player.nickname}</p>
                              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', color, fontWeight: 700 }}>{p.score}승점</p>
                            </Link>
                            <div style={{ width: '100%', height, background: `${color}18`, border: `1px solid ${color}44`, borderBottom: 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '0.5rem' }}>
                              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '1.6rem', color, fontWeight: 700 }}>{rank}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Full standings */}
                  <div style={{ border: '1px solid rgba(201,168,76,0.12)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 60px', gap: '0.8rem', padding: '0.6rem 1rem', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
                      <span>#</span><span>플레이어</span><span style={{ textAlign: 'center' }}>승점</span><span style={{ textAlign: 'center' }}>경기수</span>
                    </div>
                    {participants.map((p, i) => {
                      const rankColors = ['#c9a84c', '#c8c8c8', '#a0732a'];
                      const barColor = i === 0 ? '#c9a84c' : i === 1 ? '#c8c8c8' : i === 2 ? '#a0732a' : 'rgba(201,168,76,0.3)';
                      const gamesPlayed = allSchedule.filter(m => m.status === 'completed' && m.matchPlayers.some(mp => mp.player_id === p.player_id)).length;
                      return (
                        <div key={p.id} style={{
                          display: 'grid', gridTemplateColumns: '40px 1fr 80px 60px', gap: '0.8rem',
                          alignItems: 'center', padding: '0.9rem 1rem',
                          borderTop: i > 0 ? '1px solid rgba(201,168,76,0.06)' : 'none',
                          background: i === 0 ? 'rgba(201,168,76,0.06)' : 'transparent',
                          borderLeft: `3px solid ${i < 3 ? rankColors[i] : 'transparent'}`,
                        }}>
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: i < 3 ? '1.1rem' : '0.85rem', color: i < 3 ? rankColors[i] : 'rgba(244,239,230,0.3)', textAlign: 'center', fontWeight: 700 }}>
                            {i + 1}
                          </span>
                          <Link href={`/profile/${p.player.username}`} style={{ textDecoration: 'none' }}>
                            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>{p.player.nickname}</p>
                            <div style={{ marginTop: '0.3rem', height: 2, background: 'rgba(201,168,76,0.08)', width: '100%', maxWidth: 160 }}>
                              <div style={{ height: '100%', width: `${(p.score / maxScore) * 100}%`, background: barColor }} />
                            </div>
                          </Link>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: i < 3 ? rankColors[i] : 'var(--foreground)', fontWeight: i < 3 ? 700 : 400 }}>{p.score}</span>
                            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--white-dim)', opacity: 0.5, marginLeft: '0.2rem' }}>승점</span>
                          </div>
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', color: 'var(--white-dim)', opacity: 0.5, textAlign: 'center' }}>{gamesPlayed}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Prizes */}
            {prizes.length > 0 && (
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1.2rem' }}>PRIZES — 시상</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {prizes.map((prize, i) => (
                    <div key={i} style={{ padding: '1rem 1.2rem', background: i === 0 ? 'rgba(201,168,76,0.08)' : 'rgba(30,74,52,0.15)', border: `1px solid ${i === 0 ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.2rem' }}>{prize.label ?? `${prize.rank}위`}</p>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: 'var(--foreground)' }}>{prize.value}</p>
                      </div>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: i === 0 ? '#c9a84c' : i === 1 ? '#c8c8c8' : '#a0732a', fontWeight: 700 }}>{prize.rank}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Schedule */}
          {schedule.length > 0 && (
            <div style={{ marginTop: '4rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.5rem' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)' }}>
                  SCHEDULE — 경기 일정
                </p>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.5 }}>
                  {allSchedule.filter(m => m.status === 'completed').length}/{allSchedule.length}경기 완료 · {playersPerGame}인 게임
                </span>
                {visibleUpToRound < totalRounds && (
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'rgba(201,168,76,0.5)' }}>
                    ({visibleUpToRound}라운드까지 표시 — 이전 라운드 완료 후 다음 라운드 공개)
                  </span>
                )}
              </div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold-dim)', opacity: 0.6, marginBottom: '2rem' }}>
                승점: 1위={playersPerGame}승점 · 2위={playersPerGame - 1}승점 · ... · {playersPerGame}위=1승점
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {Array.from({ length: visibleUpToRound }, (_, i) => i + 1).map(round => {
                  const matches = schedule.filter(m => m.round === round);
                  const allPlayerIdsThisRound = new Set(matches.flatMap(m => m.matchPlayers.map(mp => mp.player_id)));
                  const sittingOut = [...participantSet].filter(pid => !allPlayerIdsThisRound.has(pid));
                  const roundDone = matches.every(m => m.status === 'completed');

                  return (
                    <div key={round}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.2em', color: roundDone ? 'var(--gold)' : 'var(--gold-dim)' }}>
                          {round}라운드
                        </span>
                        {roundDone && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: '#4ade80' }}>완료</span>}
                        {sittingOut.length > 0 && (
                          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.85rem', color: 'var(--white-dim)', opacity: 0.35, fontStyle: 'italic', marginLeft: 'auto' }}>
                            대기: {sittingOut.map(pid => participants.find(p => p.player_id === pid)?.player.nickname ?? '?').join(', ')}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                        {matches.map((match) => {
                          const isDone = match.status === 'completed';
                          const sorted = [...match.matchPlayers].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
                          const channels = discordChannels(match.match_index);
                          const scheduledLabel = fmtShortDate(match.scheduled_date);

                          return (
                            <div key={match.id} style={{
                              border: `1px solid ${isDone ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.12)'}`,
                              background: isDone ? 'rgba(11,34,24,0.8)' : 'rgba(30,74,52,0.15)',
                              minWidth: 180, flex: '0 1 auto',
                            }}>
                              {/* Match header */}
                              <div style={{ padding: '0.4rem 0.8rem', borderBottom: '1px solid rgba(201,168,76,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--gold-dim)' }}>
                                  {round}라운드 {match.match_index + 1}경기
                                </span>
                                {isDone
                                  ? <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', color: '#4ade80' }}>✓ 완료</span>
                                  : <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', color: 'var(--white-dim)', opacity: 0.4 }}>예정</span>
                                }
                              </div>

                              {/* Players */}
                              {sorted.map((mp, pi) => {
                                const rankColors = ['#c9a84c', '#c8c8c8', '#a0732a'];
                                const rankColor = isDone && mp.rank ? (rankColors[mp.rank - 1] ?? 'rgba(244,239,230,0.4)') : 'var(--foreground)';
                                return (
                                  <div key={mp.player_id} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.45rem 0.8rem',
                                    borderTop: pi > 0 ? '1px solid rgba(201,168,76,0.06)' : 'none',
                                    background: isDone && mp.rank === 1 ? 'rgba(201,168,76,0.07)' : 'transparent',
                                  }}>
                                    {isDone && mp.rank && (
                                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.72rem', color: rankColor, minWidth: 18, fontWeight: 700, textAlign: 'center' }}>
                                        {mp.rank}
                                      </span>
                                    )}
                                    <Link href={`/profile/${mp.player.username}`} style={{ textDecoration: 'none', flex: 1 }}>
                                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: rankColor }}>
                                        {mp.player.nickname}
                                      </span>
                                    </Link>
                                    {isDone && mp.score !== null && (
                                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: 'var(--white-dim)', opacity: 0.6 }}>
                                        {mp.score}
                                      </span>
                                    )}
                                    {isDone && (
                                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: 'var(--gold)', opacity: 0.8 }}>
                                        +{mp.points_earned}승점
                                      </span>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Footer: scheduled date + discord channels + room */}
                              <div style={{ padding: '0.5rem 0.8rem', borderTop: '1px solid rgba(201,168,76,0.06)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {scheduledLabel && (
                                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: '#4ade80', letterSpacing: '0.08em' }}>
                                    📅 {scheduledLabel}
                                  </span>
                                )}
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', padding: '0.15rem 0.4rem', border: '1px solid rgba(88,101,242,0.35)', color: '#818cf8', background: 'rgba(88,101,242,0.06)' }}>
                                    # {channels.game}
                                  </span>
                                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.44rem', padding: '0.15rem 0.4rem', border: '1px solid rgba(88,101,242,0.2)', color: 'rgba(129,140,248,0.6)', background: 'rgba(88,101,242,0.03)' }}>
                                    # {channels.spectator}
                                  </span>
                                </div>
                                {!isDone && isAdmin && (
                                  <MatchRoomButton leagueId={id} matchId={match.id} existingRoomId={match.room_id} />
                                )}
                                {!isDone && match.room_id && !isAdmin && (
                                  <Link href={`/rooms/${match.room_id}`} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'var(--gold)', textDecoration: 'none' }}>
                                    방 입장 →
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Availability */}
          <LeagueAvailability
            leagueId={id}
            myPlayerId={sessionUser?.id ?? null}
            isAdmin={isAdmin}
            initialAvailability={availData ?? []}
            matches={matchesForAvailability}
            participantCount={totalPlayers}
          />

        </div>
      </div>

      <Footer />
    </>
  );
}
