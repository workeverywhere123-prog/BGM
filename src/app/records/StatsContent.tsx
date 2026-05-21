import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import LapisIcon from '@/components/LapisIcon';

export default async function StatsContent() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: gameStats },
    { data: winStats },
    { count: totalMatchCount },
    { count: activePlayerCount },
  ] = await Promise.all([
    supabase.from('game_stats').select('*').order('play_count', { ascending: false }).limit(10),
    supabase.from('player_win_stats').select('*').order('total_games', { ascending: false }).limit(20),
    supabase.from('matches').select('id', { count: 'exact', head: true }),
    supabase.from('players').select('id', { count: 'exact', head: true }),
  ]);

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

  const winLeaders = (winStats ?? [])
    .filter((w: { total_games: number }) => w.total_games >= 3)
    .sort((a: { win_rate: number }, b: { win_rate: number }) => b.win_rate - a.win_rate)
    .slice(0, 5);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 6rem' }}>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3.5rem' }}>
        {[
          { label: '누적 경기 수', value: totalMatchCount ?? 0, unit: '경기', color: 'var(--gold)' },
          { label: '활성 플레이어', value: activePlayerCount ?? 0, unit: '명', color: '#4ade80' },
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


    </div>
  );
}
