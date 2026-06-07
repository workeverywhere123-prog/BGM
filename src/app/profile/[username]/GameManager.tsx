'use client';

import { useState, useEffect, useRef } from 'react';

/** boardlife CDN 이미지 — 403/Cloudflare 차단 대응 썸네일 컴포넌트
 *  size를 px 문자열로 통일해 SSR/CSR hydration mismatch 방지 */
function GameThumb({ src, fallback, size = 40 }: { src: string | null; fallback: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  const sz = `${size}px`;
  const placeholderStyle: React.CSSProperties = {
    width: sz, height: sz,
    background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Cinzel', serif", fontSize: `${size * 0.4}px`, color: 'var(--gold-dim)', flexShrink: 0,
  };

  if (!src || failed) return <div style={placeholderStyle}>{fallback}</div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={imgRef} src={src} alt="" style={{ width: sz, height: sz, objectFit: 'contain', display: 'block', flexShrink: 0, color: 'transparent' }}
      onError={() => setFailed(true)} />
  );
}

const GENRES = ['전략', '파티', '가족', '추상', '테마', '전쟁', '아동', '커스터마이즈'];
const GENRE_COLOR: Record<string, string> = {
  '전략': '#4ade80', '파티': '#fb923c', '가족': '#60a5fa',
  '추상': '#94a3b8', '테마': '#c084fc', '전쟁': '#f87171',
  '아동': '#fcd34d', '커스터마이즈': '#2dd4bf',
};

interface PlayerGame {
  id: string;
  name: string;
  name_en: string | null;
  boardlife_id: string | null;
  boardlife_url: string | null;
  thumbnail_url: string | null;
  min_players: number | null;
  max_players: number | null;
  note: string | null;
  genre: string | null;
}

interface BoardlifeResult {
  boardlife_id: string;
  boardlife_url: string;
  name: string;
  name_en: string | null;
  thumbnail_url: string | null;
  min_players: number | null;
  max_players: number | null;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.7rem', boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)',
  color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif",
  fontSize: '0.95rem', outline: 'none',
};

