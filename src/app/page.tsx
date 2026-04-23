import Link from 'next/link';
import Nav from './nav';

export default function Home() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="bgm-hero">
        <div className="logo-ring">
          <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e8cc80"/>
                <stop offset="40%" stopColor="#c9a84c"/>
                <stop offset="100%" stopColor="#7a6228"/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="140" cy="140" r="118" stroke="url(#ringGrad)" strokeWidth="3.5"
              strokeDasharray="640 80" strokeDashoffset="20"
              strokeLinecap="round" filter="url(#glow)" opacity="0.9"/>
            <circle cx="60" cy="72" r="1.8" fill="#e8cc80" opacity="0.9"/>
            <circle cx="220" cy="85" r="1.2" fill="#c9a84c" opacity="0.7"/>
            <circle cx="245" cy="155" r="2" fill="#e8cc80" opacity="0.8"/>
            <circle cx="80" cy="200" r="1.5" fill="#c9a84c" opacity="0.6"/>
            <circle cx="170" cy="35" r="1" fill="#e8cc80" opacity="0.9"/>
            <circle cx="35" cy="145" r="1.3" fill="#c9a84c" opacity="0.7"/>
            <circle cx="140" cy="255" r="1.8" fill="#e8cc80" opacity="0.6"/>
            <path d="M 40 185 Q 60 200 30 210" stroke="url(#ringGrad)" strokeWidth="6" strokeLinecap="round" opacity="0.7"/>
            <path d="M 230 90 Q 255 75 265 95" stroke="url(#ringGrad)" strokeWidth="5" strokeLinecap="round" opacity="0.6"/>
          </svg>
          <div className="logo-inner">
            <span className="logo-bgm">BGM</span>
            <span className="logo-sub">BOARDGAME IN MELBOURNE</span>
          </div>
        </div>

        <div className="hero-title">멜버른 한인 보드게임 모임</div>
        <p className="hero-desc">
          함께 앉아, 전략을 겨루고, 우정을 쌓아가는<br/>
          멜버른 최고의 한인 보드게임 커뮤니티
        </p>
        <div className="hero-divider" />

        {/* Quick links */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/meeting" className="hero-cta">모임 일정 보기</Link>
          <Link href="/league" style={{
            display: 'inline-block',
            fontFamily: "'Cinzel', serif",
            fontSize: '0.75rem',
            letterSpacing: '0.22em',
            color: 'var(--gold)',
            border: '1px solid var(--gold)',
            padding: '1rem 2.2rem',
            textDecoration: 'none',
            transition: 'all 0.35s ease',
            animation: 'fadeUp 2.1s ease both',
          }}>리그 현황</Link>
        </div>
      </section>

      {/* QUICK FEATURE CARDS */}
      <section className="bgm-section about-section">
        <p className="section-label">무엇을 할 수 있나요?</p>
        <h2 className="section-title">BGM에서 즐기세요</h2>
        <div className="section-divider" />
        <div className="about-grid">
          <Link href="/league" className="about-card" style={{ textDecoration: 'none' }}>
            <span className="about-icon">🏆</span>
            <h3>리그 &amp; 랭킹</h3>
            <p>칩 기반 리그 시스템으로 실력을 겨루고 시즌 랭킹을 확인하세요.</p>
          </Link>
          <Link href="/meeting" className="about-card" style={{ textDecoration: 'none' }}>
            <span className="about-icon">📅</span>
            <h3>모임 일정</h3>
            <p>정기 모임 일정과 경기 결과, 출석 현황을 한 눈에 확인하세요.</p>
          </Link>
          <Link href="/notice" className="about-card" style={{ textDecoration: 'none' }}>
            <span className="about-icon">📢</span>
            <h3>공지사항</h3>
            <p>모임 규칙, 이벤트 안내, 중요 공지를 놓치지 마세요.</p>
          </Link>
          <Link href="/games" className="about-card" style={{ textDecoration: 'none' }}>
            <span className="about-icon">🎲</span>
            <h3>보드게임 목록</h3>
            <p>멤버들이 보유한 보드게임을 확인하고 모임에서 즐겨보세요.</p>
          </Link>
        </div>
      </section>

      <footer className="bgm-footer">
        <div className="footer-logo">BGM</div>
        <div className="footer-copy">© 2026 Boardgame in Melbourne. All rights reserved.</div>
        <div className="footer-links">
          <a href="#">인스타그램</a>
          <a href="#">디스코드</a>
          <a href="#">카카오톡</a>
        </div>
      </footer>
    </>
  );
}
