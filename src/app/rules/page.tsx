import Nav from '../nav';

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
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.3em', color: 'var(--gold-dim)' }}>✦ 포인트 획득 방법 ✦</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, var(--gold-dim))' }} />
          </div>

          {/* 게임 타입 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>

            {/* 순위전 */}
            <RuleCard title="순위전" subtitle="RANKING" accent="var(--gold)">
              <p style={noteStyle}>인원수에 비례하여 등수에 따라 포인트 분배</p>
              <RankTable rows={[
                { label: '3인', cols: ['1등 +1', '2등 0', '3등 −1'] },
                { label: '4인', cols: ['1등 +2', '2등 +1', '3등 −1', '4등 −2'] },
                { label: '5인+', cols: ['1등 +2', '2등 +2', '3등 +1', '4등 0', '5등 −1', '6등+ −2'] },
              ]} />
              <p style={{ ...noteStyle, marginTop: '0.8rem', opacity: 0.5 }}>랜덤 배치 가능</p>
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
                <p style={{ ...noteStyle, marginTop: '0.3rem', opacity: 0.5 }}>최다 득표자가 +1 포인트 획득</p>
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
                <p style={{ ...noteStyle, opacity: 0.7 }}>인당 베팅 포인트를 설정하고 승자가 전부 획득</p>
                <p style={{ ...noteStyle, marginTop: '0.3rem', opacity: 0.5 }}>기본 베팅: 3pt</p>
              </div>
            </RuleCard>

          </div>

          {/* 출석 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, var(--gold-dim))' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.3em', color: 'var(--gold-dim)' }}>✦ 출석 포인트 ✦</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, var(--gold-dim))' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '4rem' }}>
            {[
              { icon: '✓', label: '정시 참석', pt: '+1pt', color: 'var(--gold)', bg: 'rgba(201,168,76,0.06)' },
              { icon: '▲', label: '지각 또는 불참', pt: '−1pt', color: '#ff8888', bg: 'rgba(255,100,100,0.04)' },
              { icon: '○', label: '모임 여부 투표 미참여', pt: '−1pt', color: '#ff8888', bg: 'rgba(255,100,100,0.04)' },
            ].map(a => (
              <div key={a.label} style={{ border: `1px solid ${a.color}30`, background: a.bg, padding: '1.5rem', textAlign: 'center' }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.6rem', color: a.color }}>{a.icon}</span>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', marginBottom: '0.4rem' }}>{a.label}</p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: a.color, fontWeight: 600 }}>{a.pt}</p>
              </div>
            ))}
          </div>

          {/* 주의 사항 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,100,100,0.3))' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.3em', color: 'rgba(255,150,150,0.7)' }}>✦ 주의 사항 ✦</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(255,100,100,0.3))' }} />
          </div>

          <div style={{ border: '1px solid rgba(255,100,100,0.2)', background: 'rgba(255,50,50,0.04)', padding: '2rem', marginBottom: '4rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {[
                '개인 간의 포인트 거래 금지',
                '욕설·비방·비매너 행위 금지',
                '몰아주기 또는 져주기식 부당 거래 금지',
              ].map((rule, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: '#ff8888', flexShrink: 0 }}>◆</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>{rule}</span>
                </div>
              ))}
              <div style={{ marginTop: '0.4rem', padding: '0.8rem 1rem', background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.2)' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.15em', color: '#ff8888' }}>
                  적발 시 취득한 모든 포인트 몰수
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

      <footer className="bgm-footer">
        <div className="footer-logo">BGM</div>
        <div className="footer-copy">© 2026 Boardgame in Melbourne.</div>
        <div className="footer-links"><a href="#">인스타그램</a><a href="#">디스코드</a></div>
      </footer>
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
