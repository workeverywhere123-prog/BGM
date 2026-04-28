'use client';

import { useState, useEffect, useRef } from 'react';
import type { GameInfo } from '@/components/GamePopup';

interface BoardlifeResult {
  boardlife_id: string;
  boardlife_url: string;
  name: string;
  thumbnail_url: string | null;
  min_players: number | null;
  max_players: number | null;
}

export default function GameSearchInner({ onSelect }: { onSelect?: (g: GameInfo) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BoardlifeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearched(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function doSearch(q: string) {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/boardlife/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const handleSelect = (r: BoardlifeResult) => {
    if (onSelect) {
      onSelect({ boardlife_id: r.boardlife_id, boardlife_url: r.boardlife_url, name: r.name, thumbnail_url: r.thumbnail_url });
    } else {
      window.open(r.boardlife_url, '_blank', 'noopener');
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto 2rem' }}>
      <div className="join-form" style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="보드게임 이름 검색..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch(query)}
        />
        <button type="button" onClick={() => doSearch(query)} disabled={loading}>
          {loading ? '...' : '검색'}
        </button>
      </div>

      {searched && results.length === 0 && !loading && (
        <p style={{ fontStyle: 'italic', color: 'var(--white-dim)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          검색 결과가 없습니다
        </p>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left', marginBottom: '0.5rem' }}>
          {results.map(r => (
            <button
              key={r.boardlife_id}
              onClick={() => handleSelect(r)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 1rem', textDecoration: 'none', background: 'rgba(30,74,52,0.2)', borderLeft: '2px solid var(--gold-dim)', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,74,52,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(30,74,52,0.2)')}
            >
              {r.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumbnail_url} alt={r.name} style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, background: 'rgba(201,168,76,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🎲</div>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>{r.name}</p>
                {(r.min_players || r.max_players) && (
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', marginTop: '0.1rem' }}>
                    {r.min_players}{r.max_players && r.max_players !== r.min_players ? `–${r.max_players}` : ''}인
                  </p>
                )}
              </div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', flexShrink: 0 }}>
                {onSelect ? '상세 보기 →' : '보드라이프 →'}
              </span>
            </button>
          ))}
        </div>
      )}

      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.12em', color: 'var(--white-dim)', opacity: 0.4 }}>
        보드라이프 데이터베이스 기반 검색
      </p>
    </div>
  );
}
