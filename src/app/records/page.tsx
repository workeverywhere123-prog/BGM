import Nav from '../nav';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import Footer from '../footer';
import LapisIcon from '@/components/LapisIcon';

export const dynamic = 'force-dynamic';

const GT_LABEL: Record<string, string> = {
  ranking: '순위전', mafia: '마피아', team: '팀전', coop: '협력', onevsmany: '1:다', deathmatch: '데스매치',
};
const GT_COLOR: Record<string, string> = {
  ranking: '#c9a84c', mafia: '#e879f9', team: '#60a5fa', coop: '#34d399', onevsmany: '#f87171', deathmatch: '#fb923c',
};

const RANK_SYMBOL = ['✦', '②', '③'];
const RANK_COLOR = ['var(--gold)', '#c8c8c8', '#a0732a'];

function RankBadge({ rank }: { rank: number }) {
  return (
    <span style={{
      fontFamily: "'Cinzel', serif",
      fontSize: rank <= 3 ? '1.2rem' : '1rem',
      width: 28, textAlign: 'center' as const, display: 'inline-block',
      color: rank <= 3 ? RANK_COLOR[rank - 1] : 'rgba(244,239,230,0.3)',
    }}>
      {rank <= 3 ? RANK_SYMBOL[rank - 1] : rank}
    </span>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '3rem 0 1.5rem' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', whiteSpace: 'nowrap' }}>{label}</p>
      <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
    </div>
  );
}

