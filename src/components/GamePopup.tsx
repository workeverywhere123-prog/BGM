'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export interface GameInfo {
  boardlife_id: string;
  boardlife_url: string;
  name: string;
  thumbnail_url: string | null;
}

interface Stats {
  owners: Array<{ id: string; nickname: string; username: string; note: string | null }>;
  play_count: number;
  recent_plays: Array<{ id: string; played_at: string }>;
  is_owned: boolean;
  owned_game_id: string | null;
}

export default function GamePopup({ game, onClose }: { game: GameInfo; onClose: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [owning, setOwning] = useState(false);

  useEffect(() => {
    fetch(`/api/games/stats?boardlife_id=${encodeURIComponent(game.boardlife_id)}`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [game.boardlife_id]);

  const toggleOwn = async () => {
    if (!stats || owning) return;
    setOwning(true);
    if (stats.is_owned && stats.owned_game_id) {
      await fetch('/api/player-games', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stats.owned_game_id }),
      });
      setStats(prev => prev ? { ...prev, is_owned: false, owned_game_id: null, owners: prev.owners.filter(o => o.id !== stats.owned_game_id) } : prev);
    } else {
      const res = await fetch('/api/player-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: game.name,
          boardlife_id: game.boardlife_id,
          boardlife_url: game.boardlife_url,
          thumbnail_url: game.thumbnail_url,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Re-fetch stats to get updated owners
        const fresh = await fetch(`/api/games/stats?boardlife_id=${encodeURIComponent(game.boardlife_id)}`).then(r => r.json());
        setStats(fresh);
      }
    }
    setOwning(false);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(11,34,24,0.9)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--background)', border: '1px solid rgba(201,168,76,0.3)', width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--white-dim)', fontSize: '1.1rem', cursor: 'pointer', opacity: 0.5, zIndex: 1 }}>✕</button>

        {/* Header */}
        <div style={{ display: 'flex', gap: '1.5rem', padding: '2rem', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div style={{ width: 100, height: 100, flexShrink: 0, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {game.thumbnail_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={game.thumbnail_url} alt={game.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ fontSize: '2.5rem' }}>🎲</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', color: 'var(--foreground)', lineHeight: 1.2, marginBottom: '0.5rem' }}>{game.name}</h2>
            <a
              href={game.boardlife_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', textDecoration: 'none' }}
            >
              보드라이프에서 보기 ↗
            </a>
            {/* Play count badge */}
            {!loading && stats && (
              <div style={{ marginTop: '0.8rem' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', color: stats.play_count > 0 ? 'var(--gold)' : 'var(--white-dim)', border: `1px solid ${stats.play_count > 0 ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.15)'}`, padding: '0.2rem 0.6rem' }}>
                  {stats.play_count > 0 ? `${stats.play_count}회 플레이됨` : '아직 플레이 기록 없음'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem 2rem' }}>
          {loading ? (
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)', opacity: 0.5 }}>불러오는 중...</p>
          ) : stats ? (
            <>
              {/* Owners */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.18em', color: 'var(--gold-dim)', marginBottom: '0.8rem' }}>
                  보유 멤버 ({stats.owners.length})
                </p>
                {stats.owners.length === 0 ? (
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.5 }}>
                    아직 보유 중인 멤버가 없습니다
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {stats.owners.map(o => (
                      <Link
                        key={o.id}
                        href={`/profile/${o.username}`}
                        onClick={onClose}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', background: 'rgba(30,74,52,0.25)', border: '1px solid rgba(201,168,76,0.2)', textDecoration: 'none' }}
                      >
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold-dim)', width: 20, height: 20, borderRadius: '50%', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {o.nickname[0]}
                        </span>
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--foreground)' }}>{o.nickname}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent plays */}
              {stats.recent_plays.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.18em', color: 'var(--gold-dim)', marginBottom: '0.6rem' }}>최근 플레이</p>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {stats.recent_plays.map(p => {
                      const d = new Date(p.played_at);
                      return (
                        <span key={p.id} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', border: '1px solid rgba(201,168,76,0.12)', padding: '0.2rem 0.5rem' }}>
                          {d.getMonth() + 1}/{d.getDate()}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Own toggle button */}
              <button
                onClick={toggleOwn}
                disabled={owning}
                style={{
                  width: '100%', fontFamily: "'Cinzel', serif", fontSize: '0.65rem',
                  letterSpacing: '0.15em', padding: '0.75rem',
                  border: stats.is_owned ? '1px solid rgba(255,100,100,0.4)' : '1px solid rgba(201,168,76,0.4)',
                  background: stats.is_owned ? 'rgba(255,100,100,0.08)' : 'rgba(201,168,76,0.1)',
                  color: stats.is_owned ? '#ff8888' : 'var(--gold)',
                  cursor: owning ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {owning ? '처리 중...' : stats.is_owned ? '보유 취소' : '+ 내 컬렉션에 추가'}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
