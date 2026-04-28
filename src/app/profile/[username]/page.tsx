import Nav from '../../nav';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';
import GameManager from './GameManager';
import ProfileInbox from './ProfileInbox';
import ProfileEditor from './ProfileEditor';
import Footer from '../../footer';
import LapisIcon, { LapisAmount } from '@/components/LapisIcon';

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: player }, sessionUser] = await Promise.all([
    supabase.from('players').select('id, username, nickname, bio, avatar_url, profile_title, banner_color, created_at').eq('username', username).maybeSingle(),
    getSessionUser().catch(() => null),
  ]);

  if (!player) notFound();
  const isOwner = sessionUser?.id === player.id;

  const [{ data: chipData }, { data: quarterData }] = await Promise.all([
    supabase.from('player_chip_totals').select('total_chips, total_gains, total_losses').eq('player_id', player.id).maybeSingle(),
    supabase.from('player_active_quarter_totals').select('quarter_points, gains, losses').eq('player_id', player.id).maybeSingle(),
  ]);

  const { data: games } = await supabase
    .from('player_games')
    .select('id, name, name_en, bgg_id, boardlife_id, boardlife_url, thumbnail_url, min_players, max_players, note')
    .eq('player_id', player.id)
    .order('name');

  const { data: recentChips } = await supabase
    .from('chip_transactions')
    .select('tx_type, amount, note, created_at')
    .eq('player_id', player.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: matchHistory } = await supabase
    .from('match_participants')
    .select('rank, team, role, is_winner, is_mvp, matches(game_type, played_at)')
    .eq('player_id', player.id)
    .order('created_at', { ascending: false })
    .limit(15);

  // 메일함: 본인 프로필에서만 조회
  let inbox: { id: string; title: string; message: string; type: string; read_at: string | null; created_at: string }[] = [];
  let inquiries: { id: string; title: string; message: string; status: string; admin_reply: string | null; replied_at: string | null; created_at: string }[] = [];
  if (isOwner) {
    const [{ data: notifData }, { data: inquiryData }] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, title, message, type, read_at, created_at')
        .eq('player_id', player.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('inquiries')
        .select('id, title, message, status, admin_reply, replied_at, created_at')
        .eq('player_id', player.id)
        .order('created_at', { ascending: false }),
    ]);
    inbox = notifData ?? [];
    inquiries = inquiryData ?? [];
  }

  const TX_LABEL: Record<string, string> = {
    game: '경기', attendance: '참석', late: '지각', absence: '불참',
    vote_skip: '투표미참', draw_use: '추첨사용', draw_win: '추첨당첨', manual: '수동',
  };
  const GT_LABEL: Record<string, string> = {
    ranking: '순위전', mafia: '마피아', team: '팀전', coop: '협력', onevsmany: '1:다', deathmatch: '데스매치',
  };

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '6rem 2rem 4rem' }}>

        {/* 프로필 헤더 — 원래 디자인 유지 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--gold-dim)', background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0, overflow: 'hidden' }}>
            {player.avatar_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={player.avatar_url} alt={player.nickname} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : player.nickname[0]
            }
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '3rem', color: 'var(--foreground)', lineHeight: 1 }}>{player.nickname}</h1>
              {isOwner && (
                <ProfileEditor player={{
                  id: player.id,
                  nickname: player.nickname,
                  username: player.username,
                  bio: player.bio ?? null,
                  avatar_url: player.avatar_url ?? null,
                  profile_title: (player as { profile_title?: string }).profile_title ?? null,
                  banner_color: (player as { banner_color?: string }).banner_color ?? null,
                }} />
              )}
            </div>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--gold)', marginTop: '0.3rem' }}>@{player.username}</p>
            {(player as { profile_title?: string }).profile_title && (
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.2)', display: 'inline-block', padding: '0.12rem 0.5rem', marginTop: '0.3rem' }}>
                {(player as { profile_title?: string }).profile_title}
              </p>
            )}
            {player.bio && <p style={{ fontStyle: 'italic', color: 'var(--white-dim)', marginTop: '0.5rem', fontSize: '1rem' }}>{player.bio}</p>}
          </div>
        </div>

        {/* LAPIS 통계 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', marginBottom: '3rem' }}>
          <div style={{ background: 'rgba(30,74,52,0.2)', border: '1px solid rgba(201,168,76,0.12)', padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--white-dim)', marginBottom: '0.5rem' }}>이번 분기</p>
            {quarterData
              ? <LapisAmount amount={quarterData.quarter_points} size="lg" showSign style={{ justifyContent: 'center' }} />
              : <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: 'var(--gold)' }}>—</p>
            }
          </div>
          <div style={{ background: 'rgba(30,74,52,0.2)', border: '1px solid rgba(201,168,76,0.12)', padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--white-dim)', marginBottom: '0.5rem' }}>누적 보유</p>
            <LapisAmount amount={chipData?.total_chips ?? 0} size="lg" style={{ justifyContent: 'center' }} />
          </div>
          <div style={{ background: 'rgba(30,74,52,0.2)', border: '1px solid rgba(201,168,76,0.12)', padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--white-dim)', marginBottom: '0.5rem' }}>획득 기록</p>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: 'var(--foreground)' }}>{chipData?.total_gains ?? 0}회</p>
          </div>
          <div style={{ background: 'rgba(30,74,52,0.2)', border: '1px solid rgba(201,168,76,0.12)', padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--white-dim)', marginBottom: '0.5rem' }}>차감 기록</p>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: 'var(--foreground)' }}>{chipData?.total_losses ?? 0}회</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>

          {/* 보유 게임 */}
          <div>
            {isOwner ? (
              <GameManager initialGames={(games ?? []) as Parameters<typeof GameManager>[0]['initialGames']} />
            ) : (
              <>
                <p className="section-label" style={{ textAlign: 'left', marginBottom: '1rem' }}>보유 보드게임 ({games?.length ?? 0})</p>
                {!games?.length ? (
                  <div className="board-empty"><p>등록된 게임이 없습니다</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {(games as { id: string; name: string; boardlife_url: string | null; thumbnail_url: string | null; min_players: number | null; max_players: number | null; note: string | null }[]).map(g => (
                      <a key={g.id}
                        href={g.boardlife_url ?? `https://boardlife.co.kr/board_game_search.php?search=${encodeURIComponent(g.name)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', padding: '0.7rem 0.8rem', background: 'rgba(30,74,52,0.15)', borderLeft: '2px solid var(--gold-dim)', textDecoration: 'none' }}>
                        {g.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.thumbnail_url} alt={g.name} style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 40, height: 40, background: 'rgba(201,168,76,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '1rem', color: 'var(--gold-dim)', flexShrink: 0 }}>{g.name[0]}</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</p>
                          {g.min_players && (
                            <div style={{ marginTop: '0.1rem' }}>
                              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)' }}>{g.min_players}{g.max_players !== g.min_players ? `–${g.max_players}` : ''}인</span>
                            </div>
                          )}
                        </div>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'var(--gold-dim)', opacity: 0.5, flexShrink: 0 }}>BL ↗</span>
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 최근 LAPIS 내역 */}
          <div>
            <p className="section-label" style={{ textAlign: 'left', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LapisIcon size={13} /> 최근 LAPIS 내역
            </p>
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
                    <LapisAmount amount={t.amount} size="sm" showSign />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 게임 전적 */}
          <div>
            <p className="section-label" style={{ textAlign: 'left', marginBottom: '1rem' }}>게임 전적 ({matchHistory?.length ?? 0})</p>
            {!matchHistory?.length ? (
              <div className="board-empty"><p>전적이 없습니다</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {matchHistory.map((m: { rank: number | null; team: string | null; role: string | null; is_winner: boolean; is_mvp: boolean; matches: { game_type: string; played_at: string }[] | { game_type: string; played_at: string } | null }, i: number) => {
                  const match = Array.isArray(m.matches) ? m.matches[0] : m.matches;
                  if (!match) return null;
                  const d = new Date(match.played_at);
                  const dateStr = `${d.getMonth()+1}/${d.getDate()}`;
                  const resultText = match.game_type === 'ranking'
                    ? (m.rank ? `${m.rank}위` : '-')
                    : (m.is_winner ? '승리' : '패배');
                  const resultColor = match.game_type === 'ranking'
                    ? (m.rank === 1 ? 'var(--gold)' : m.rank && m.rank <= 2 ? '#60a5fa' : '#ff8888')
                    : (m.is_winner ? '#4ade80' : '#ff8888');
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', background: 'rgba(30,74,52,0.12)', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                      <div>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--white-dim)' }}>{GT_LABEL[match.game_type] ?? match.game_type}</span>
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.1rem', alignItems: 'center' }}>
                          {m.role && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'rgba(244,239,230,0.4)' }}>{m.role}</span>}
                          {m.team && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'rgba(244,239,230,0.4)' }}>{m.team}팀</span>}
                          {m.is_mvp && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '0 0.3rem' }}>MVP</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', color: resultColor }}>{resultText}</p>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.4 }}>{dateStr}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 메일함 — 본인만 */}
        {isOwner && <ProfileInbox initialNotifs={inbox} initialInquiries={inquiries} />}
      </div>

      <Footer />
    </>
  );
}