export default async function RecordsPage() {
  const configured = isSupabaseConfigured();
  if (!configured) {
    return (
      <>
        <Nav />
        <div style={{ paddingTop: '6rem', minHeight: '100vh', maxWidth: 900, margin: '0 auto', padding: '6rem 2rem 4rem' }}>
          <p className="section-label">RECORDS</p>
          <h1 className="section-title">기록실</h1>
          <div className="section-divider" />
          <div className="board-empty"><p>설정이 필요합니다</p></div>
        </div>
        <Footer />
      </>
    );
  }

  const supabase = await createSupabaseServerClient();

  // 활성 분기
  const { data: activeQuarter } = await supabase
    .from('quarters')
    .select('id, name, started_at, ended_at')
    .eq('is_active', true)
    .maybeSingle();

  type QRankEntry = { id?: string; nickname?: string; username?: string; quarter_points: number; gains: number; losses: number; rank: number };
  // 이번 분기 랭킹
  let quarterRanking: QRankEntry[] = [];
  if (activeQuarter) {
    const { data: qData } = await supabase
      .from('player_active_quarter_totals')
      .select('player_id, quarter_points, gains, losses');
    if (qData?.length) {
      const ids = qData.map((r: { player_id: string }) => r.player_id);
      const { data: qPlayers } = await supabase.from('players').select('id, nickname, username').in('id', ids);
      const qmap = Object.fromEntries((qPlayers ?? []).map(p => [p.id, p]));
      quarterRanking = qData
        .map((r: { player_id: string; quarter_points: number; gains: number; losses: number }) => ({
          ...qmap[r.player_id], quarter_points: r.quarter_points, gains: r.gains, losses: r.losses,
        }))
        .sort((a: { quarter_points: number }, b: { quarter_points: number }) => b.quarter_points - a.quarter_points)
        .map((r: Omit<QRankEntry, 'rank'>, i: number) => ({ ...r, rank: i + 1 })) as QRankEntry[];
    }
  }

  // 누적 보유량
  const { data: holdingsData } = await supabase
    .from('player_chip_totals')
    .select('player_id, total_chips, total_gains, total_losses')
    .order('total_chips', { ascending: false })
    .limit(20);
  let holdings: { id?: string; nickname?: string; username?: string; total_chips: number; rank: number }[] = [];
  if (holdingsData?.length) {
    const hids = holdingsData.map((r: { player_id: string }) => r.player_id);
    const { data: hPlayers } = await supabase.from('players').select('id, nickname, username').in('id', hids);
    const hmap = Object.fromEntries((hPlayers ?? []).map(p => [p.id, p]));
    holdings = holdingsData.map((r: { player_id: string; total_chips: number }, i: number) => ({
      rank: i + 1, ...hmap[r.player_id], total_chips: r.total_chips,
    }));
  }

  // 경기 기록 (이번 분기 or 최근 90일)
  const since = activeQuarter?.started_at
    ? new Date(activeQuarter.started_at).toISOString()
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: matches } = await supabase
    .from('matches')
    .select('id, game_type, played_at, match_participants(player_id, rank, team, role, is_winner, is_mvp, score)')
    .gte('played_at', since)
    .order('played_at', { ascending: false })
    .limit(100);

  const allPlayerIds = [...new Set((matches ?? []).flatMap(m =>
    (m.match_participants as { player_id: string }[]).map(p => p.player_id)
  ))];
  let pmap: Record<string, { id: string; nickname: string; username: string }> = {};
  if (allPlayerIds.length) {
    const { data: mPlayers } = await supabase.from('players').select('id, nickname, username').in('id', allPlayerIds);
    pmap = Object.fromEntries((mPlayers ?? []).map(p => [p.id, p]));
  }

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', maxWidth: 960, margin: '0 auto', padding: '6rem 2rem 6rem' }}>

        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <p className="section-label">BGM — RECORDS</p>
          <h1 className="section-title">기록실</h1>
          <div className="section-divider" />
          {activeQuarter && (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic' }}>
              {activeQuarter.name} 진행 중
            </p>
          )}
        </div>

        {/* ── 분기 랭킹 + 누적 보유량 ── */}
        <SectionDivider label="LAPIS RECORDS — 분기 & 누적" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>

          {/* 이번 분기 랭킹 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)' }}>
                {activeQuarter ? `${activeQuarter.name} 랭킹` : '이번 분기 랭킹'}
              </p>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.5 }}>분기 초기화 반영</span>
            </div>
            {!activeQuarter ? (
              <div className="board-empty"><p>활성 분기가 없습니다</p></div>
            ) : quarterRanking.length === 0 ? (
              <div className="board-empty"><p>이번 분기 기록이 없습니다</p></div>
            ) : (
              <div style={{ border: '1px solid rgba(201,168,76,0.12)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 60px 60px', gap: '0.8rem', padding: '0.6rem 1.2rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--gold-dim)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                  <span>#</span><span>플레이어</span><span style={{ textAlign: 'center' }}>게임수</span>
                  <span style={{ textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center' }}>
                    <LapisIcon size={11} /> LAPIS
                  </span>
                </div>
                {quarterRanking.map((e, i) => (
                  <Link href={`/profile/${e.username ?? ''}`} key={e.id ?? i} style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr 60px 60px', gap: '0.8rem',
                    alignItems: 'center', padding: '0.9rem 1.2rem', textDecoration: 'none',
                    borderTop: '1px solid rgba(201,168,76,0.07)',
                    borderLeft: i < 3 ? `2px solid ${RANK_COLOR[i]}` : '2px solid transparent',
                    background: i === 0 ? 'rgba(201,168,76,0.08)' : 'transparent',
                    transition: 'background 0.2s',
                  }}>
                    <RankBadge rank={e.rank} />
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>{e.nickname}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', textAlign: 'center', color: 'var(--white-dim)' }}>
                      {(e.gains ?? 0) + (e.losses ?? 0)}
                    </span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.95rem', textAlign: 'center', color: e.quarter_points >= 0 ? 'var(--gold)' : '#ff8888', fontWeight: 600 }}>
                      {e.quarter_points > 0 ? '+' : ''}{e.quarter_points}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 누적 보유량 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)' }}>누적 보유량</p>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.5, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                전체 누적 <LapisIcon size={11} /> LAPIS
              </span>
            </div>
            {holdings.length === 0 ? (
              <div className="board-empty"><p>보유 기록이 없습니다</p></div>
            ) : (
              <div style={{ border: '1px solid rgba(201,168,76,0.12)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px', gap: '0.8rem', padding: '0.6rem 1.2rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--gold-dim)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                  <span>#</span><span>플레이어</span>
                  <span style={{ textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center' }}>
                    보유 <LapisIcon size={11} /> LAPIS
                  </span>
                </div>
                {holdings.map((e, i) => (
                  <Link href={`/profile/${e.username ?? ''}`} key={e.id ?? i} style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr 80px', gap: '0.8rem',
                    alignItems: 'center', padding: '0.9rem 1.2rem', textDecoration: 'none',
                    borderTop: '1px solid rgba(201,168,76,0.07)',
                    borderLeft: i < 3 ? `2px solid ${RANK_COLOR[i]}` : '2px solid transparent',
                    background: i === 0 ? 'rgba(201,168,76,0.06)' : 'transparent',
                    transition: 'background 0.2s',
                  }}>
                    <RankBadge rank={e.rank} />
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>{e.nickname}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.95rem', textAlign: 'center', color: e.total_chips >= 0 ? 'var(--gold)' : '#ff8888', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                      {e.total_chips > 0 ? '+' : ''}{e.total_chips}
                      <LapisIcon size={12} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 경기 기록 ── */}
        <SectionDivider label="MATCH HISTORY — 경기 기록" />

        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic' }}>
            {activeQuarter ? `${activeQuarter.name} 기간` : '최근 90일'} — {matches?.length ?? 0}경기
          </span>
        </div>

        {(!matches || matches.length === 0) ? (
          <div className="board-empty"><p>이번 분기 경기 기록이 없습니다</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {matches.map(match => {
              type Participant = { player_id: string; rank: number | null; team: string | null; role: string | null; is_winner: boolean; is_mvp: boolean; score: number | null };
              const parts = (match.match_participants as Participant[]).sort((a, b) => {
                if (match.game_type === 'ranking') return (a.rank ?? 99) - (b.rank ?? 99);
                return a.is_winner === b.is_winner ? 0 : a.is_winner ? -1 : 1;
              });

              return (
                <div key={match.id} style={{ border: '1px solid rgba(201,168,76,0.12)', background: 'rgba(22,53,36,0.2)', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em', padding: '0.25rem 0.8rem', border: `1px solid ${GT_COLOR[match.game_type] ?? 'var(--gold-dim)'}55`, color: GT_COLOR[match.game_type] ?? 'var(--gold)', background: `${GT_COLOR[match.game_type] ?? 'var(--gold)'}10` }}>
                      {GT_LABEL[match.game_type] ?? match.game_type}
                    </span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)', letterSpacing: '0.1em' }}>
                      {fmtDate(match.played_at)}
                    </span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--gold-dim)', marginLeft: 'auto' }}>
                      {parts.length}명 참가
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {parts.map((p, pi) => {
                      const player = pmap[p.player_id];
                      const isWinner = match.game_type === 'ranking' ? p.rank === 1 : p.is_winner;
                      const resultText = match.game_type === 'ranking'
                        ? (p.rank ? `${p.rank}위` : '—')
                        : (p.is_winner ? '승리' : '패배');
                      const resultColor = match.game_type === 'ranking'
                        ? (p.rank === 1 ? 'var(--gold)' : p.rank === 2 ? '#60a5fa' : p.rank === 3 ? '#34d399' : 'rgba(244,239,230,0.4)')
                        : (p.is_winner ? '#4ade80' : '#ff8888');

                      return (
                        <div key={p.player_id} style={{
                          display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: '1rem',
                          padding: '0.6rem 0.8rem',
                          background: isWinner ? 'rgba(201,168,76,0.06)' : 'rgba(30,74,52,0.1)',
                          borderLeft: `2px solid ${pi === 0 && match.game_type === 'ranking' ? 'var(--gold)' : isWinner ? 'rgba(74,222,128,0.3)' : 'rgba(201,168,76,0.08)'}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Link href={`/profile/${player?.username ?? ''}`} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', textDecoration: 'none' }}>
                              {player?.nickname ?? '?'}
                            </Link>
                            {p.role && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'rgba(244,239,230,0.4)', border: '1px solid rgba(244,239,230,0.1)', padding: '0 0.3rem' }}>{p.role}</span>}
                            {p.team && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', padding: '0 0.3rem' }}>{p.team}팀</span>}
                            {p.is_mvp && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: '#e879f9', border: '1px solid rgba(232,121,249,0.4)', padding: '0 0.3rem' }}>MVP</span>}
                          </div>
                          {p.score != null && (
                            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.85rem', color: 'var(--white-dim)', textAlign: 'right' }}>{p.score}점</span>
                          )}
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', color: resultColor, textAlign: 'right', minWidth: 30 }}>{resultText}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
