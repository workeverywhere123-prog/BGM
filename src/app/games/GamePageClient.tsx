'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import GamePopup, { type GameInfo } from '@/components/GamePopup';
import BoardlifeGamePicker, { type PickedGame } from '@/components/BoardlifeGamePicker';

/**
 * 보드게임 썸네일 컴포넌트
 * 1순위: boardlife CDN URL 직접 로드 시도
 * 2순위: 실패 시 BGG(BoardGameGeek) API에서 이미지 검색 (브라우저에서 직접 호출)
 * 3순위: 🎲 플레이스홀더
 *
 * boardlife img CDN은 외부 hotlinking 차단 (Cloudflare).
 * BGG API는 서버 사이드에서 차단되지만 브라우저(ISP IP)에서는 가능.
 */

/**
 * 보드게임 썸네일 컴포넌트
 * 1순위: boardlife CDN URL 직접 로드 (thumbnail_url 있을 때)
 * 2순위: BGG API에서 이미지 검색 (bgg_id > name_en > name 순)
 * 3순위: 🎲 플레이스홀더
 */
/**
 * boardlife.co.kr 이미지 상태 훅
 * - img.boardlife.co.kr (구 CDN): CORP 헤더로 브라우저 차단 → 🎲
 * - boardlife.co.kr/data/... (og:image): CORP 없음 → 직접 로드 가능
 * - 기타 URL (Wikipedia 등): 직접 로드
 */
