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

/** boardlife.co.kr/game/{id} URL에서 게임 ID 추출 */
function extractBoardlifeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname === 'boardlife.co.kr' || u.hostname === 'www.boardlife.co.kr') {
      const m = u.pathname.match(/\/game\/(\d+)/);
      return m ? m[1] : null;
    }
  } catch { /* invalid url */ }
  return null;
}

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
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);

  // URL 직접 입력 모드
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlName, setUrlName] = useState('');
  const [urlId, setUrlId] = useState<string | null>(null);

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
    if (!query.trim()) { setResults([]); setOpen(false); setSearched(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(false);
      try {
        const res = await fetch(`/api/boardlife/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
      setLoading(false);
      setSearched(true);
    }, 500);
  }, [query]);

  // URL 입력 시 boardlife_id 자동 추출
  useEffect(() => {
    const id = extractBoardlifeId(urlInput);
    setUrlId(id);
  }, [urlInput]);

  const select = (g: SearchResult) => {
    onChange({ boardlife_id: g.boardlife_id, name: g.name, thumbnail_url: g.thumbnail_url, boardlife_url: g.boardlife_url });
    setQuery('');
    setResults([]);
    setOpen(false);
    setSearched(false);
  };

  const selectFromUrl = () => {
    if (!urlId || !urlName.trim()) return;
    onChange({
      boardlife_id: urlId,
      name: urlName.trim(),
      thumbnail_url: null,
      boardlife_url: `https://boardlife.co.kr/game/${urlId}`,
    });
    setUrlInput('');
    setUrlName('');
    setUrlId(null);
    setUrlMode(false);
  };

  const clear = () => { onChange(null); setQuery(''); setSearched(false); };

  // 선택된 게임 표시
  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0.8rem', background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.3)' }}>
        {value.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.thumbnail_url} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
        )}
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', flex: 1 }}>{value.name}</span>
        <a href={value.boardlife_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'var(--gold-dim)', textDecoration: 'none', opacity: 0.7 }}>보드라이프 ↗</a>
        <button onClick={clear} type="button" style={{ background: 'none', border: 'none', color: 'var(--white-dim)', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.6, padding: '0 0.2rem' }}>✕</button>
      </div>
    );
  }

  // URL 직접 입력 모드
  if (urlMode) {
    return (
      <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button type="button" onClick={() => setUrlMode(false)} style={{ background: 'none', border: 'none', color: 'var(--white-dim)', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.6, padding: 0 }}>←</button>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--gold-dim)' }}>보드라이프 URL 직접 입력</span>
        </div>
        <input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder="https://boardlife.co.kr/game/12345"
          style={inp}
        />
        {urlId && (
          <input
            value={urlName}
            onChange={e => setUrlName(e.target.value)}
            placeholder="게임 이름 입력 (필수)"
            style={inp}
            autoFocus
          />
        )}
        {urlId && urlName.trim() && (
          <button
            type="button"
            onClick={selectFromUrl}
            style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', padding: '0.5rem', border: '1px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', cursor: 'pointer' }}
          >
            이 게임으로 추가
          </button>
        )}
        {!urlId && urlInput.trim() && (
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'rgba(255,136,136,0.7)' }}>
            유효한 보드라이프 게임 URL이 아닙니다
          </p>
        )}
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'var(--white-dim)', opacity: 0.4 }}>
          보드라이프에서 게임을 찾은 후 주소창 URL을 복사하여 붙여넣으세요
        </p>
      </div>
    );
  }

  // 기본 검색 모드
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
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

      {/* 검색 결과 드롭다운 */}
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

      {/* 검색 결과 없음 → 보드라이프 URL 입력 안내 */}
      {searched && !loading && results.length === 0 && query.trim() && (
        <div style={{ marginTop: '0.6rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(201,168,76,0.12)' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--white-dim)', marginBottom: '0.5rem' }}>
            검색 결과가 없거나 보드라이프 서버에 연결할 수 없습니다
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <a
              href={`https://boardlife.co.kr/search.php?keyword=${encodeURIComponent(query)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.08em', color: 'var(--gold)', textDecoration: 'none', border: '1px solid rgba(201,168,76,0.35)', padding: '0.3rem 0.6rem' }}
            >
              보드라이프에서 검색 ↗
            </a>
            <button
              type="button"
              onClick={() => setUrlMode(true)}
              style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.08em', color: 'var(--white-dim)', background: 'none', border: '1px solid rgba(201,168,76,0.15)', padding: '0.3rem 0.6rem', cursor: 'pointer' }}
            >
              URL로 직접 추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