export default function GameManager({ initialGames }: { initialGames: PlayerGame[] }) {
  const [games, setGames] = useState<PlayerGame[]>(initialGames);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BoardlifeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<BoardlifeResult | null>(null);
  const [nameOverride, setNameOverride] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [genre, setGenre] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setNoResults(false); setSearchError(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setNoResults(false);
      setSearchError(false);
      try {
        const res = await fetch(`/api/boardlife/search?q=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) { setSearchError(true); setSearching(false); return; }
        const data = await res.json();
        setSearchResults(data);
        setNoResults(data.length === 0);
      } catch { setSearchError(true); }
      setSearching(false);
    }, 600);
  }, [searchQuery]);

  const selectGame = async (g: BoardlifeResult) => {
    setSelected(g);
    setNameOverride(g.name);
    setSearchResults([]);
    setGenre('');
    // 보드라이프에서 카테고리 자동 가져오기
    try {
      const res = await fetch(`/api/boardlife/categories?id=${g.boardlife_id}`);
      const data = await res.json();
      if (data.categories?.length) {
        setGenre(data.categories.map((c: { label: string }) => c.label).join(','));
      }
    } catch { /* 실패 시 빈값 유지 */ }
  };

  const addGame = async () => {
    const finalName = nameOverride.trim() || selected?.name || searchQuery.trim();
    if (!finalName) return;
    setSaving(true);
    const res = await fetch('/api/player-games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: finalName,
        name_en: selected?.name_en ?? null,
        boardlife_id: selected?.boardlife_id ?? null,
        boardlife_url: selected?.boardlife_url ?? null,
        thumbnail_url: selected?.thumbnail_url ?? null,
        min_players: selected?.min_players ?? null,
        max_players: selected?.max_players ?? null,
        note: note || null,
        genre: genre || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setGames(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      resetForm();
    }
    setSaving(false);
  };

  const removeGame = async (id: string) => {
    if (!confirm('게임을 삭제하시겠습니까?')) return;
    await fetch('/api/player-games', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setGames(prev => prev.filter(g => g.id !== id));
  };

  const openBoardlife = (g: PlayerGame) => {
    const url = g.boardlife_url
      ? g.boardlife_url
      : `https://boardlife.co.kr/board_game_search.php?search=${encodeURIComponent(g.name)}`;
    window.open(url, '_blank', 'noopener');
  };

  const resetForm = () => {
    setShowAdd(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelected(null);
    setNameOverride('');
    setNote('');
    setGenre('');
    setNoResults(false);
    setSearchError(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <p className="section-label" style={{ textAlign: 'left' }}>보유 보드게임 ({games.length})</p>
        <button onClick={() => setShowAdd(v => !v)} style={{
          fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em',
          padding: '0.3rem 0.7rem', border: '1px solid rgba(201,168,76,0.3)',
          background: showAdd ? 'rgba(201,168,76,0.1)' : 'transparent',
          color: 'var(--gold)', cursor: 'pointer',
        }}>
          {showAdd ? '취소' : '+ 추가'}
        </button>
      </div>

      {/* Add Game Panel */}
      {showAdd && (
        <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(30,74,52,0.15)' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.6rem' }}>
            보드라이브 검색
          </p>

          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSelected(null); }}
              placeholder="게임 이름 검색 (예: 카탄, 도미니언...)"
              style={inp}
              autoFocus
            />
            {searching && (
              <span style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--gold-dim)' }}>
                검색중...
              </span>
            )}
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(11,34,24,0.95)', marginBottom: '0.6rem', maxHeight: 260, overflowY: 'auto' }}>
              {searchResults.map(g => (
                <button key={g.boardlife_id} onClick={() => selectGame(g)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.6rem 0.8rem', background: 'transparent',
                  border: 'none', borderBottom: '1px solid rgba(201,168,76,0.07)',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <GameThumb src={g.thumbnail_url} fallback={g.name[0]} size={36} />
                  <div>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)' }}>{g.name}</p>
                    {(g.min_players || g.max_players) && (
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--gold-dim)', marginTop: '0.1rem' }}>
                        {g.min_players}–{g.max_players ?? g.min_players}인
                      </p>
                    )}
                  </div>
                  <span style={{ marginLeft: 'auto', fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'var(--gold-dim)', opacity: 0.6, flexShrink: 0 }}>보드라이브</span>
                </button>
              ))}
            </div>
          )}

          {/* 연결 오류 */}
          {searchError && !selected && (
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: '#ff6b6b', marginBottom: '0.6rem' }}>
              ⚠ 보드라이프 연결 실패 — 잠시 후 다시 시도하거나 이름을 직접 입력하세요
            </p>
          )}

          {/* No results */}
          {noResults && !selected && !searchError && (
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.5, marginBottom: '0.6rem' }}>
              검색 결과 없음 — 이름을 직접 입력하세요
            </p>
          )}

          {/* Selected game preview OR manual entry */}
          {(selected || noResults) && (
            <div style={{ marginBottom: '0.6rem' }}>
              {selected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', marginBottom: '0.5rem' }}>
                  <GameThumb src={selected.thumbnail_url} fallback={selected.name[0]} size={40} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--gold)' }}>{selected.name}</p>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'var(--gold-dim)', opacity: 0.7 }}>보드라이브 #{selected.boardlife_id}</p>
                  </div>
                  <button onClick={() => { setSelected(null); setNameOverride(''); }} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: '#ff8888', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              )}
              <input
                value={nameOverride}
                onChange={e => setNameOverride(e.target.value)}
                placeholder={selected ? '이름 수정 (선택사항)' : '게임 이름 직접 입력'}
                style={{ ...inp, marginBottom: '0.4rem' }}
              />
            </div>
          )}

          {/* Options */}
          {(selected || (noResults && nameOverride)) && (
            <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {/* 장르 선택 */}
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', marginBottom: '0.3rem' }}>
                  장르
                  {selected && genre && <span style={{ color: 'var(--gold)', marginLeft: '0.4rem' }}>· 보드라이프 자동 감지</span>}
                  {selected && !genre && <span style={{ color: 'rgba(244,239,230,0.35)', marginLeft: '0.4rem' }}>· 직접 선택하세요</span>}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {GENRES.map(g => {
                    const active = genre.split(',').includes(g);
                    return (
                      <button key={g} type="button" onClick={() => {
                        const parts = genre ? genre.split(',').filter(Boolean) : [];
                        if (parts.includes(g)) setGenre(parts.filter(p => p !== g).join(','));
                        else setGenre([...parts, g].join(','));
                      }} style={{
                        fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.08em',
                        padding: '0.2rem 0.55rem', cursor: 'pointer',
                        border: `1px solid ${active ? (GENRE_COLOR[g] ?? 'var(--gold)') : 'rgba(201,168,76,0.2)'}`,
                        background: active ? `${GENRE_COLOR[g] ?? 'var(--gold)'}22` : 'transparent',
                        color: active ? (GENRE_COLOR[g] ?? 'var(--gold)') : 'var(--white-dim)',
                      }}>
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="메모 (선택사항)"
                style={{ ...inp }}
              />
            </div>
          )}

          {(selected || (noResults && nameOverride.trim())) && (
            <button onClick={addGame} disabled={saving} style={{
              width: '100%', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em',
              padding: '0.5rem', border: 'none', background: 'var(--gold)', color: '#0b2218',
              cursor: 'pointer', fontWeight: 600,
            }}>
              {saving ? '등록 중...' : '게임 등록'}
            </button>
          )}
        </div>
      )}

      {/* Games list */}
      {games.length === 0 && !showAdd ? (
        <div className="board-empty"><p>등록된 게임이 없습니다</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '420px', overflowY: 'auto' }}>
          {games.map(g => (
            <div key={g.id} style={{
              display: 'flex', gap: '0.6rem', alignItems: 'center',
              padding: '0.6rem 0.8rem', background: 'rgba(30,74,52,0.15)',
              borderLeft: '2px solid var(--gold-dim)',
            }}>
              {/* Thumbnail / placeholder */}
              <button onClick={() => openBoardlife(g)} title="보드라이브에서 보기" style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
              }}>
                <GameThumb src={g.thumbnail_url} fallback={g.name[0]} size={40} />
              </button>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <button onClick={() => openBoardlife(g)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', width: '100%',
                }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                    {g.name}
                  </p>
                </button>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.1rem', flexWrap: 'wrap' }}>
                  {g.genre && g.genre.split(',').slice(0, 2).map((cat, ci) => (
                    <span key={ci} style={{
                      fontFamily: "'Cinzel', serif", fontSize: '0.45rem', letterSpacing: '0.05em',
                      padding: '0.1rem 0.35rem',
                      border: `1px solid ${GENRE_COLOR[cat] ?? 'var(--gold)'}55`,
                      color: GENRE_COLOR[cat] ?? 'var(--gold)',
                    }}>
                      {cat}
                    </span>
                  ))}
                  {g.min_players && (
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)' }}>
                      {g.min_players}{g.max_players && g.max_players !== g.min_players ? `–${g.max_players}` : ''}인
                    </span>
                  )}
                  {g.note && <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.8rem', color: 'var(--white-dim)', opacity: 0.55, fontStyle: 'italic' }}>{g.note}</span>}
                </div>
              </div>

              {/* Actions */}
              <button onClick={() => removeGame(g.id)} title="삭제" style={{
                flexShrink: 0, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', border: '1px solid rgba(255,100,100,0.25)', color: 'rgba(255,136,136,0.5)',
                background: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ff8888'; e.currentTarget.style.borderColor = 'rgba(255,100,100,0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,136,136,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,100,100,0.25)'; }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