function GameThumbnail({
  src,
  name,
  h = '130px',
}: {
  src: string | null;
  name: string;
  /** CSS height 값 (e.g. '130px') */
  h?: string;
}) {
  const [failed, setFailed] = useState(false);

  // src가 바뀌면 실패 상태 초기화
  useEffect(() => { setFailed(false); }, [src]);

  if (!src || failed) {
    return (
      <div style={{ width: '100%', height: h, background: 'rgba(201,168,76,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
        🎲
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      style={{
        width: '100%', height: h, objectFit: 'contain' as const,
        background: 'rgba(0,0,0,0.25)', display: 'block',
        color: 'transparent',
      }}
      onError={() => setFailed(true)}
    />
  );
}

interface GroupedGame {
  boardlife_id: string | null;
  boardlife_url: string | null;
  name: string;
  name_en: string | null;
  bgg_id: string | null;
  thumbnail_url: string | null;
  min_players: number | null;
  max_players: number | null;
  genre: string | null;
  note: string | null;
  owners: Array<{ id: string; nickname: string; username: string; playerGameId: string }>;
}

interface Owner {
  id: string;
  nickname: string;
  username: string;
}

// 보드라이프 공식 카테고리
const GENRES = ['전략', '파티', '가족', '추상', '테마', '전쟁', '아동', '커스터마이즈'];

const GENRE_COLOR: Record<string, string> = {
  '전략': '#4ade80', '파티': '#fb923c', '가족': '#60a5fa',
  '추상': '#94a3b8', '테마': '#c084fc', '전쟁': '#f87171',
  '아동': '#fcd34d', '커스터마이즈': '#2dd4bf',
};

const chip = (active: boolean, color?: string): React.CSSProperties => ({
  fontFamily: "'Cinzel', serif",
  fontSize: '0.55rem',
  letterSpacing: '0.1em',
  padding: '0.3rem 0.75rem',
  border: `1px solid ${active ? (color ?? 'var(--gold)') : 'rgba(201,168,76,0.2)'}`,
  background: active ? `${color ?? 'var(--gold)'}22` : 'transparent',
  color: active ? (color ?? 'var(--gold)') : 'var(--white-dim)',
  cursor: 'pointer',
  transition: 'all 0.15s',
  borderRadius: 0,
  whiteSpace: 'nowrap' as const,
});

const pageBtn: React.CSSProperties = {
  fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.08em',
  padding: '0.4rem 0.7rem', border: '1px solid rgba(201,168,76,0.15)',
  background: 'transparent', color: 'var(--white-dim)', cursor: 'pointer',
  minWidth: 36, textAlign: 'center' as const,
};

const inp: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.7rem', boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)',
  color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif",
  fontSize: '0.95rem', outline: 'none',
};

// ── 보드라이프 없는 게임 편집/정보 팝업 ──────────────────────────────
function NoLinkGamePopup({
  game,
  currentUserId,
  onClose,
  onUpdated,
  onRemoved,
}: {
  game: GroupedGame;
  currentUserId: string | null;
  onClose: () => void;
  onUpdated: (name: string, genre: string, note: string) => void;
  onRemoved: () => void;
}) {
  const myEntry = game.owners.find(o => o.id === currentUserId);
  const canEdit = !!myEntry;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(game.name);
  const [genre, setGenre] = useState(game.genre ?? '');
  const [note, setNote] = useState(game.note ?? '');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const save = async () => {
    if (!myEntry) return;
    setSaving(true);
    await fetch('/api/player-games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: myEntry.playerGameId, note: note || null, genre: genre || null }),
    });
    setSaving(false);
    setEditing(false);
    onUpdated(name, genre, note);
  };

  const remove = async () => {
    if (!myEntry) return;
    if (!confirm(`"${game.name}"을(를) 컬렉션에서 제거하시겠습니까?`)) return;
    setRemoving(true);
    await fetch('/api/player-games', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: myEntry.playerGameId }),
    });
    setRemoving(false);
    onRemoved();
  };

  const toggleGenre = (g: string) => {
    const parts = genre ? genre.split(',').filter(Boolean) : [];
    if (parts.includes(g)) setGenre(parts.filter(p => p !== g).join(','));
    else setGenre([...parts, g].join(','));
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#0d2a1a', border: '1px solid rgba(201,168,76,0.25)', maxWidth: 480, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--gold-dim)' }}>
            게임 정보
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--white-dim)', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>✕</button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* 주사위 아이콘 + 이름 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>
              🎲
            </div>
            <div>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', color: 'var(--foreground)', fontWeight: 600 }}>{game.name}</p>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.12em', color: 'rgba(244,239,230,0.3)', marginTop: '0.2rem' }}>
                보드라이프 미등록 게임
              </p>
            </div>
          </div>

          {/* 소유자 */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.5rem' }}>소유자</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {game.owners.map(o => (
                <Link key={o.id} href={`/profile/${o.username}`} onClick={onClose} style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.08em',
                  padding: '0.2rem 0.5rem', border: '1px solid rgba(201,168,76,0.2)',
                  color: 'var(--white-dim)', textDecoration: 'none',
                }}>
                  {o.nickname}
                </Link>
              ))}
            </div>
          </div>

          {/* 장르 */}
          {!editing && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.5rem' }}>장르</p>
              {genre ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {genre.split(',').map((g, i) => (
                    <span key={i} style={{
                      fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.06em',
                      padding: '0.2rem 0.5rem',
                      border: `1px solid ${GENRE_COLOR[g] ?? 'var(--gold)'}55`,
                      color: GENRE_COLOR[g] ?? 'var(--gold)',
                    }}>{g}</span>
                  ))}
                </div>
              ) : (
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(244,239,230,0.3)' }}>미분류</p>
              )}
            </div>
          )}

          {/* 메모 */}
          {!editing && note && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginBottom: '0.4rem' }}>메모</p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--white-dim)' }}>{note}</p>
            </div>
          )}

          {/* 수정 폼 */}
          {editing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', marginBottom: '0.4rem' }}>장르</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {GENRES.map(g => {
                    const active = genre.split(',').includes(g);
                    return (
                      <button key={g} type="button" onClick={() => toggleGenre(g)} style={{
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
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', marginBottom: '0.4rem' }}>메모</p>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="메모 (선택사항)" style={inp} />
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          {canEdit && !editing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={() => setEditing(true)} style={{
                width: '100%', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.12em',
                padding: '0.6rem', border: '1px solid rgba(201,168,76,0.3)', background: 'transparent',
                color: 'var(--gold)', cursor: 'pointer',
              }}>
                정보 수정
              </button>
              <button onClick={remove} disabled={removing} style={{
                width: '100%', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.12em',
                padding: '0.6rem', border: '1px solid rgba(248,113,113,0.3)', background: 'transparent',
                color: '#f87171', cursor: 'pointer',
              }}>
                {removing ? '처리 중...' : '컬렉션에서 제거'}
              </button>
            </div>
          )}
          {editing && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setEditing(false)} style={{
                flex: 1, fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em',
                padding: '0.6rem', border: '1px solid rgba(201,168,76,0.2)', background: 'transparent',
                color: 'var(--white-dim)', cursor: 'pointer',
              }}>
                취소
              </button>
              <button onClick={save} disabled={saving} style={{
                flex: 2, fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em',
                padding: '0.6rem', border: 'none', background: 'var(--gold)', color: '#0b2218',
                cursor: 'pointer', fontWeight: 600,
              }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────
export default function GamePageClient({
  games: initialGames,
  owners,
  currentUserId,
  currentUsername,
}: {
  games: GroupedGame[];
  owners: Owner[];
  currentUserId: string | null;
  currentUsername: string | null;
}) {
  const [games, setGames] = useState<GroupedGame[]>(initialGames);
  const [popup, setPopup] = useState<GameInfo | null>(null);
  const [editTarget, setEditTarget] = useState<GroupedGame | null>(null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addGame, setAddGame] = useState<PickedGame | null>(null);
  const [adding, setAdding] = useState(false);
  const [addDone, setAddDone] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 24;

  const filtered = useMemo(() => {
    return games.filter(g => {
      if (search.trim()) {
        if (!g.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      }
      if (selectedOwner) {
        if (!g.owners.some(o => o.id === selectedOwner)) return false;
      }
      if (selectedGenre) {
        const genres = g.genre ? g.genre.split(',') : [];
        if (!genres.includes(selectedGenre)) return false;
      }
      return true;
    });
  }, [games, search, selectedOwner, selectedGenre]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedGames = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleOwner = (id: string) => { setSelectedOwner(prev => prev === id ? null : id); setPage(0); };
  const toggleGenre = (g: string) => { setSelectedGenre(prev => prev === g ? null : g); setPage(0); };
  const clearAll = () => { setSearch(''); setSelectedOwner(null); setSelectedGenre(null); setPage(0); };
  const hasFilter = search || selectedOwner || selectedGenre;

  const handleGameClick = (g: GroupedGame) => {
    if (g.boardlife_id) {
      setPopup({
        boardlife_id: g.boardlife_id,
        boardlife_url: g.boardlife_url ?? `https://boardlife.co.kr/game/${g.boardlife_id}`,
        name: g.name,
        thumbnail_url: g.thumbnail_url,
      });
    } else {
      setEditTarget(g);
    }
  };

  const handleUpdated = (targetName: string, newGenre: string, newNote: string) => {
    setGames(prev => prev.map(g =>
      g.name === targetName ? { ...g, genre: newGenre || null, note: newNote || null } : g
    ));
    setEditTarget(prev => prev ? { ...prev, genre: newGenre || null, note: newNote || null } : null);
  };

  const handleAddToCollection = async () => {
    if (!addGame) return;
    setAdding(true);
    try {
      const res = await fetch('/api/player-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addGame.name,
          boardlife_id: addGame.boardlife_id,
          boardlife_url: addGame.boardlife_url,
          thumbnail_url: addGame.thumbnail_url,
          name_en: null, min_players: null, max_players: null, note: null, genre: null,
        }),
      });
      if (res.ok) {
        setAddDone(true);
        setAddGame(null);
        setTimeout(() => { setAddDone(false); setShowAdd(false); window.location.reload(); }, 1200);
      }
    } catch { /* ignore */ }
    setAdding(false);
  };

  const handleRemoved = (targetName: string) => {
    setGames(prev => {
      const updated = prev.map(g => {
        if (g.name !== targetName) return g;
        const remaining = g.owners.filter(o => o.id !== currentUserId);
        return remaining.length > 0 ? { ...g, owners: remaining } : null;
      }).filter(Boolean) as GroupedGame[];
      return updated;
    });
    setEditTarget(null);
  };

  return (
    <>
      {/* ── 필터 바 ── */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 2rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="게임 이름으로 검색..."
              style={{
                width: '100%', padding: '0.55rem 2rem 0.55rem 0.85rem', boxSizing: 'border-box',
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,168,76,0.2)',
                color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif",
                fontSize: '0.95rem', outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--white-dim)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>✕</button>
            )}
          </div>
          {currentUsername && (
            <>
              <button
                onClick={() => { setShowAdd(p => !p); setAddGame(null); setAddDone(false); }}
                style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em',
                  padding: '0.55rem 1rem', border: `1px solid ${showAdd ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.4)'}`,
                  color: showAdd ? '#0b2218' : 'var(--gold)', whiteSpace: 'nowrap',
                  background: showAdd ? 'var(--gold)' : 'rgba(201,168,76,0.08)',
                  cursor: 'pointer',
                }}
              >
                {showAdd ? '✕ 닫기' : '+ 게임 추가'}
              </button>
              <Link href={`/profile/${currentUsername}`} style={{
                fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.08em',
                padding: '0.55rem 0.85rem', border: '1px solid rgba(201,168,76,0.15)',
                color: 'var(--white-dim)', textDecoration: 'none', whiteSpace: 'nowrap',
                opacity: 0.55,
              }}>
                게임 관리 →
              </Link>
            </>
          )}
          {hasFilter && (
            <button onClick={clearAll} style={{
              fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em',
              padding: '0.55rem 0.75rem', border: '1px solid rgba(255,136,136,0.3)',
              color: 'rgba(255,136,136,0.7)', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              필터 초기화
            </button>
          )}
        </div>

        {/* 소유자 필터 */}
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginRight: '0.75rem', verticalAlign: 'middle' }}>소유자</span>
          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <button onClick={() => setSelectedOwner(null)} style={chip(!selectedOwner)}>전체</button>
            {owners.map(o => (
              <button key={o.id} onClick={() => toggleOwner(o.id)} style={chip(selectedOwner === o.id)}>
                {o.nickname}
              </button>
            ))}
          </div>
        </div>

        {/* 장르 필터 */}
        <div>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', marginRight: '0.75rem', verticalAlign: 'middle' }}>장르</span>
          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <button onClick={() => setSelectedGenre(null)} style={chip(!selectedGenre)}>전체</button>
            {GENRES.map(g => (
              <button key={g} onClick={() => toggleGenre(g)} style={chip(selectedGenre === g, GENRE_COLOR[g])}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 게임 추가 패널 ── */}
      {showAdd && currentUserId && (
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 2rem 1.5rem' }}>
          <div style={{ border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(30,74,52,0.15)', padding: '1.25rem 1.5rem' }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.18em', color: 'var(--gold-dim)', marginBottom: '0.85rem' }}>
              보드라이프에서 게임 검색하여 내 컬렉션에 추가
            </p>
            <BoardlifeGamePicker value={addGame} onChange={setAddGame} placeholder="게임 이름으로 검색..." />
            {addDone ? (
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: '#4ade80', marginTop: '0.75rem', fontStyle: 'italic' }}>
                ✓ 컬렉션에 추가되었습니다
              </p>
            ) : addGame ? (
              <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                  {addGame.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={addGame.thumbnail_url} alt="" style={{ width: 36, height: 36, objectFit: 'contain', opacity: 0.85, flexShrink: 0 }} />
                  )}
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addGame.name}</span>
                </div>
                <button
                  onClick={handleAddToCollection}
                  disabled={adding}
                  style={{
                    fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.12em',
                    padding: '0.6rem 1.25rem', border: 'none', flexShrink: 0,
                    background: adding ? 'rgba(201,168,76,0.4)' : 'var(--gold)',
                    color: '#0b2218', cursor: adding ? 'not-allowed' : 'pointer', fontWeight: 600,
                  }}
                >
                  {adding ? '추가 중...' : '내 컬렉션에 추가'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── 결과 카운트 ── */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 2rem 1rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.12em', color: 'var(--white-dim)', opacity: 0.5 }}>
          {filtered.length}종 표시 중 / 전체 {games.length}종
          {totalPages > 1 && ` · ${page + 1}/${totalPages} 페이지`}
        </p>
      </div>

      {/* ── 게임 그리드 ── */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 2rem 6rem' }}>
        {filtered.length === 0 ? (
          <div className="board-empty">
            <p>{hasFilter ? '조건에 맞는 게임이 없습니다' : '등록된 게임이 없습니다'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {pagedGames.map((g) => (
              <div
                key={g.boardlife_id ?? g.name}
                onClick={() => handleGameClick(g)}
                style={{
                  border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(30,74,52,0.1)',
                  display: 'flex', flexDirection: 'column',
                  cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.35)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(30,74,52,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.15)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(30,74,52,0.1)'; }}
              >
                {/* 썸네일 */}
                <div style={{ position: 'relative' }}>
                  <GameThumbnail
                    src={g.thumbnail_url}
                    name={g.name}
                    h="130px"
                  />
                  {/* 장르 뱃지 */}
                  {g.genre && (() => {
                    const primaryGenre = g.genre.split(',')[0];
                    return (
                      <span style={{
                        position: 'absolute', top: '0.4rem', right: '0.4rem',
                        fontFamily: "'Cinzel', serif", fontSize: '0.45rem', letterSpacing: '0.06em',
                        padding: '0.12rem 0.4rem',
                        background: `${GENRE_COLOR[primaryGenre] ?? 'rgba(201,168,76,0.2)'}33`,
                        color: GENRE_COLOR[primaryGenre] ?? 'var(--gold)',
                        border: `1px solid ${GENRE_COLOR[primaryGenre] ?? 'var(--gold)'}55`,
                      }}>
                        {g.genre.split(',').slice(0, 2).join(' · ')}
                      </span>
                    );
                  })()}
                </div>

                {/* 정보 */}
                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)', fontWeight: 600, lineHeight: 1.3 }}>
                    {g.name}
                  </p>
                  {(g.min_players || g.max_players) && (
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em', color: 'var(--gold)', opacity: 0.7 }}>
                      {g.min_players}{g.max_players && g.max_players !== g.min_players ? `–${g.max_players}` : ''}인
                    </p>
                  )}
                  {/* 소유자 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: 'auto' }}>
                    {g.owners.map(o => (
                      <Link
                        href={`/profile/${o.username}`}
                        key={o.id}
                        onClick={e => e.stopPropagation()}
                        style={{
                          fontFamily: "'Cinzel', serif", fontSize: '0.5rem', letterSpacing: '0.06em',
                          color: selectedOwner === o.id ? 'var(--gold)' : 'var(--white-dim)',
                          border: `1px solid ${selectedOwner === o.id ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.12)'}`,
                          padding: '0.15rem 0.4rem', textDecoration: 'none',
                          background: selectedOwner === o.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                        }}
                      >
                        {o.nickname}
                      </Link>
                    ))}
                  </div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', letterSpacing: '0.08em', color: 'var(--gold-dim)', opacity: 0.4 }}>
                    {g.boardlife_id ? '상세 보기 →' : '정보 보기 / 수정 →'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 페이지네이션 ── */}
      {totalPages > 1 && (
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 2rem 4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem' }}>
          <button
            onClick={() => { setPage(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            disabled={page === 0}
            style={{ ...pageBtn, opacity: page === 0 ? 0.25 : 1 }}
          >«</button>
          <button
            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            disabled={page === 0}
            style={{ ...pageBtn, opacity: page === 0 ? 0.25 : 1 }}
          >‹</button>
          {Array.from({ length: totalPages }, (_, i) => i).filter(i =>
            i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 2
          ).reduce<(number | 'ellipsis')[]>((acc, i, idx, arr) => {
            if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
            acc.push(i);
            return acc;
          }, []).map((item, idx) =>
            item === 'ellipsis' ? (
              <span key={`e${idx}`} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)', opacity: 0.3, padding: '0 0.2rem' }}>…</span>
            ) : (
              <button
                key={item}
                onClick={() => { setPage(item as number); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                style={{ ...pageBtn, background: page === item ? 'rgba(201,168,76,0.15)' : 'transparent', color: page === item ? 'var(--gold)' : 'var(--white-dim)', borderColor: page === item ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)' }}
              >{(item as number) + 1}</button>
            )
          )}
          <button
            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            disabled={page === totalPages - 1}
            style={{ ...pageBtn, opacity: page === totalPages - 1 ? 0.25 : 1 }}
          >›</button>
          <button
            onClick={() => { setPage(totalPages - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            disabled={page === totalPages - 1}
            style={{ ...pageBtn, opacity: page === totalPages - 1 ? 0.25 : 1 }}
          >»</button>
        </div>
      )}

      {popup && <GamePopup game={popup} onClose={() => setPopup(null)} />}

      {editTarget && (
        <NoLinkGamePopup
          game={editTarget}
          currentUserId={currentUserId}
          onClose={() => setEditTarget(null)}
          onUpdated={(name, genre, note) => handleUpdated(name, genre, note)}
          onRemoved={() => handleRemoved(editTarget.name)}
        />
      )}
    </>
  );
}
