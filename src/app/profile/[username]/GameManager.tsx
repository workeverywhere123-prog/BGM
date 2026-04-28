'use client';

import { useState, useEffect, useRef } from 'react';

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setNoResults(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setNoResults(false);
      try {
        const res = await fetch(`/api/boardlife/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data);
        setNoResults(data.length === 0);
      } catch { setNoResults(true); }
      setSearching(false);
    }, 600);
  }, [searchQuery]);

  const selectGame = (g: BoardlifeResult) => {
    setSelected(g);
    setNameOverride(g.name);
    setSearchResults([]);
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
    setNoResults(false);
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
                  {g.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.thumbnail_url} alt={g.name} style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, background: 'rgba(201,168,76,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold-dim)' }}>
                      {g.name[0]}
                    </div>
                  )}
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

          {/* No results */}
          {noResults && !selected && (
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.5, marginBottom: '0.6rem' }}>
              검색 결과 없음 — 이름을 직접 입력하세요
            </p>
          )}

          {/* Selected game preview OR manual entry */}
          {(selected || noResults) && (
            <div style={{ marginBottom: '0.6rem' }}>
              {selected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', marginBottom: '0.5rem' }}>
                  {selected.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.thumbnail_url} alt={selected.name} style={{ width: 40, height: 40, objectFit: 'contain' }} />
                  )}
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
            <div style={{ marginBottom: '0.5rem' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {games.map(g => (
            <div key={g.id} style={{
              display: 'flex', gap: '0.6rem', alignItems: 'center',
              padding: '0.6rem 0.8rem', background: 'rgba(30,74,52,0.15)',
              borderLeft: '2px solid var(--gold-dim)', overflow: 'hidden',
            }}>
              {/* Thumbnail / placeholder */}
              <button onClick={() => openBoardlife(g)} title="보드라이브에서 보기" style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
              }}>
                {g.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.thumbnail_url} alt={g.name} style={{ width: 40, height: 40, objectFit: 'contain', display: 'block' }} />
                ) : (
                  <div style={{ width: 40, height: 40, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontSize: '1rem', color: 'var(--gold-dim)' }}>
                    {g.name[0]}
                  </div>
                )}
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
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.1rem', flexWrap: 'wrap' }}>
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
