import React from 'react';
import Nav from '../nav';
import Link from 'next/link';
import Footer from '../footer';
import LapisIcon from '@/components/LapisIcon';

export default function RulesPage() {
  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>

        {/* 헤더 */}
        <div style={{ textAlign: 'center', padding: '4rem 2rem 3rem' }}>
          <p className="section-label">BGM</p>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: 'clamp(3rem, 8vw, 5rem)', color: 'var(--foreground)', lineHeight: 1, marginBottom: '0.3rem' }}>
            How to Play
          </h1>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.4em', color: 'var(--gold)', marginTop: '0.5rem' }}>
            BOARDGAME IN MELBOURNE — 게임 규칙 안내
          </p>
          <div className="section-divider" />
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem 8rem' }}>

          {/* 상단 장식 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, var(--gold-dim))' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>✦ <LapisIcon size={13} /> LAPIS 획득 방법 ✦</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, var(--gold-dim))' }} />
          </div>

          {/* 게임 타입 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>

            {/* 순위전 */}
            <RuleCard title="순위전" subtitle="RANKING" accent="var(--gold)">
              <p style={noteStyle}>양끝 합계가 항상 0 — 등수에 따라 대칭 분배</p>
              <RankTable rows={[
                { label: '2인', cols: ['1등 +1', '2등 −1'] },
                { label: '3인', cols: ['1등 +1', '2등 0', '3등 −1'] },
                { label: '4인', cols: ['1등 +2', '2등 +1', '3등 −1', '4등 −2'] },
                { label: '5인', cols: ['1등 +2', '2등 +1', '3등 0', '4등 −1', '5등 −2'] },
                { label: '6인', cols: ['1등 +3', '2등 +2', '3등 +1', '4등 −1', '5등 −2', '6등 −3'] },
              ]} />
              <p style={{ ...noteStyle, marginTop: '0.8rem', opacity: 0.5 }}>랜덤 배치 가능 · 인원이 늘수록 범위 확장</p>
            </RuleCard>

            {/* 마피아 */}
            <RuleCard title="마피아" subtitle="MAFIA" accent="var(--gold)">
              <RuleRow plus>마피아팀 승리 +2</RuleRow>
              <RuleRow plus>시민팀 생존자 +1</RuleRow>
              <RuleRow plus special>독립 캐릭터 우승 +3</RuleRow>
              <RuleRow>패배시 페널티 없음</RuleRow>
              <p style={{ ...noteStyle, marginTop: '0.8rem', opacity: 0.5 }}>독립 캐릭터는 단독 조건 달성시 +3</p>
            </RuleCard>

            {/* 협력 게임 */}
            <RuleCard title="협력 게임" subtitle="CO-OP" accent="var(--gold)">
              <RuleRow plus>MVP 득표자 +1</RuleRow>
              <div style={{ marginTop: '0.8rem', padding: '0.7rem', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.1)' }}>
                <p style={noteStyle}>자신을 제외한 팀원 한 명에게 MVP 투표</p>
                <p style={{ ...noteStyle, marginTop: '0.3rem', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>최다 득표자가 +1 <LapisIcon size={11} /> LAPIS 획득</p>
              </div>
            </RuleCard>

            {/* 1 vs 다수 */}
            <RuleCard title="1 vs 다수" subtitle="ONE VS MANY" accent="var(--gold)">
              <p style={{ ...noteStyle, opacity: 0.6, marginBottom: '0.6rem' }}>1인팀</p>
              <RuleRow plus>승리 +2</RuleRow>
              <RuleRow minus>패배 −1</RuleRow>
              <div style={{ height: 1, background: 'rgba(201,168,76,0.1)', margin: '0.8rem 0' }} />
              <p style={{ ...noteStyle, opacity: 0.6, marginBottom: '0.6rem' }}>다인팀 (각각)</p>
              <RuleRow plus>승리 +1</RuleRow>
              <RuleRow minus>패배 −1</RuleRow>
            </RuleCard>

            {/* 팀전 */}
            <RuleCard title="팀전" subtitle="TEAM" accent="var(--gold)">
              <RuleRow plus>승리팀 +1 (각각)</RuleRow>
              <RuleRow minus>패배팀 −1 (각각)</RuleRow>
            </RuleCard>

            {/* 데스매치 */}
            <RuleCard title="데스매치" subtitle="DEATHMATCH" accent="var(--gold)">
              <p style={noteStyle}>베팅 기반 승자독식 방식</p>
              <div style={{ marginTop: '0.8rem', padding: '0.7rem', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.1)' }}>
                <p style={{ ...noteStyle, opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>인당 베팅 <LapisIcon size={12} /> LAPIS를 설정하고 승자가 전부 획득</p>
                <p style={{ ...noteStyle, marginTop: '0.3rem', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>인당 최대 베팅: 3 <LapisIcon size={11} /> LAPIS</p>
              </div>
            </RuleCard>

          </div>

          {/* 출석 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, var(--gold-dim))' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>✦ 출석 <LapisIcon size={13} /> LAPIS ✦</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, var(--gold-dim))' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '4rem' }}>
            {[
              { icon: '✓', label: '정시 참석', pt: '+1', color: 'var(--gold)', bg: 'rgba(201,168,76,0.06)' },
              { icon: '▲', label: '지각 또는 불참', pt: '−1', color: '#ff8888', bg: 'rgba(255,100,100,0.04)' },
              { icon: '○', label: '모임 여부 투표 미참여', pt: '−1', color: '#ff8888', bg: 'rgba(255,100,100,0.04)' },
            ].map(a => (
              <div key={a.label} style={{ border: `1px solid ${a.color}30`, background: a.bg, padding: '1.5rem', textAlign: 'center' }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.6rem', color: a.color }}>{a.icon}</span>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', marginBottom: '0.4rem' }}>{a.label}</p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: a.color, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>{a.pt} <LapisIcon size={14} /> LAPIS</p>
              </div>
            ))}
          </div>

          {/* LAPIS 활용법 — 추첨 */}
          <div id="raffle" style={{ scrollMarginTop: '6rem' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.5))' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.3em', color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>✦ <LapisIcon size={13} /> LAPIS 활용법 ✦</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.5))' }} />
          </div>

          <div style={{ border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.04)', padding: '2.5rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
            {/* 배경 장식 */}
            <div style={{ position: 'absolute', top: '-1rem', right: '-1rem', fontSize: '6rem', opacity: 0.04, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>🎲</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.4rem' }}>🎲</span>
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', marginBottom: '0.2rem' }}>RAFFLE SYSTEM</p>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1 }}>상품 추첨 제도</h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { icon: '🎫', title: '티켓 전환', desc: '보유 1 LAPIS = 추첨권 1장\nLAPIS로 추첨에 참가합니다' },
                { icon: '⚖️', title: '가중 추첨', desc: '티켓이 많을수록 당첨 확률 상승\nLAPIS가 많을수록 유리합니다' },
                { icon: '🔄', title: '이월 혜택', desc: '미사용 LAPIS는 다음 분기로 이월\n꾸준한 참여가 장기적으로 유리합니다' },
                { icon: '📅', title: '분기 운영', desc: '추첨은 분기별로 관리자가 개설\n기간 내에만 티켓 구매 가능합니다' },
              ].map(item => (
                <div key={item.title} style={{ padding: '1.2rem', background: 'rgba(30,74,52,0.2)', border: '1px solid rgba(201,168,76,0.12)' }}>
                  <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.6rem' }}>{item.icon}</span>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.5rem' }}>{item.title}</p>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--white-dim)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{item.desc}</p>
                </div>
              ))}
            </div>

            {/* 예시 */}
            <div style={{ padding: '1.2rem 1.5rem', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)', marginBottom: '2rem' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '0.8rem' }}>EXAMPLE — 당첨 확률 예시</p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {[
                  { name: '플레이어 A', pt: 10, total: 25 },
                  { name: '플레이어 B', pt: 8, total: 25 },
                  { name: '플레이어 C', pt: 7, total: 25 },
                ].map(p => {
                  const pct = Math.round((p.pt / p.total) * 100);
                  return (
                    <div key={p.name} style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)' }}>{p.name}</span>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold)' }}>{p.pt}pt → {pct}%</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(201,168,76,0.1)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: 2, opacity: 0.7 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.46rem', color: 'rgba(244,239,230,0.3)', marginTop: '0.8rem' }}>
                총 25티켓 기준 — 각자 투입한 티켓 수에 비례하여 당첨 확률 결정
              </p>
            </div>

            {/* 추첨 페이지 이동 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic' }}>
                현재 진행 중인 추첨과 당첨 확률을 직접 확인해보세요
              </p>
              <Link href="/raffle" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em',
                padding: '0.7rem 1.6rem', background: 'var(--gold)', color: '#0b2218',
                textDecoration: 'none', fontWeight: 700, transition: 'opacity 0.2s',
              }}>
                🎲 추첨 참가하기 →
              </Link>
            </div>
          </div>

          <div style={{ marginBottom: '4rem' }} />

          {/* 주의 사항 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,100,100,0.3))' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.3em', color: 'rgba(255,150,150,0.7)' }}>✦ 주의 사항 ✦</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(255,100,100,0.3))' }} />
          </div>

          <div style={{ border: '1px solid rgba(255,100,100,0.2)', background: 'rgba(255,50,50,0.04)', padding: '2rem', marginBottom: '4rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {([
                <span key="r1" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>개인 간의 <LapisIcon size={13} /> LAPIS 거래 금지</span>,
                <span key="r2">욕설·비방·비매너 행위 금지</span>,
                <span key="r3">몰아주기 또는 져주기식 부당 거래 금지</span>,
              ] as React.ReactNode[]).map((rule, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: '#ff8888', flexShrink: 0 }}>◆</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>{rule}</span>
                </div>
              ))}
              <div style={{ marginTop: '0.4rem', padding: '0.8rem 1rem', background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.2)' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.15em', color: '#ff8888', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  적발 시 취득한 모든 <LapisIcon size={13} /> LAPIS 몰수
                </p>
              </div>
            </div>
          </div>

          {/* 마무리 문구 */}
          <div style={{ textAlign: 'center', padding: '2rem', border: '1px solid rgba(201,168,76,0.1)', background: 'rgba(30,74,52,0.08)' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>
              兵家之常事
            </p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', color: 'var(--white-dim)', lineHeight: 1.9, fontStyle: 'italic' }}>
              승부의 세계에는 언제나 승과 패가 있기 마련.<br />
              이기기도 지기도 하는 것이 스포츠 정신이니,<br />
              매너 있게 임하고 부디 상처받지도 주지도 않길 바랍니다.
            </p>
            <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2rem', color: 'var(--gold)', marginTop: '1rem', opacity: 0.6 }}>BGM</p>
          </div>

        </div>
      </div>

      <Footer />
    </>
  );
}

/* ── helpers ── */

const noteStyle: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: '0.95rem',
  color: 'var(--white-dim)',
  lineHeight: 1.6,
};

function RuleCard({ title, subtitle, accent, children }: {
  title: string; subtitle: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div style={{ border: `1px solid ${accent}25`, background: 'rgba(30,74,52,0.12)', padding: '1.6rem' }}>
      <div style={{ marginBottom: '1.2rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>{subtitle}</p>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1 }}>{title}</h3>
        <div style={{ width: 30, height: 1, background: accent, marginTop: '0.6rem', opacity: 0.4 }} />
      </div>
      {children}
    </div>
  );
}

function RuleRow({ children, plus, minus, special }: {
  children: React.ReactNode; plus?: boolean; minus?: boolean; special?: boolean;
}) {
  const color = special ? '#c084fc' : plus ? 'var(--gold)' : minus ? '#ff8888' : 'var(--white-dim)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
      <span style={{ fontSize: '0.5rem', color, flexShrink: 0 }}>◆</span>
      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color }}>{children}</span>
    </div>
  );
}

function RankTable({ rows }: { rows: { label: string; cols: string[] }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', minWidth: 28, flexShrink: 0 }}>{r.label}</span>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {r.cols.map((c, i) => {
              const isPlus = c.includes('+');
              const isMinus = c.includes('−') || c.includes('-');
              return (
                <span key={i} style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.68rem', letterSpacing: '0.05em',
                  color: isPlus ? 'var(--gold)' : isMinus ? '#ff8888' : 'var(--white-dim)',
                  padding: '0.1rem 0.3rem',
                  border: `1px solid ${isPlus ? 'rgba(201,168,76,0.2)' : isMinus ? 'rgba(255,100,100,0.2)' : 'rgba(244,239,230,0.1)'}`,
                }}>
                  {c}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
