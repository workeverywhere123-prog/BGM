import Nav from '../nav';
import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Footer from '../footer';
import LapisIcon from '@/components/LapisIcon';

export const dynamic = 'force-dynamic';

async function getAllQuarters() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from('quarters').select('id, name, started_at, ended_at, is_active').order('started_at', { ascending: false });
    return data ?? [];
  } catch { return []; }
}

async function getLeagues() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: leagues } = await supabase
      .from('leagues')
      .select('id, name, description, start_date, end_date, is_active, prizes, league_participants(player_id, score)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!leagues?.length) return [];

    const allPlayerIds = [...new Set(leagues.flatMap(l => (l.league_participants as { player_id: string }[]).map(p => p.player_id)))];
    const supabase2 = await createSupabaseServerClient();
    const { data: players } = allPlayerIds.length
      ? await supabase2.from('players').select('id, nickname, username').in('id', allPlayerIds)
      : { data: [] };
    const pmap = Object.fromEntries((players ?? []).map(p => [p.id, p]));

    return leagues.map(l => ({
      ...l,
      participants: (l.league_participants as { player_id: string; score: number }[])
        .map(p => ({ ...p, player: pmap[p.player_id] ?? { nickname: '?', username: '' } }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
    }));
  } catch { return []; }
}

function fmtDateShort(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function LeaguePage() {
  const configured = isSupabaseConfigured();
  const [quarters, leagues] = await Promise.all([
    configured ? getAllQuarters() : Promise.resolve([]),
    configured ? getLeagues() : Promise.resolve([]),
  ]);

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>

        {/* 헤더 */}
        <div style={{ textAlign: 'center', padding: '4rem 2rem 2rem' }}>
          <p className="section-label">BGM LEAGUE</p>
          <h1 className="section-title">리그 현황</h1>
          <div className="section-divider" />

          {/* 분기 배지 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {(quarters as { id: string; name: string; is_active: boolean }[]).map(q => (
              <span key={q.id} style={{
                fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em',
                padding: '0.3rem 0.8rem',
                border: `1px solid ${q.is_active ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`,
                color: q.is_active ? 'var(--gold)' : 'var(--white-dim)',
                background: q.is_active ? 'rgba(201,168,76,0.08)' : 'transparent',
              }}>
                {q.name} {q.is_active && '● 진행중'}
              </span>
            ))}
            {quarters.length === 0 && (
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: 'var(--white-dim)', opacity: 0.5 }}>
                분기 미설정 — 관리자에서 분기를 생성하세요
              </span>
            )}
          </div>
        </div>

        {/* 리그 카드 */}
        {leagues.length > 0 && (
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem 4rem' }}>
            <p className="section-label" style={{ textAlign: 'left', marginBottom: '1.2rem' }}>ACTIVE LEAGUES</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(leagues as any[]).map(league => {
                const rankColors = ['#c9a84c', '#c8c8c8', '#a0732a'];
                return (
                  <Link key={league.id} href={`/league/${league.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      border: `1px solid ${league.is_active ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.12)'}`,
                      background: league.is_active ? 'rgba(30,74,52,0.25)' : 'rgba(22,53,36,0.15)',
                      padding: '1.6rem', cursor: 'pointer', transition: 'border-color 0.2s',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      {league.is_active && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(to right, var(--gold), transparent)' }} />
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.15em', color: league.is_active ? '#4ade80' : 'var(--white-dim)', opacity: league.is_active ? 1 : 0.5 }}>
                          {league.is_active ? '● 진행중' : '종료'}
                        </span>
                        {league.start_date && (
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold-dim)' }}>
                            {fmtDateShort(league.start_date)} — {fmtDateShort(league.end_date)}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2rem', color: 'var(--foreground)', lineHeight: 1.1, marginBottom: '0.3rem' }}>{league.name}</h3>
                      {league.description && (
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.6, marginBottom: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {league.description}
                        </p>
                      )}
                      {/* Mini standings */}
                      {league.participants.length > 0 && (
                        <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {league.participants.slice(0, 3).map((p: { player_id: string; score: number; player: { nickname: string; username: string } }, i: number) => (
                            <div key={p.player_id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.6rem', background: i === 0 ? 'rgba(201,168,76,0.06)' : 'transparent', borderLeft: `2px solid ${i < 3 ? rankColors[i] : 'transparent'}` }}>
                              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', color: rankColors[i] ?? 'var(--white-dim)', minWidth: 16, fontWeight: 700 }}>{i + 1}</span>
                              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)', flex: 1 }}>{p.player.nickname}</span>
                              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', color: rankColors[i] ?? 'var(--white-dim)' }}>{p.score}승점</span>
                            </div>
                          ))}
                          {league.participants.length > 3 && (
                            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.4, textAlign: 'right', marginTop: '0.2rem' }}>
                              +{league.participants.length - 3}명 더보기 →
                            </p>
                          )}
                        </div>
                      )}
                      {league.participants.length === 0 && (
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.4, marginTop: '0.8rem' }}>참가자 없음</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 기록실 바로가기 */}
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem 2rem', textAlign: 'center' }}>
          <Link href="/records" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
            fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em',
            color: 'var(--gold-dim)', textDecoration: 'none',
            border: '1px solid rgba(201,168,76,0.2)', padding: '0.6rem 1.6rem',
            transition: 'all 0.2s',
          }}>
            <LapisIcon size={12} /> 분기 랭킹 · 누적 보유량은 기록실에서 →
          </Link>
        </div>

        {/* 규칙 바로가기 */}
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem 6rem', textAlign: 'center' }}>
          <Link href="/rules" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
            fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.2em',
            color: 'var(--gold-dim)', textDecoration: 'none',
            border: '1px solid rgba(201,168,76,0.2)', padding: '0.7rem 1.8rem',
            transition: 'all 0.2s',
          }}>
            ◆ BGM HOW TO PLAY — <LapisIcon size={12} /> LAPIS 규칙 보기 →
          </Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
