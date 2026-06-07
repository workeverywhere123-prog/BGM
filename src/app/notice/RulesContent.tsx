import React from 'react';
import Link from 'next/link';
import LapisIcon from '@/components/LapisIcon';

const noteStyle: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: '0.95rem',
  color: 'var(--white-dim)',
  lineHeight: 1.6,
};

function RuleCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(30,74,52,0.12)', padding: '1.6rem' }}>
      <div style={{ marginBottom: '1.2rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>{subtitle}</p>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1 }}>{title}</h3>
        <div style={{ width: 30, height: 1, background: 'var(--gold)', marginTop: '0.6rem', opacity: 0.4 }} />
      </div>
      {children}
    </div>
  );
}

function RuleRow({ children, plus, minus, special }: { children: React.ReactNode; plus?: boolean; minus?: boolean; special?: boolean }) {
  const color = special ? '#c084fc' : plus ? 'var(--gold)' : minus ? '#ff8888' : 'var(--white-dim)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
      <span style={{ fontSize: '0.5rem', color, flexShrink: 0 }}>◆</span>
      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color, display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}>
        {children}{(plus || minus || special) && <LapisIcon size={12} />}
      </span>
    </div>
  );
}

function RankTable({ rows }: { rows: { label: string; cols: string[] }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowX: 'auto' }}>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap', minWidth: 'max-content' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', minWidth: 24, flexShrink: 0 }}>{r.label}</span>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'nowrap' }}>
            {r.cols.map((c, i) => {
              const isPlus = c.includes('+');
              const isMinus = c.includes('−') || c.includes('-');
              return (
                <span key={i} style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.6rem',
                  color: isPlus ? 'var(--gold)' : isMinus ? '#ff8888' : 'var(--white-dim)',
                  padding: '0.1rem 0.25rem',
                  border: `1px solid ${isPlus ? 'rgba(201,168,76,0.2)' : isMinus ? 'rgba(255,100,100,0.2)' : 'rgba(244,239,230,0.1)'}`,
                  display: 'inline-flex', alignItems: 'center', gap: '0.15rem', whiteSpace: 'nowrap',
                }}>
                  {c} <LapisIcon size={9} />
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Divider({ label, color = 'var(--gold-dim)' }: { label: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', margin: '3rem 0' }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${color})` }} />
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.3em', color, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${color})` }} />
    </div>
  );
}

export default function RulesContent({ openRaffleCount = 0 }: { openRaffleCount?: number }) {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem 8rem' }}>

      <Divider label={<>✦ <LapisIcon size={13} /> LAPIS 획득 방법 ✦</>} />

      {/* 게임 타입 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1rem' }}>
        <RuleCard title="순위전" subtitle="RANKING">
          <p style={noteStyle}>양끝 합계가 항상 0 — 등수에 따라 대칭 분배</p>
          <RankTable rows={[
            { label: '2인', cols: ['1등 +1', '2등 −1'] },
            { label: '3인', cols: ['1등 +1', '2등 0', '3등 −1'] },
            { label: '4인', cols: ['1등 +2', '2등 +1', '3등 −1', '4등 −2'] },
            { label: '5인', cols: ['1등 +2', '2등 +1', '3등 0', '4등 −1', '5등 −2'] },
            { label: '6인', cols: ['1등 +3', '2등 +2', '3등 +1', '4등 −1', '5등 −2', '6등 −3'] },
          ]} />
          <p style={{ ...noteStyle, marginTop: '0.8rem', opacity: 0.75 }}>랜덤 배치 가능 · 인원이 늘수록 범위 확장</p>
        </RuleCard>

        <RuleCard title="마피아" subtitle="MAFIA">
          <RuleRow plus>마피아팀 승리 +2</RuleRow>
          <RuleRow plus>시민팀 생존자 +1</RuleRow>
          <RuleRow plus special>독립 캐릭터 우승 +3</RuleRow>
          <RuleRow>패배시 페널티 없음</RuleRow>
          <p style={{ ...noteStyle, marginTop: '0.8rem', opacity: 0.75 }}>독립 캐릭터는 단독 조건 달성시 +3</p>
        </RuleCard>

        <RuleCard title="협력 게임" subtitle="CO-OP">
          <p style={{ ...noteStyle, marginBottom: '0.75rem' }}>자신을 제외한 팀원 한 명에게 MVP 투표</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.8rem' }}>
            {([
              { label: '2인', r1: '+1', r2: '+1', note: '모두 획득' },
              { label: '3인', r1: '+1', r2: null, note: null },
              { label: '4인', r1: '+2', r2: '+1', note: null },
              { label: '5인', r1: '+2', r2: '+1', note: null },
              { label: '6인', r1: '+3', r2: '+2', note: null },
            ] as { label: string; r1: string; r2: string | null; note: string | null }[]).map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--gold-dim)', minWidth: 24, flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold)', padding: '0.1rem 0.3rem', border: '1px solid rgba(201,168,76,0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
                  1위 {row.r1} <LapisIcon size={9} />
                </span>
                {row.r2 && (
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'rgba(201,168,76,0.7)', padding: '0.1rem 0.3rem', border: '1px solid rgba(201,168,76,0.15)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
                    2위 {row.r2} <LapisIcon size={9} />
                  </span>
                )}
                {row.note && <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.8rem', color: 'var(--white-dim)', opacity: 0.7 }}>{row.note}</span>}
              </div>
            ))}
          </div>
          <div style={{ padding: '0.5rem 0.7rem', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--gold-dim)', flexShrink: 0 }}>✦</span>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)' }}>공동 순위는 가위바위보로 결정</p>
          </div>
        </RuleCard>

        <RuleCard title="1 vs 다수" subtitle="ONE VS MANY">
          <p style={{ ...noteStyle, opacity: 0.85, marginBottom: '0.6rem' }}>1인팀</p>
          <RuleRow plus>승리 +2</RuleRow>
          <RuleRow minus>패배 −1</RuleRow>
          <div style={{ height: 1, background: 'rgba(201,168,76,0.1)', margin: '0.8rem 0' }} />
          <p style={{ ...noteStyle, opacity: 0.85, marginBottom: '0.6rem' }}>다인팀 (각각)</p>
          <RuleRow plus>승리 +1</RuleRow>
          <RuleRow minus>패배 −1</RuleRow>
        </RuleCard>

        <RuleCard title="팀전" subtitle="TEAM">
          <RuleRow plus>승리팀 인당 +1</RuleRow>
          <RuleRow minus>패배팀 인당 −1</RuleRow>
        </RuleCard>

        <RuleCard title="데스매치" subtitle="DEATHMATCH">
          <p style={noteStyle}>베팅 기반 승자독식 방식</p>
          <div style={{ marginTop: '0.8rem', padding: '0.7rem', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.1)' }}>
            <p style={{ ...noteStyle, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>인당 베팅 <LapisIcon size={12} /> LAPIS를 설정하고 승자가 전부 획득</p>
            <p style={{ ...noteStyle, marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>인당 최대 베팅: 3 <LapisIcon size={11} /> LAPIS</p>
          </div>
        </RuleCard>
      </div>

      <Divider label={<>✦ 게임 방 진행 방식 · MVP 투표 ✦</>} />

      {/* 게임 방 플로우 */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', lineHeight: 1.7, marginBottom: '2rem', opacity: 0.85 }}>
          게임 방에 입장하면 게임이 끝난 후 <strong style={{ color: '#e879f9' }}>MVP 투표</strong>가 진행됩니다.
          이 투표를 통해 추가 <LapisIcon size={13} style={{ display: 'inline' }} /> LAPIS를 획득할 수 있습니다.
        </p>

        {/* 진행 플로우 */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[
            { step: '01', icon: '🎲', label: '게임 진행', desc: '방에 입장하고\n게임을 플레이합니다', color: 'var(--gold)' },
            { step: '02', icon: '📋', label: '결과 등록', desc: '방장이 게임 결과를\n입력합니다', color: '#fb923c' },
            { step: '03', icon: '🏆', label: 'MVP 투표', desc: '참가자 전원이\nMVP를 투표합니다', color: '#e879f9' },
            { step: '04', icon: '✨', label: 'LAPIS 지급', desc: 'MVP 보너스\nLAPIS가 지급됩니다', color: '#4ade80' },
          ].map((s, i, arr) => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'stretch', flex: 1, minWidth: 130 }}>
              <div style={{ flex: 1, border: `1px solid ${s.color}33`, background: `${s.color}08`, padding: '1.2rem 1rem', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.2em', color: s.color, marginBottom: '0.5rem', opacity: 0.7 }}>STEP {s.step}</p>
                <span style={{ fontSize: '1.6rem', display: 'block', marginBottom: '0.5rem' }}>{s.icon}</span>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.12em', color: s.color, marginBottom: '0.5rem' }}>{s.label}</p>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.88rem', color: 'var(--white-dim)', opacity: 0.7, lineHeight: 1.55, whiteSpace: 'pre-line' }}>{s.desc}</p>
              </div>
              {i < arr.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.3rem', color: 'rgba(201,168,76,0.3)', fontSize: '0.9rem', flexShrink: 0 }}>›</div>
              )}
            </div>
          ))}
        </div>

        {/* MVP 투표 규칙 */}
        <div style={{ border: '1px solid rgba(232,121,249,0.25)', background: 'rgba(232,121,249,0.05)', padding: '1.8rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.4rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🏆</span>
            <div>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.22em', color: 'rgba(232,121,249,0.7)', marginBottom: '0.2rem' }}>MVP VOTE</p>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1 }}>MVP 투표 방식</h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.4rem' }}>
            {[
              { icon: '🗳️', title: '자신 제외 투표', desc: '참가자 전원이 자신을 제외한\n다른 참가자 1명에게 투표합니다' },
              { icon: '📊', title: '최다 득표 = MVP', desc: '가장 많은 표를 받은 플레이어가\nMVP로 선정됩니다' },
              { icon: '✨', title: 'MVP 보너스', desc: 'MVP로 선정된 플레이어는\n+1 LAPIS 보너스를 획득합니다' },
              { icon: '⏱️', title: '투표 종료', desc: '방장이 투표 종료 버튼을 누르면\n결과가 확정되고 방이 닫힙니다' },
            ].map(item => (
              <div key={item.title} style={{ padding: '1rem', background: 'rgba(30,74,52,0.2)', border: '1px solid rgba(232,121,249,0.12)' }}>
                <span style={{ fontSize: '1.1rem', display: 'block', marginBottom: '0.5rem' }}>{item.icon}</span>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.12em', color: '#e879f9', marginBottom: '0.45rem', opacity: 0.85 }}>{item.title}</p>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.92rem', color: 'var(--white-dim)', lineHeight: 1.6, whiteSpace: 'pre-line', opacity: 0.8 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ padding: '0.8rem 1.1rem', background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.2)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>💡</span>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--white-dim)', lineHeight: 1.6 }}>
              MVP 투표는 게임 종류와 관계없이 <strong style={{ color: '#e879f9' }}>모든 게임 방에서</strong> 진행됩니다.
              게임이 끝나면 화면 상단 탭에 <strong style={{ color: '#e879f9' }}>「MVP 투표」</strong> 탭이 나타납니다.
            </p>
          </div>
        </div>
      </div>

      <Divider label={<>✦ 출석 <LapisIcon size={13} /> LAPIS ✦</>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {[
          { icon: '✓', label: '정시 참석', pt: '+5', color: 'var(--gold)', bg: 'rgba(201,168,76,0.06)' },
          { icon: '✕', label: '불참', pt: '−3', color: '#ff8888', bg: 'rgba(255,100,100,0.04)' },
          { icon: '▲', label: '지각', pt: '−1', color: '#ff8888', bg: 'rgba(255,100,100,0.04)' },
          { icon: '○', label: '모임 여부 투표 미참여', pt: '−1', color: '#ff8888', bg: 'rgba(255,100,100,0.04)' },
        ].map(a => (
          <div key={a.label} style={{ border: `1px solid ${a.color}30`, background: a.bg, padding: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.6rem', color: a.color }}>{a.icon}</span>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', marginBottom: '0.4rem' }}>{a.label}</p>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: a.color, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem' }}>{a.pt} <LapisIcon size={14} /> LAPIS</p>
          </div>
        ))}
      </div>

      <Divider label={<>✦ <LapisIcon size={13} /> LAPIS 활용법 — 추첨 ✦</>} color="var(--gold)" />

      <div style={{ border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.04)', padding: '2.5rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic' }}>
            {openRaffleCount > 0
              ? `현재 ${openRaffleCount}개의 추첨이 진행 중입니다`
              : '현재 진행 중인 추첨과 당첨 확률을 직접 확인해보세요'}
          </p>
          <Link href="/notice?tab=raffle" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em',
            padding: '0.7rem 1.6rem', background: 'var(--gold)', color: '#0b2218',
            textDecoration: 'none', fontWeight: 700,
          }}>
            {openRaffleCount > 0 ? `🎲 행운판 바로가기 (${openRaffleCount}진행) →` : '🎲 행운판 보기 →'}
          </Link>
        </div>
      </div>

      <Divider label="✦ 주의 사항 ✦" color="rgba(255,150,150,0.7)" />

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

      <div style={{ textAlign: 'center', padding: '2rem', border: '1px solid rgba(201,168,76,0.1)', background: 'rgba(30,74,52,0.08)' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>兵家之常事</p>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', color: 'var(--white-dim)', lineHeight: 1.9, fontStyle: 'italic' }}>
          승부의 세계에는 언제나 승과 패가 있기 마련.<br />
          이기기도 지기도 하는 것이 스포츠 정신이니,<br />
          매너 있게 임하고 부디 상처받지도 주지도 않길 바랍니다.
        </p>
        <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2rem', color: 'var(--gold)', marginTop: '1rem', opacity: 0.6 }}>BGM</p>
      </div>

    </div>
  );
}
