import Nav from '../../nav';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: player } = await supabase
    .from('players')
    .select('id, username, nickname, bio, avatar_url, created_at')
    .eq('username', username)
    .maybeSingle();

  if (!player) notFound();

  const [{ data: chipData }, { data: quarterData }] = await Promise.all([
    supabase.from('player_chip_totals').select('total_chips, total_gains, total_losses').eq('player_id', player.id).maybeSingle(),
    supabase.from('player_active_quarter_totals').select('quarter_points, gains, losses').eq('player_id', player.id).maybeSingle(),
  ]);

  const { data: games } = await supabase
    .from('player_games')
    .select('id, name, name_en, bgg_id, thumbnail_url, min_players, max_players, is_available, note')
    .eq('player_id', player.id)
    .order('name');

  const { data: recentChips } = await supabase
    .from('chip_transactions')
    .select('tx_type, amount, note, created_at')
    .eq('player_id', player.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const TX_LABEL: Record<string, string> = {
    game: '경기', attendance: '참석', late: '지각', absence: '불참',
    vote_skip: '투표미참', draw_use: '추첨사용', draw_win: '추첨당첨', manual: '수동',
  };

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '6rem 2rem 4rem' }}>

        {/* 프로필 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--gold-dim)', background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
            {player.avatar_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={player.avatar_url} alt={player.nickname} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : player.nickname[0]
            }
          </div>
          <div>
            <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '3rem', color: 'var(--foreground)', lineHeight: 1 }}>{player.nickname}</h1>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--gold)', marginTop: '0.3rem' }}>@{player.username}</p>
            {player.bio && <p style={{ fontStyle: 'italic', color: 'var(--white-dim)', marginTop: '0.5rem', fontSize: '1rem' }}>{player.bio}</p>}
          </div>
        </div>

        {/* 포인트 통계 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', marginBottom: '3rem' }}>
          {[
            { label: '이번 분기', value: quarterData ? `${quarterData.quarter_points > 0 ? '+' : ''}${quarterData.quarter_points}pt` : '—', highlight: true },
            { label: '누적 보유', value: `${chipData?.total_chips ?? 0}pt`, highlight: false },
            { label: '획득 기록', value: `${chipData?.total_gains ?? 0}회`, highlight: false },
            { label: '차감 기록', value: `${chipData?.total_losses ?? 0}회`, highlight: false },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(30,74,52,0.2)', border: '1px solid rgba(201,168,76,0.12)', padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--white-dim)', marginBottom: '0.5rem' }}>{s.label}</p>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: s.highlight ? 'var(--gold)' : 'var(--foreground)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>

          {/* 보유 게임 */}
          <div>
            <p className="section-label" style={{ textAlign: 'left', marginBottom: '1rem' }}>보유 보드게임 ({games?.length ?? 0})</p>
            {!games?.length ? (
              <div className="board-empty"><p>등록된 게임이 없습니다</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {games.map((g: { id: string; name: string; name_en: string | null; bgg_id: number | null; thumbnail_url: string | null; min_players: number | null; max_players: number | null; is_available: boolean; note: string | null }) => (
                  <div key={g.id} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', padding: '0.8rem 1rem', background: 'rgba(30,74,52,0.15)', borderLeft: `2px solid ${g.is_available ? 'var(--gold-dim)' : 'rgba(255,100,100,0.3)'}` }}>
                    {g.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.thumbnail_url} alt={g.name} style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.1rem' }}>
                        {g.min_players && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)' }}>{g.min_players}–{g.max_players}인</span>}
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: g.is_available ? 'var(--gold)' : '#ff8888' }}>{g.is_available ? '대여가능' : '대여불가'}</span>
                      </div>
                    </div>
                    {g.bgg_id && (
                      <a href={`https://boardgamegeek.com/boardgame/${g.bgg_id}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--gold-dim)', textDecoration: 'none', flexShrink: 0 }}>BGG</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 최근 포인트 내역 */}
          <div>
            <p className="section-label" style={{ textAlign: 'left', marginBottom: '1rem' }}>최근 포인트 내역</p>
            {!recentChips?.length ? (
              <div className="board-empty"><p>내역이 없습니다</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recentChips.map((t: { tx_type: string; amount: number; note: string | null; created_at: string }, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 1rem', background: 'rgba(30,74,52,0.12)', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                    <div>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--white-dim)' }}>{TX_LABEL[t.tx_type] ?? t.tx_type}</span>
                      {t.note && <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.7, marginTop: '0.1rem' }}>{t.note}</p>}
                    </div>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.9rem', color: t.amount > 0 ? 'var(--gold)' : '#ff8888', flexShrink: 0 }}>
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="bgm-footer">
        <div className="footer-logo">BGM</div>
        <div className="footer-copy">© 2026 Boardgame in Melbourne.</div>
        <div className="footer-links"><a href="#">인스타그램</a><a href="#">디스코드</a></div>
      </footer>
    </>
  );
}
