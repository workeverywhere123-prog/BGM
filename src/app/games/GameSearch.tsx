'use client';

import { useState } from 'react';

interface SearchResult {
  id: number;
  name: string;
  yearPublished?: number;
  thumbnail?: string;
  minPlayers?: number;
  maxPlayers?: number;
  rating?: number;
}

export default function GameSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/bgg/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto 2rem' }}>
      <div className="join-form" style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="보드게임 이름으로 검색..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button type="button" onClick={search} disabled={loading}>
          {loading ? '...' : '검색'}
        </button>
      </div>

      {searched && results.length === 0 && !loading && (
        <p style={{ fontStyle: 'italic', color: 'var(--white-dim)', fontSize: '0.9rem' }}>검색 결과가 없습니다.</p>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left' }}>
          {results.map(r => (
            <a
              key={r.id}
              href={`https://boardgamegeek.com/boardgame/${r.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.8rem',
                padding: '0.8rem 1.2rem', textDecoration: 'none',
                background: 'rgba(30,74,52,0.2)', borderLeft: '2px solid var(--gold-dim)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>{r.name}</p>
                {r.yearPublished && <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--white-dim)' }}>{r.yearPublished}</p>}
              </div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--gold-dim)' }}>BGG →</span>
            </a>
          ))}
        </div>
      )}

      <p style={{ marginTop: '0.8rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.12em', color: 'var(--white-dim)', opacity: 0.5 }}>
        BoardGameGeek 데이터베이스 기반 검색
      </p>
    </div>
  );
}
