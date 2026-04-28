'use client';

import { useState, useEffect, useRef } from 'react';

export interface PickedGame {
  boardlife_id: string;
  name: string;
  thumbnail_url: string | null;
  boardlife_url: string;
}

interface SearchResult {
  boardlife_id: string;
  boardlife_url: string;
  name: string;
  thumbnail_url: string | null;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.9rem', boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.25)',
  color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif",
  fontSize: '0.95rem', outline: 'none',
};

export default function BoardlifeGamePicker({
  value, onChange, placeholder = '보드게임 검색 (예: 카탄, 브라스...)',
}: {
  value: PickedGame | null;
  onChange: (g: PickedGame | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/boardlife/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
      setLoading(false);
    }, 500);
  }, [query]);

  const select = (g: SearchResult) => {
    onChange({ boardlife_id: g.boardlife_id, name: g.name, thumbnail_url: g.thumbnail_url, boardlife_url: g.boardlife_url });
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const clear = () => { onChange(null); setQuery(''); };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0.8rem', background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.3)' }}>
          {value.thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.thumbnail_url} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
          )}
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', flex: 1 }}>{value.name}</span>
          <button onClick={clear} type="button" style={{ background: 'none', border: 'none', color: 'var(--white-dim)', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.6, padding: '0 0.2rem' }}>✕</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder}
            style={inp}
          />
          {loading && (
            <span style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--gold-dim)' }}>
              검색중
            </span>
          )}
        </div>
      )}

      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 500, background: 'var(--background)', border: '1px solid rgba(201,168,76,0.25)', borderTop: 'none', maxHeight: 240, overflowY: 'auto' }}>
          {results.map(g => (
            <button
              key={g.boardlife_id}
              type="button"
              onClick={() => select(g)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.8rem', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(201,168,76,0.06)', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {g.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.thumbnail_url} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 32, height: 32, background: 'rgba(201,168,76,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-dim)', fontSize: '0.7rem' }}>🎲</div>
              )}
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)' }}>{g.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
