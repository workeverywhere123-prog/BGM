'use client';

import { useState } from 'react';
import Link from 'next/link';
import GameSearchInner from './GameSearchInner';
import GamePopup, { type GameInfo } from '@/components/GamePopup';

interface GroupedGame {
  boardlife_id: string | null;
  boardlife_url: string | null;
  name: string;
  thumbnail_url: string | null;
  min_players: number | null;
  max_players: number | null;
  owners: Array<{ id: string; nickname: string; username: string }>;
}

export default function GamePageClient({ games }: { games: GroupedGame[] }) {
  const [popup, setPopup] = useState<GameInfo | null>(null);

  const openPopup = (g: GameInfo) => setPopup(g);

  return (
    <>
      {/* Search — results trigger popup */}
      <GameSearchInner onSelect={openPopup} />

      {/* Owned games grid */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem 6rem' }}>
        <p className="section-label" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          멤버 보유 게임 ({games.length}종)
        </p>
        {games.length === 0 ? (
          <div className="board-empty"><p>등록된 게임이 없습니다</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {games.map((g, i) => (
              <div
                key={i}
                onClick={() => g.boardlife_id && openPopup({
                  boardlife_id: g.boardlife_id,
                  boardlife_url: g.boardlife_url ?? `https://boardlife.co.kr/game/${g.boardlife_id}`,
                  name: g.name,
                  thumbnail_url: g.thumbnail_url,
                })}
                style={{
                  border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(30,74,52,0.12)',
                  padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
                  cursor: g.boardlife_id ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (g.boardlife_id) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.15)'; }}
              >
                {g.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.thumbnail_url} alt={g.name} style={{ width: '100%', height: 120, objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
                ) : (
                  <div style={{ width: '100%', height: 80, background: 'rgba(201,168,76,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🎲</div>
                )}
                <div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', fontWeight: 600 }}>{g.name}</p>
                </div>
                {(g.min_players || g.max_players) && (
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--gold)' }}>
                    {g.min_players}{g.max_players && g.max_players !== g.min_players ? `–${g.max_players}` : ''}인
                  </p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {g.owners.map(o => (
                    <Link
                      href={`/profile/${o.username}`}
                      key={o.id}
                      onClick={e => e.stopPropagation()}
                      style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.08em', color: 'var(--white-dim)', border: '1px solid rgba(201,168,76,0.15)', padding: '0.2rem 0.5rem', textDecoration: 'none' }}
                    >
                      {o.nickname}
                    </Link>
                  ))}
                </div>
                {g.boardlife_id && (
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', opacity: 0.5, marginTop: 'auto' }}>
                    클릭하여 상세 보기
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {popup && <GamePopup game={popup} onClose={() => setPopup(null)} />}
    </>
  );
}
