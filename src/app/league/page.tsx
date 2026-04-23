import Nav from '../nav';
import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function getActiveQuarter() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('quarters')
      .select('id, name, started_at')
      .eq('is_active', true)
      .maybeSingle();
    return data;
  } catch { return null; }
}

async function getQuarterRanking(quarterId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('player_active_quarter_totals')
      .select('player_id, quarter_points, gains, losses');
    if (!data?.length) return [];

    const ids = data.map((r: { player_id: string }) => r.player_id);
    const { data: players } = await supabase.from('players').select('id, nickname, username').in('id', ids);
    const map = Object.fromEntries((players ?? []).map((p: { id: string; nickname: string; username: string }) => [p.id, p]));

    return data
      .map((r: { player_id: string; quarter_points: number; gains: number; losses: number }) => ({
        ...map[r.player_id], quarter_points: r.quarter_points, gains: r.gains, losses: r.losses,
      }))
      .sort((a: { quarter_points: number }, b: { quarter_points: number }) => b.quarter_points - a.quarter_points)
      .map((r: object, i: number) => ({ ...r, rank: i + 1 }));
  } catch { return []; }
}

async function getTotalHoldings() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('player_chip_totals')
      .select('player_id, total_chips, total_gains, total_losses')
      .order('total_chips', { ascending: false })
      .limit(20);
    if (!data?.length) return [];

    const ids = data.map((r: { player_id: string }) => r.player_id);
    const { data: players } = await supabase.from('players').select('id, nickname, username').in('id', ids);
    const map = Object.fromEntries((players ?? []).map((p: { id: string; nickname: string; username: string }) => [p.id, p]));

    return data.map((r: { player_id: string; total_chips: number; total_gains: number; total_losses: number }, i: number) => ({
      rank: i + 1, ...map[r.player_id], total_chips: r.total_chips,
    }));
  } catch { return []; }
}

async function getAllQuarters() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from('quarters').select('id, name, started_at, ended_at, is_active').order('started_at', { ascending: false });
    return data ?? [];
  } catch { return []; }
}

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

export default async function LeaguePage() {
  const configured = isSupabaseConfigured();
  const [activeQuarter, quarters, holdings] = await Promise.all([
    configured ? getActiveQuarter() : Promise.resolve(null),
    configured ? getAllQuarters() : Promise.resolve([]),
    configured ? getTotalHoldings() : Promise.resolve([]),
  ]);
  const quarterRanking = activeQuarter ? await getQuarterRanking(activeQuarter.id) : [];

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

        {/* 2단 랭킹 */}
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem 6rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>

          {/* 이번 분기 랭킹 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.2rem' }}>
              <p className="section-label" style={{ textAlign: 'left', marginBottom: 0 }}>
                {activeQuarter ? `${activeQuarter.name} 랭킹` : '이번 분기 랭킹'}
              </p>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--white-dim)', opacity: 0.6 }}>
                분기 초기화 반영
              </span>
            </div>

            {!activeQuarter ? (
              <div className="board-empty">
                <p>활성 분기가 없습니다</p>
                <Link href="/admin">관리자에서 분기 설정 →</Link>
              </div>
            ) : quarterRanking.length === 0 ? (
              <div className="board-empty"><p>이번 분기 기록이 없습니다</p></div>
            ) : (
              <div style={{ border: '1px solid rgba(201,168,76,0.12)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 60px 60px', gap: '0.8rem', padding: '0.6rem 1.2rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--gold-dim)' }}>
                  <span>#</span><span>플레이어</span><span style={{ textAlign: 'center' }}>게임수</span><span style={{ textAlign: 'center' }}>포인트</span>
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(quarterRanking as any[]).map((e, i) => (
                  <Link href={`/profile/${e.username}`} key={e.id ?? i} style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr 60px 60px', gap: '0.8rem',
                    alignItems: 'center', padding: '0.9rem 1.2rem', textDecoration: 'none',
                    borderTop: '1px solid rgba(201,168,76,0.07)',
                    borderLeft: i < 3 ? `2px solid ${RANK_COLOR[i]}` : '2px solid transparent',
                    background: i === 0 ? 'rgba(201,168,76,0.08)' : 'transparent',
                    transition: 'background 0.2s',
                  }}>
                    <RankBadge rank={e.rank} />
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>{e.nickname}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.8rem', textAlign: 'center', color: 'var(--white-dim)' }}>{(e.gains ?? 0) + (e.losses ?? 0)}</span>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.2rem' }}>
              <p className="section-label" style={{ textAlign: 'left', marginBottom: 0 }}>누적 보유량</p>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--white-dim)', opacity: 0.6 }}>
                전체 누적 포인트
              </span>
            </div>

            {holdings.length === 0 ? (
              <div className="board-empty"><p>보유 기록이 없습니다</p></div>
            ) : (
              <div style={{ border: '1px solid rgba(201,168,76,0.12)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px', gap: '0.8rem', padding: '0.6rem 1.2rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--gold-dim)' }}>
                  <span>#</span><span>플레이어</span><span style={{ textAlign: 'center' }}>보유 포인트</span>
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(holdings as any[]).map((e, i) => (
                  <Link href={`/profile/${e.username}`} key={e.id ?? i} style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr 80px', gap: '0.8rem',
                    alignItems: 'center', padding: '0.9rem 1.2rem', textDecoration: 'none',
                    borderTop: '1px solid rgba(201,168,76,0.07)',
                    borderLeft: i < 3 ? `2px solid ${RANK_COLOR[i]}` : '2px solid transparent',
                    background: i === 0 ? 'rgba(201,168,76,0.06)' : 'transparent',
                    transition: 'background 0.2s',
                  }}>
                    <RankBadge rank={e.rank} />
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>{e.nickname}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.95rem', textAlign: 'center', color: e.total_chips >= 0 ? 'var(--gold)' : '#ff8888' }}>
                      {e.total_chips > 0 ? '+' : ''}{e.total_chips}
                      <span style={{ fontSize: '0.6rem', marginLeft: '0.2rem', opacity: 0.5 }}>pt</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
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
            ◆ BGM HOW TO PLAY — 포인트 규칙 보기 →
          </Link>
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
