'use client';

import { useState } from 'react';
import Link from 'next/link';
import LapisIcon from '@/components/LapisIcon';
import { RANK_COLOR, RANK_SYMBOL } from '@/lib/constants';

interface HoldingEntry {
  id?: string; nickname?: string; username?: string; total_chips: number; rank: number;
}

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

const ROW: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '36px 1fr 80px', gap: '0.8rem',
  alignItems: 'center', textDecoration: 'none',
  borderTop: '1px solid rgba(201,168,76,0.07)',
};

export default function HoldingsRankingClient({ holdings }: { holdings: HoldingEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const top10 = holdings.slice(0, 10);

  const chipCell = (chips: number) => (
    <span style={{
      fontFamily: "'Cinzel', serif", fontSize: '0.95rem', textAlign: 'center',
      color: chips >= 0 ? 'var(--gold)' : '#ff8888',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem',
    }}>
      {chips > 0 ? '+' : ''}{chips}<LapisIcon size={12} />
    </span>
  );

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)' }}>누적 보유량</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {holdings.length > 10 && (
              <button onClick={() => setShowAll(true)} style={{
                fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em',
                padding: '0.25rem 0.65rem', border: '1px solid rgba(201,168,76,0.35)',
                color: 'var(--gold)', background: 'transparent', cursor: 'pointer',
              }}>
                전체보기 ({holdings.length}명)
              </button>
            )}
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.5, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              전체 누적 <LapisIcon size={11} /> LAPIS
            </span>
          </div>
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
            {top10.map((e, i) => (
              <Link href={`/profile/${e.username ?? ''}`} key={e.id ?? i} style={{
                ...ROW, padding: '0.9rem 1.2rem',
                borderLeft: i < 3 ? `2px solid ${RANK_COLOR[i]}` : '2px solid transparent',
                background: i === 0 ? 'rgba(201,168,76,0.06)' : 'transparent',
              }}>
                <RankBadge rank={e.rank} />
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>{e.nickname}</span>
                {chipCell(e.total_chips)}
              </Link>
            ))}
            {holdings.length > 10 && (
              <button onClick={() => setShowAll(true)} style={{
                width: '100%', padding: '0.65rem',
                fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em',
                color: 'var(--gold-dim)', background: 'transparent', border: 'none',
                borderTop: '1px solid rgba(201,168,76,0.07)', cursor: 'pointer', opacity: 0.7,
              }}>
                + {holdings.length - 10}명 더 보기 →
              </button>
            )}
          </div>
        )}
      </div>

      {/* 전체보기 팝업 */}
      {showAll && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAll(false); }}
        >
          <div style={{ background: '#0b2218', border: '1px solid rgba(201,168,76,0.25)', maxWidth: 480, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            {/* 팝업 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(201,168,76,0.12)', flexShrink: 0 }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)' }}>
                누적 보유량 — 전체 ({holdings.length}명)
              </p>
              <button onClick={() => setShowAll(false)} style={{ background: 'none', border: 'none', color: 'var(--white-dim)', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>✕</button>
            </div>

            {/* 팝업 헤더 행 */}
            <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 80px', gap: '0.8rem', padding: '0.55rem 1.5rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--gold-dim)', borderBottom: '1px solid rgba(201,168,76,0.08)', flexShrink: 0, background: '#0b2218' }}>
              <span>#</span><span>플레이어</span>
              <span style={{ textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center' }}>
                <LapisIcon size={11} /> LAPIS
              </span>
            </div>

            {/* 스크롤 영역 */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {holdings.map((e, i) => (
                <Link href={`/profile/${e.username ?? ''}`} key={e.id ?? i} onClick={() => setShowAll(false)} style={{
                  ...ROW, padding: '0.85rem 1.5rem',
                  borderLeft: i < 3 ? `2px solid ${RANK_COLOR[i]}` : '2px solid transparent',
                  background: i === 0 ? 'rgba(201,168,76,0.06)' : 'transparent',
                }}>
                  <RankBadge rank={e.rank} />
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>{e.nickname}</span>
                  {chipCell(e.total_chips)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
