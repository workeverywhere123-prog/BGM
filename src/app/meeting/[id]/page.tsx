import Nav from '../../nav';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Footer from '../../footer';
import LapisIcon from '@/components/LapisIcon';

const GAME_TYPE_LABEL: Record<string, string> = {
  team: '팀전', mafia: '마피아', deathmatch: '데스매치',
  onevsmany: '1vs다수', coop: '협력', ranking: '순위전',
};

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, number, held_at, status, note')
    .eq('id', id)
    .maybeSingle();

  if (!meeting) notFound();

  const { data: matches } = await supabase
    .from('matches')
    .select(`id, game_type, played_at, note, games(name),
      match_participants(player_id, team, rank, role, is_winner, is_mvp, chip_change,
        players(nickname, username))`)
    .eq('meeting_id', id)
    .order('played_at');

  const { data: attendances } = await supabase
    .from('meeting_attendances')
    .select('player_id, status, voted, players(nickname, username)')
    .eq('meeting_id', id);

  const d = new Date(meeting.held_at);

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: '6rem 2rem 4rem' }}>

        {/* 헤더 */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/meeting" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', textDecoration: 'none' }}>
              ← 모임 목록
            </Link>
            <Link href="/rules" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', textDecoration: 'none', opacity: 0.7 }}>
              HOW TO PLAY ◆
            </Link>
          </div>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '3.5rem', color: 'var(--foreground)', marginTop: '0.8rem', lineHeight: 1.1 }}>
            제{meeting.number}회 모임
          </h1>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--gold)', marginTop: '0.5rem' }}>
            {d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          {meeting.note && <p style={{ fontStyle: 'italic', color: 'var(--white-dim)', marginTop: '0.5rem' }}>{meeting.note}</p>}
        </div>

        <div style={{ width: 80, height: 1, background: 'linear-gradient(to right, transparent, var(--gold), transparent)', marginBottom: '3rem' }} />

        {/* 출석 현황 */}
        {attendances && attendances.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <p className="section-label" style={{ textAlign: 'left', marginBottom: '1rem' }}>출석 현황</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(attendances as any[]).map((a) => (
                <Link href={`/profile/${a.players?.username}`} key={a.player_id} style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.1em',
                  padding: '0.4rem 0.9rem', textDecoration: 'none',
                  border: `1px solid ${a.status === 'attended' ? 'rgba(201,168,76,0.4)' : a.status === 'late' ? 'rgba(255,200,0,0.4)' : 'rgba(255,100,100,0.3)'}`,
                  color: a.status === 'attended' ? 'var(--gold)' : a.status === 'late' ? '#ffc800' : '#ff6464',
                  background: 'rgba(0,0,0,0.2)',
                }}>
                  {a.players?.nickname} {a.status === 'attended' ? '✓' : a.status === 'late' ? '지각' : '불참'}
                  {!a.voted && ' (투표미참)'}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 경기 결과 */}
        <p className="section-label" style={{ textAlign: 'left', marginBottom: '1rem' }}>경기 결과</p>
        {!matches?.length ? (
          <div className="board-empty"><p>경기 기록이 없습니다</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(matches as any[]).map((m) => (
              <div key={m.id} style={{ border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(30,74,52,0.1)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--gold)', marginRight: '0.8rem' }}>
                      {GAME_TYPE_LABEL[m.game_type]}
                    </span>
                    <span style={{ fontSize: '1rem', color: 'var(--foreground)' }}>{m.games?.name ?? '보드게임'}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--white-dim)' }}>{new Date(m.played_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {m.note && <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--white-dim)', marginBottom: '1rem' }}>{m.note}</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {m.match_participants?.map((p: any) => (
                    <Link href={`/profile/${p.players?.username}`} key={p.player_id} style={{
                      fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', padding: '0.35rem 0.8rem',
                      textDecoration: 'none',
                      border: `1px solid ${p.is_winner ? 'rgba(201,168,76,0.5)' : p.is_winner === false ? 'rgba(255,100,100,0.2)' : 'rgba(201,168,76,0.15)'}`,
                      color: p.is_winner ? 'var(--gold)' : p.is_winner === false ? '#ff8888' : 'var(--white-dim)',
                      background: p.is_winner ? 'rgba(201,168,76,0.08)' : 'transparent',
                    }}>
                      {p.players?.nickname}
                      {p.rank && ` #${p.rank}`}
                      {p.team && ` (${p.team}팀)`}
                      {p.role && ` [${p.role}]`}
                      {p.is_mvp && ' ⭐'}
                      <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: p.chip_change > 0 ? 'var(--gold)' : p.chip_change < 0 ? '#ff8888' : 'var(--white-dim)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        {p.chip_change > 0 ? `+${p.chip_change}` : p.chip_change} <LapisIcon size={11} /> LAPIS
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
