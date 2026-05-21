import Nav from '../nav';
import Link from 'next/link';
import Footer from '../footer';
import LapisIcon from '@/components/LapisIcon';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';
import RulesContent from './RulesContent';

const CATEGORY: Record<string, { label: string; color: string }> = {
  important: { label: '중요', color: '#ff6464' },
  rule:      { label: '규칙', color: 'var(--gold)' },
  event:     { label: '이벤트', color: '#4ade80' },
  general:   { label: '일반', color: 'var(--white-dim)' },
};

const TAB_META: Record<string, { subtitle: string; desc: string }> = {
  notice: {
    subtitle: '공지사항',
    desc: 'BGM의 공지와 운영 소식을 전합니다',
  },
  rules: {
    subtitle: '게임 규칙',
    desc: 'LAPIS 획득 규칙과 게임 방식 안내',
  },
  raffle: {
    subtitle: '행운판',
    desc: 'LAPIS로 추첨권을 구매하고 운을 시험해보세요',
  },
};

type SearchParams = Promise<{ tab?: string }>;

function TabBar({ activeTab, openRaffleCount, noticeCount }: {
  activeTab: string;
  openRaffleCount: number;
  noticeCount: number;
}) {
  const tabs = [
    { id: 'notice', label: '공지사항', badge: noticeCount > 0 ? String(noticeCount) : null, liveColor: null },
    { id: 'rules',  label: '게임 규칙', badge: null, liveColor: null },
    { id: 'raffle', label: '행운판', badge: openRaffleCount > 0 ? String(openRaffleCount) : null, liveColor: '#4ade80' },
  ];

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '0 2rem' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,168,76,0.15)', marginBottom: '2.5rem', overflowX: 'auto' }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <Link key={tab.id} href={`/notice?tab=${tab.id}`} style={{
              fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.2em',
              padding: '0.9rem 2rem', textDecoration: 'none', whiteSpace: 'nowrap',
              color: isActive ? 'var(--gold)' : 'rgba(244,239,230,0.4)',
              borderBottom: `2px solid ${isActive ? 'var(--gold)' : 'transparent'}`,
              marginBottom: '-1px', transition: 'color 0.2s',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              {tab.label}
              {tab.badge && (
                <span style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.45rem',
                  padding: '0.1rem 0.4rem',
                  background: tab.liveColor ? `${tab.liveColor}22` : 'rgba(201,168,76,0.12)',
                  color: tab.liveColor ?? 'var(--gold-dim)',
                  border: `1px solid ${tab.liveColor ? `${tab.liveColor}44` : 'rgba(201,168,76,0.2)'}`,
                  letterSpacing: '0.05em',
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                }}>
                  {tab.liveColor && <span style={{ width: 5, height: 5, borderRadius: '50%', background: tab.liveColor, display: 'inline-block', flexShrink: 0 }} />}
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function NoticeHubPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const activeTab = (['notice', 'rules', 'raffle'].includes(params.tab ?? '')) ? (params.tab as string) : 'notice';

  const configured = isSupabaseConfigured();

  let openRaffleCount = 0;
  let noticeCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let notices: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let raffles: any[] = [];
  let winnerMap: Record<string, { nickname: string; username: string }> = {};
  let myBalance = 0;
  let isLoggedIn = false;

  if (configured) {
    const supabase = await createSupabaseServerClient();

    // 항상 탭 배지용 카운트 조회 (경량 COUNT 쿼리)
    const [{ count: rc }, { count: nc }] = await Promise.all([
      supabase.from('raffles').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('notices').select('*', { count: 'exact', head: true }),
    ]);
    openRaffleCount = rc ?? 0;
    noticeCount = nc ?? 0;

    if (activeTab === 'notice') {
      try {
        const { data } = await supabase
          .from('notices')
          .select('id, title, category, is_pinned, created_at, players(nickname)')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });
        notices = data ?? [];
      } catch { /* empty */ }
    }

    if (activeTab === 'raffle') {
      const [sessionUser, { data: raffleData }] = await Promise.all([
        getSessionUser().catch(() => null),
        supabase.from('raffles')
          .select('id, name, prize, description, status, drawn_at, winner_id, created_at')
          .order('created_at', { ascending: false }),
      ]);
      isLoggedIn = !!sessionUser;
      raffles = raffleData ?? [];

      const winnerIds = raffles.filter(r => r.winner_id).map(r => r.winner_id as string);
      const [winnersResult, txsResult] = await Promise.all([
        winnerIds.length
          ? supabase.from('players').select('id, nickname, username').in('id', winnerIds)
          : Promise.resolve({ data: [] }),
        sessionUser
          ? supabase.from('chip_transactions').select('amount').eq('player_id', sessionUser.id)
          : Promise.resolve({ data: [] }),
      ]);
      winnerMap = Object.fromEntries(((winnersResult.data ?? []) as { id: string; nickname: string; username: string }[]).map(p => [p.id, p]));
      myBalance = ((txsResult.data ?? []) as { amount: number }[]).reduce((s, r) => s + r.amount, 0);
    }
  }

  const statusLabel = (s: string) => {
    if (s === 'open') return { text: '참가 모집중', color: '#4ade80' };
    if (s === 'closed') return { text: '마감 (추첨 대기)', color: '#fb923c' };
    return { text: '추첨 완료', color: 'rgba(244,239,230,0.35)' };
  };

  const meta = TAB_META[activeTab];

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>

        {/* 헤더 */}
        <div style={{ textAlign: 'center', padding: '3rem 2rem 1.5rem' }}>
          <p className="section-label">BGM</p>
          <h1 className="section-title">공지사항</h1>
          <div className="section-divider" />
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic',
            marginTop: '0.5rem', opacity: 0.75,
          }}>
            {meta.desc}
          </p>
        </div>

        <TabBar activeTab={activeTab} openRaffleCount={openRaffleCount} noticeCount={noticeCount} />

        {/* ── 공지사항 탭 ── */}
        {activeTab === 'notice' && (
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 6rem' }}>
            {notices.length === 0 ? (
              <div className="board-empty"><p>등록된 공지가 없습니다</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {notices.map((n) => {
                  const cat = CATEGORY[n.category as keyof typeof CATEGORY] ?? CATEGORY.general;
                  return (
                    <Link href={`/notice/${n.id}`} key={n.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '1rem',
                      padding: '1.2rem 1.8rem', textDecoration: 'none',
                      background: n.is_pinned ? 'rgba(201,168,76,0.06)' : 'rgba(30,74,52,0.12)',
                      borderLeft: `2px solid ${n.is_pinned ? 'var(--gold)' : 'var(--gold-dim)'}`,
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                          {n.is_pinned && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '0.1rem 0.4rem' }}>고정</span>}
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', color: cat.color, border: `1px solid ${cat.color}`, padding: '0.1rem 0.4rem', opacity: 0.8 }}>{cat.label}</span>
                        </div>
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: 'var(--foreground)' }}>{n.title}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)' }}>{n.players?.nickname}</div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--white-dim)', opacity: 0.6, marginTop: '0.2rem' }}>
                          {new Date(n.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ── 게임 규칙 탭 ── */}
        {activeTab === 'rules' && <RulesContent openRaffleCount={openRaffleCount} />}

        {/* ── 행운판 탭 ── */}
        {activeTab === 'raffle' && (
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1.5rem 6rem' }}>

            {/* LAPIS 안내 배너 */}
            <div style={{ marginBottom: '1.5rem', padding: '1.2rem 1.5rem', border: '1px solid rgba(201,168,76,0.18)', background: 'rgba(30,74,52,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🎫</span>
                <div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--gold-dim)', marginBottom: '0.2rem' }}>HOW IT WORKS</p>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--white-dim)', lineHeight: 1.5 }}>
                    게임·출석으로 쌓은 <LapisIcon size={14} style={{ margin: '0 1px' }} /> LAPIS로 추첨권을 구매합니다 —{' '}
                    <span style={{ color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>1 <LapisIcon size={12} /> LAPIS = 티켓 1장</span>
                  </p>
                </div>
              </div>
              <Link href="/notice?tab=rules" style={{
                fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.12em',
                padding: '0.5rem 1.2rem', border: '1px solid rgba(201,168,76,0.3)',
                color: 'var(--gold-dim)', textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
                <LapisIcon size={11} /> 규칙 보기 →
              </Link>
            </div>

            {/* 내 LAPIS 잔액 */}
            {isLoggedIn && (
              <div style={{ marginBottom: '2rem', padding: '1rem 1.5rem', border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.06)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><LapisIcon size={13} /> 내 LAPIS 잔액</span>
                <span style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.5rem', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><LapisIcon size={18} />{myBalance}</span>
                <span style={{ marginLeft: 'auto', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'rgba(244,239,230,0.4)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  미사용 <LapisIcon size={10} /> LAPIS는 다음 분기로 이월됩니다
                </span>
              </div>
            )}

            {/* 추첨 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {raffles.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', border: '1px dashed rgba(201,168,76,0.15)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>
                  진행 중인 추첨이 없습니다
                </div>
              ) : raffles.map(r => {
                const st = statusLabel(r.status);
                const winner = r.winner_id ? winnerMap[r.winner_id] : null;
                return (
                  <Link href={`/raffle/${r.id}`} key={r.id} style={{
                    textDecoration: 'none', display: 'block', padding: '1.5rem',
                    border: `1px solid ${r.status === 'open' ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)'}`,
                    background: r.status === 'open' ? 'rgba(201,168,76,0.05)' : 'rgba(30,74,52,0.1)',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.2em', color: st.color, marginBottom: '0.3rem' }}>{st.text}</p>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', color: 'var(--foreground)', marginBottom: '0.2rem' }}>{r.name}</p>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>🎁 {r.prize}</p>
                        {r.description && <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)', marginTop: '0.3rem', fontStyle: 'italic' }}>{r.description}</p>}
                      </div>
                      {winner && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--gold-dim)', marginBottom: '0.2rem' }}>당첨자</p>
                          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: 'var(--gold)' }}>{winner.nickname}</p>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

          </div>
        )}

      </div>
      <Footer />
    </>
  );
}
