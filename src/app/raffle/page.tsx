import Link from 'next/link';
import Nav from '../nav';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';
import Footer from '../footer';
import LapisIcon from '@/components/LapisIcon';

export const dynamic = 'force-dynamic';

export default async function RafflePage() {
  const supabase = await createSupabaseServerClient();
  let user = null;
  try { user = await getSessionUser(); } catch {}

  const { data: raffles } = await supabase
    .from('raffles')
    .select('id, name, prize, description, status, drawn_at, winner_id, created_at, quarter_id')
    .order('created_at', { ascending: false });

  const winnerIds = (raffles ?? []).filter(r => r.winner_id).map(r => r.winner_id!);
  let winnerMap: Record<string, { nickname: string; username: string }> = {};
  if (winnerIds.length) {
    const { data: winners } = await supabase.from('players').select('id, nickname, username').in('id', winnerIds);
    winnerMap = Object.fromEntries((winners ?? []).map(p => [p.id, p]));
  }

  // Current chip balance for logged-in user
  let myBalance = 0;
  if (user) {
    const { data: txs } = await supabase.from('chip_transactions').select('amount').eq('player_id', user.id);
    myBalance = (txs ?? []).reduce((s, r) => s + r.amount, 0);
  }

  const statusLabel = (s: string) => {
    if (s === 'open') return { text: '참가 모집중', color: '#4ade80' };
    if (s === 'closed') return { text: '마감 (추첨 대기)', color: '#fb923c' };
    return { text: '추첨 완료', color: 'rgba(244,239,230,0.35)' };
  };

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '7rem', minHeight: '100vh', maxWidth: 760, margin: '0 auto', padding: '7rem 1.5rem 4rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', marginBottom: '0.5rem' }}>
            BGM — RAFFLE
          </p>
          <h1 style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '2rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>
            행운판
          </h1>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <LapisIcon size={16} /> LAPIS로 추첨권을 구매하세요 — 티켓 1장 = 1 <LapisIcon size={14} /> LAPIS
          </p>
        </div>

        {/* LAPIS → 추첨 안내 배너 */}
        <div style={{ marginBottom: '1.5rem', padding: '1.2rem 1.5rem', border: '1px solid rgba(201,168,76,0.18)', background: 'rgba(30,74,52,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🎫</span>
            <div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--gold-dim)', marginBottom: '0.2rem' }}>HOW IT WORKS</p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--white-dim)', lineHeight: 1.5 }}>
                게임·출석으로 쌓은 <LapisIcon size={14} style={{ margin: '0 1px' }} /> LAPIS로 추첨권을 구매합니다 — <span style={{ color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>1 <LapisIcon size={12} /> LAPIS = 티켓 1장</span>, 많을수록 당첨 확률 상승
              </p>
            </div>
          </div>
          <Link href="/rules#raffle" style={{
            fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.12em',
            padding: '0.5rem 1.2rem', border: '1px solid rgba(201,168,76,0.3)',
            color: 'var(--gold-dim)', textDecoration: 'none', flexShrink: 0,
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}>
            <LapisIcon size={11} /> LAPIS 규칙 보기 →
          </Link>
        </div>

        {user && (
          <div style={{ marginBottom: '2rem', padding: '1rem 1.5rem', border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.06)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><LapisIcon size={13} /> 내 LAPIS 잔액</span>
            <span style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: '1.5rem', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><LapisIcon size={18} />{myBalance}</span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><LapisIcon size={13} /> LAPIS</span>
            <span style={{ marginLeft: 'auto', fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'rgba(244,239,230,0.4)', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              미사용 <LapisIcon size={10} /> LAPIS는 다음 분기로 이월됩니다
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(raffles ?? []).length === 0 && (
            <div style={{ padding: '4rem', textAlign: 'center', border: '1px dashed rgba(201,168,76,0.15)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>
              진행 중인 추첨이 없습니다
            </div>
          )}
          {(raffles ?? []).map(r => {
            const st = statusLabel(r.status);
            const winner = r.winner_id ? winnerMap[r.winner_id] : null;
            return (
              <Link href={`/raffle/${r.id}`} key={r.id} style={{ textDecoration: 'none', display: 'block', padding: '1.5rem', border: `1px solid ${r.status === 'open' ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)'}`, background: r.status === 'open' ? 'rgba(201,168,76,0.05)' : 'rgba(30,74,52,0.1)', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.2em', color: st.color, marginBottom: '0.3rem' }}>{st.text}</p>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', color: 'var(--foreground)', marginBottom: '0.2rem' }}>{r.name}</p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>🎁 {r.prize}</p>
                    {r.description && <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)', marginTop: '0.3rem', fontStyle: 'italic' }}>{r.description}</p>}
                  </div>
                  {winner && (
                    <div style={{ textAlign: 'right' }}>
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
      <Footer />
    </>
  );
}
