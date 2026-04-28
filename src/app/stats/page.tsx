import Nav from '../nav';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Footer from '../footer';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: gameStats },
    { data: winStats },
    { data: totalMatches },
    { data: activePlayers },
    { data: recentGames },
  ] = await Promise.all([
    supabase.from('game_stats').select('*').order('play_count', { ascending: false }).limit(10),
    supabase.from('player_win_stats').select('*').order('total_games', { ascending: false }).limit(20),
    supabase.from('matches').select('id', { count: 'exact', head: true }),
    supabase.from('players').select('id', { count: 'exact', head: true }),
    supabase.from('matches').select('id, game_type, played_at, boardlife_game_name').order('played_at', { ascending: false }).limit(5),
  ]);

  // 플레이어 닉네임 조회
  const allPlayerIds = [
    ...(winStats ?? []).map((w: { player_id: string }) => w.player_id),
    ...(gameStats ?? []).filter((g: { high_score_player_id: string | null }) => g.high_score_player_id).map((g: { high_score_player_id: string }) => g.high_score_player_id),
  ];
  const uniqueIds = [...new Set(allPlayerIds)];
  const { data: players } = uniqueIds.length
    ? await supabase.from('players').select('id, nickname, username').in('id', uniqueIds)
    : { data: [] };
  const pmap = Object.fromEntries((players ?? []).map((p: { id: string; nickname: string; username: string }) => [p.id, p]));

  const topGame = (gameStats ?? [])[0];
  const maxPlays = topGame?.play_count ?? 1;

  // 승률 상위 (최소 3경기 이상)
  const winLeaders = (winStats ?? [])
    .filter((w: { total_games: number }) => w.total_games >= 3)
    .sort((a: { win_rate: number }, b: { win_rate: number }) => b.win_rate - a.win_rate)
    .slice(0, 5);

  const GT_LABEL: Record<string, string> = {
    ranking: '순위전', mafia: '마피아', team: '팀전', coop: '협력', onevsmany: '1:다', deathmatch: '데스매치',
  };

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', maxWidth: 1100, margin: '0 auto', padding: '6rem 2rem 8rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p className="section-label">COMMUNITY ANALYTICS</p>
          <h1 className="section-title">분석실</h1>
          <div className="section-divider" />
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--white-dim)', fontStyle: 'italic' }}>
            BGM 모임 전체의 플레이 데이터를 한눈에
          </p>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3.5rem' }}>
          {[
            { label: '누적 경기 수', value: totalMatches?.length ?? 0, unit: '경기', color: 'var(--gold)' },
            { label: '활성 플레이어', value: activePlayers?.length ?? 0, unit: '명', color: '#4ade80' },
            { label: '기록된 게임 종류', value: (gameStats ?? []).length, unit: '종', color: '#60a5fa' },
          ].map(c => (
            <div key={c.label} style={{ border: `1px solid ${c.color}22`, background: `${c.color}08`, padding: '1.8rem', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.2em', color: c.color, opacity: 0.7, marginBottom: '0.8rem' }}>{c.label}</p>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '2.8rem', color: c.color, lineHeight: 1, fontWeight: 700 }}>
                {c.value}
                <span style={{ fontSize: '0.9rem', marginLeft: '0.3rem', opacity: 0.6 }}>{c.unit}</span>
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>

          {/* Most Played Games */}
          <section>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1.2rem' }}>
              🎲 가장 많이 플레이된 게임
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(gameStats ?? []).length === 0 ? (
                <p style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>아직 기록된 경기가 없습니다</p>
              ) : (gameStats ?? []).map((g: { game_name: string; play_count: number; high_score: number | null; high_score_player_id: string | null }, i: number) => {
                const barWidth = Math.round((g.play_count / maxPlays) * 100);
                const rankColor = i === 0 ? 'var(--gold)' : i === 1 ? '#94a3b8' : i === 2 ? '#b87333' : 'rgba(201,168,76,0.3)';
                return (
                  <div key={g.game_name} style={{ padding: '0.9rem 1rem', background: 'rgba(30,74,52,0.15)', border: `1px solid ${i < 3 ? rankColor + '44' : 'rgba(201,168,76,0.08)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: rankColor, minWidth: 20 }}>
                          {i === 0 ? '✦' : i === 1 ? '②' : i === 2 ? '③' : `${i + 1}`}
                        </span>
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>{g.game_name}</span>
                      </div>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', color: rankColor, fontWeight: i === 0 ? 700 : 400 }}>
                        {g.play_count}회
                      </span>
                    </div>
                    {/* Bar */}
                    <div style={{ height: 3, background: 'rgba(201,168,76,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, background: rankColor, transition: 'width 0.5s ease' }} />
                    </div>
                    {g.high_score != null && g.high_score_player_id && (
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'rgba(244,239,230,0.35)', marginTop: '0.3rem', letterSpacing: '0.05em' }}>
                        최고 점수 {g.high_score}점 — {pmap[g.high_score_player_id]?.nickname ?? '?'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Win Rate Leaderboard */}
          <section>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1.2rem' }}>
              🏆 승률 TOP 5 <span style={{ opacity: 0.45, fontSize: '0.5rem' }}>(3경기 이상)</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '2rem' }}>
              {winLeaders.length === 0 ? (
                <p style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>데이터가 부족합니다</p>
              ) : winLeaders.map((w: { player_id: string; total_games: number; total_wins: number; win_rate: number; mvp_count: number }, i: number) => {
                const p = pmap[w.player_id];
                const rankColor = i === 0 ? 'var(--gold)' : i === 1 ? '#94a3b8' : i === 2 ? '#b87333' : 'rgba(201,168,76,0.4)';
                return (
                  <Link href={`/profile/${p?.username ?? ''}`} key={w.player_id} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.85rem 1rem', background: 'rgba(30,74,52,0.15)',
                    border: `1px solid ${i < 3 ? rankColor + '44' : 'rgba(201,168,76,0.08)'}`,
                    textDecoration: 'none', transition: 'all 0.15s',
                  }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', color: rankColor, minWidth: 20 }}>
                      {i === 0 ? '✦' : i === 1 ? '②' : i === 2 ? '③' : `${i + 1}`}
                    </span>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${rankColor}`, background: 'rgba(30,74,52,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '0.75rem', color: rankColor, flexShrink: 0 }}>
                      {p?.nickname?.[0] ?? '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>{p?.nickname ?? '?'}</p>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--white-dim)', opacity: 0.4 }}>{w.total_wins}승 / {w.total_games}경기</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: rankColor, fontWeight: i === 0 ? 700 : 400 }}>{w.win_rate}%</p>
                      {w.mvp_count > 0 && (
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: '#e879f9', opacity: 0.8 }}>MVP ×{w.mvp_count}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* All Players Table */}
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '0.8rem' }}>
              📊 전체 플레이어 기록
            </p>
            <div style={{ border: '1px solid rgba(201,168,76,0.1)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 50px 60px', gap: '0.5rem', padding: '0.5rem 0.8rem', fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--gold-dim)', letterSpacing: '0.1em', borderBottom: '1px solid rgba(201,168,76,0.08)', background: 'rgba(201,168,76,0.04)' }}>
                <span>플레이어</span><span style={{ textAlign: 'center' }}>경기</span><span style={{ textAlign: 'center' }}>승</span><span style={{ textAlign: 'right' }}>승률</span>
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {(winStats ?? []).map((w: { player_id: string; total_games: number; total_wins: number; win_rate: number }) => {
                  const p = pmap[w.player_id];
                  return (
                    <Link href={`/profile/${p?.username ?? ''}`} key={w.player_id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 50px 50px 60px', gap: '0.5rem',
                      padding: '0.55rem 0.8rem', borderBottom: '1px solid rgba(201,168,76,0.05)',
                      textDecoration: 'none', alignItems: 'center',
                    }}>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--foreground)' }}>{p?.nickname ?? '?'}</span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: 'var(--white-dim)', textAlign: 'center' }}>{w.total_games}</span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: '#4ade80', textAlign: 'center' }}>{w.total_wins}</span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', color: w.win_rate >= 60 ? 'var(--gold)' : 'var(--white-dim)', textAlign: 'right' }}>{w.win_rate}%</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* High Score Hall of Fame */}
        {(gameStats ?? []).some((g: { high_score: number | null }) => g.high_score != null) && (
          <section style={{ marginTop: '3.5rem' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1.2rem' }}>
              ⭐ 명예의 전당 — 게임별 최고 점수
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
              {(gameStats ?? [])
                .filter((g: { high_score: number | null }) => g.high_score != null)
                .slice(0, 6)
                .map((g: { game_name: string; high_score: number; high_score_player_id: string | null }) => {
                  const holder = g.high_score_player_id ? pmap[g.high_score_player_id] : null;
                  return (
                    <div key={g.game_name} style={{ padding: '1.2rem', border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '0.6rem', right: '0.8rem', fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--gold)', opacity: 0.4 }}>RECORD</div>
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)', marginBottom: '0.5rem' }}>{g.game_name}</p>
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1.8rem', color: 'var(--gold)', fontWeight: 700, lineHeight: 1 }}>
                        {g.high_score.toLocaleString()}
                        <span style={{ fontSize: '0.65rem', marginLeft: '0.3rem', opacity: 0.5 }}>점</span>
                      </p>
                      {holder && (
                        <Link href={`/profile/${holder.username}`} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--gold-dim)', textDecoration: 'none', display: 'block', marginTop: '0.4rem' }}>
                          {holder.nickname} ↗
                        </Link>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* Recent Activity */}
        {(recentGames ?? []).length > 0 && (
          <section style={{ marginTop: '3.5rem' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>
              🕐 최근 경기
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {(recentGames ?? []).map((m: { id: string; game_type: string; played_at: string; boardlife_game_name: string | null }) => {
                const d = new Date(m.played_at);
                const label = m.boardlife_game_name || GT_LABEL[m.game_type] || m.game_type;
                return (
                  <div key={m.id} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.08em', padding: '0.3rem 0.8rem', border: '1px solid rgba(201,168,76,0.18)', color: 'var(--white-dim)' }}>
                    {label} — {d.getMonth() + 1}/{d.getDate()}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <Link href="/records" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)', padding: '0.6rem 1.4rem', textDecoration: 'none' }}>
            전체 전적 보기 →
          </Link>
          <Link href="/leaderboard" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em', color: 'var(--white-dim)', border: '1px solid rgba(201,168,76,0.15)', padding: '0.6rem 1.4rem', textDecoration: 'none' }}>
            칩 랭킹 →
          </Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
