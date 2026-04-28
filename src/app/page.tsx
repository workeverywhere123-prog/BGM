import Link from 'next/link';
import Footer from './footer';
import Nav from './nav';
import { FEATURES } from '@/lib/features';

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

        <div className="hero-title">생존은 전략이다</div>
        <p className="hero-desc">
          멜버른 최고의 보드게이머들이 모이는 곳.<br/>
          리그에서 실력을 증명하고, 역사에 이름을 새기세요.
        </p>
        <div className="hero-divider" />

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/rooms" className="hero-cta">모임 일정 보기</Link>
          <Link href="/league" style={{
            display: 'inline-block', fontFamily: "'Cinzel', serif", fontSize: '0.75rem',
            letterSpacing: '0.22em', color: 'var(--gold)', border: '1px solid var(--gold)',
            padding: '1rem 2.2rem', textDecoration: 'none', transition: 'all 0.35s ease',
            animation: 'fadeUp 2.1s ease both',
          }}>리그 현황</Link>
        </div>
      </section>

      {/* FEATURE CARDS — src/lib/features.ts 에서 자동 생성 */}
      <section className="bgm-section about-section">
        <p className="section-label">무엇을 할 수 있나요?</p>
        <h2 className="section-title">BGM에서 즐기세요</h2>
        <div className="section-divider" />
        <div className="about-grid">
          {FEATURES.map(f => (
            <Link key={f.href} href={f.href} className="about-card" style={{ textDecoration: 'none' }}>
              <span className="about-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
