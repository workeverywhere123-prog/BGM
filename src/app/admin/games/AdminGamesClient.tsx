'use client';

import { useState } from 'react';

interface PlayerGame {
  id: string;
  name: string;
  name_en?: string | null;
  bgg_id?: string | null;
  genre?: string | null;
  min_players?: number | null;
  max_players?: number | null;
  is_available: boolean;
  note?: string | null;
  thumbnail_url?: string | null;
  created_at: string;
  players: { id: string; nickname: string; username: string } | null;
}

/** Wikipedia REST API로 썸네일 URL 가져오기 (CORS 완전 지원, 안정적) */
async function fetchBggThumb(opts: { bggId?: string | null; nameEn?: string | null; name: string }): Promise<string | null> {
  const en = opts.nameEn ?? '';
  const tryWiki = async (title: string) => {
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { signal: AbortSignal.timeout(8_000) });
      if (!r.ok) return null;
      const d = await r.json();
      const src = d?.thumbnail?.source as string | undefined;
      return src ?? null; // 원본 URL 그대로 (Wikimedia 크기 변환 금지)
    } catch { return null; }
  };
  const candidates = en
    ? [`${en} (board game)`, `${en} (card game)`, `${en} (game)`, en]
    : [opts.name, `${opts.name} board game`];
  for (const t of candidates) {
    const url = await tryWiki(t as string);
    if (url) return url;
  }
  return null;
}

const s = {
  label: { fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--white-dim)', display: 'block', marginBottom: '0.25rem' } as React.CSSProperties,
  input: { width: '100%', background: 'rgba(11,34,24,0.8)', border: '1px solid var(--gold-dim)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', padding: '0.45rem 0.8rem', outline: 'none' } as React.CSSProperties,
};

function GameEditInline({ game, onSave, onCancel }: {
  game: PlayerGame;
  onSave: (updated: Partial<PlayerGame>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(game.name);
  const [nameEn, setNameEn] = useState(game.name_en ?? '');
  const [genre, setGenre] = useState(game.genre ?? '');
  const [minP, setMinP] = useState(String(game.min_players ?? ''));
  const [maxP, setMaxP] = useState(String(game.max_players ?? ''));
  const [note, setNote] = useState(game.note ?? '');
  const [available, setAvailable] = useState(game.is_available);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    setSaving(true); setMsg('');
    const res = await fetch('/api/admin/player-games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: game.id,
        name, name_en: nameEn || null,
        genre: genre || null,
        min_players: minP ? parseInt(minP) : null,
        max_players: maxP ? parseInt(maxP) : null,
        note: note || null,
        is_available: available,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSave({ name, name_en: nameEn || null, genre: genre || null, min_players: minP ? parseInt(minP) : null, max_players: maxP ? parseInt(maxP) : null, note: note || null, is_available: available });
    } else {
      const d = await res.json();
      setMsg(d.error ?? '오류 발생');
    }
  }

  return (
    <div style={{ padding: '1rem 1.2rem', background: 'rgba(201,168,76,0.04)', borderTop: '1px solid rgba(201,168,76,0.12)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 80px 80px', gap: '0.6rem', marginBottom: '0.6rem' }}>
        <div>
          <label style={s.label}>한국어명</label>
          <input value={name} onChange={e => setName(e.target.value)} style={s.input} />
        </div>
        <div>
          <label style={s.label}>영어명</label>
          <input value={nameEn} onChange={e => setNameEn(e.target.value)} style={s.input} />
        </div>
        <div>
          <label style={s.label}>장르</label>
          <input value={genre} onChange={e => setGenre(e.target.value)} style={s.input} />
        </div>
        <div>
          <label style={s.label}>최소</label>
          <input type="number" min={1} value={minP} onChange={e => setMinP(e.target.value)} style={s.input} />
        </div>
        <div>
          <label style={s.label}>최대</label>
          <input type="number" min={1} value={maxP} onChange={e => setMaxP(e.target.value)} style={s.input} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.6rem', marginBottom: '0.6rem' }}>
        <div>
          <label style={s.label}>메모</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="보관 장소, 상태 등" style={s.input} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: available ? '#4ade80' : '#f87171', padding: '0.45rem 0' }}>
            <input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
            {available ? '보유 가능' : '보유 불가'}
          </label>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <button onClick={save} disabled={saving || !name} className="btn-gold" style={{ fontSize: '0.58rem' }}>
          {saving ? '저장 중...' : '저장'}
        </button>
        <button onClick={onCancel} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', background: 'none', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--white-dim)', padding: '0.35rem 0.8rem', cursor: 'pointer' }}>
          취소
        </button>
        {msg && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: '#f87171' }}>{msg}</span>}
      </div>
    </div>
  );
}

export default function AdminGamesClient({ initialGames }: { initialGames: PlayerGame[] }) {
  const [games, setGames] = useState(initialGames);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bggRefreshId, setBggRefreshId] = useState<string | null>(null);
  const [bggMsg, setBggMsg] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  async function refreshBggImage(game: PlayerGame) {
    setBggRefreshId(game.id);
    setBggMsg(prev => ({ ...prev, [game.id]: '검색 중...' }));
    const thumb = await fetchBggThumb({ bggId: game.bgg_id, nameEn: game.name_en, name: game.name });
    if (!thumb) {
      setBggMsg(prev => ({ ...prev, [game.id]: '이미지를 찾을 수 없습니다' }));
      setBggRefreshId(null);
      return;
    }
    const res = await fetch('/api/admin/player-games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: game.id, thumbnail_url: thumb }),
    });
    if (res.ok) {
      setGames(prev => prev.map(g => g.id === game.id ? { ...g, thumbnail_url: thumb } : g));
      setBggMsg(prev => ({ ...prev, [game.id]: '✓ 갱신 완료' }));
    } else {
      setBggMsg(prev => ({ ...prev, [game.id]: '저장 실패' }));
    }
    setBggRefreshId(null);
  }

  async function deleteGame(id: string, name: string) {
    if (!confirm(`"${name}" 게임을 삭제하시겠습니까?`)) return;
    setDeletingId(id);
    const res = await fetch('/api/admin/player-games', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setGames(prev => prev.filter(g => g.id !== id));
    setDeletingId(null);
  }

  const filtered = games.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.name_en ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (g.players?.nickname ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // 플레이어별 그룹화
  const grouped = filtered.reduce<Record<string, { player: PlayerGame['players']; games: PlayerGame[] }>>((acc, g) => {
    const key = g.players?.id ?? 'unknown';
    if (!acc[key]) acc[key] = { player: g.players, games: [] };
    acc[key].games.push(g);
    return acc;
  }, {});

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.8rem', color: 'var(--foreground)', lineHeight: 1 }}>게임 책장</h1>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold)', marginTop: '0.3rem' }}>GAME SHELF MANAGEMENT</p>
        </div>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: 'var(--white-dim)' }}>총 {games.length}개</span>
      </div>

      {/* 검색 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="게임명 또는 플레이어명 검색..."
          style={{ width: '100%', maxWidth: 360, background: 'rgba(11,34,24,0.8)', border: '1px solid var(--gold-dim)', color: 'var(--foreground)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', padding: '0.6rem 1rem', outline: 'none' }}
        />
      </div>

      {/* 플레이어별 그룹 */}
      {Object.entries(grouped).map(([playerId, group]) => (
        <div key={playerId} style={{ marginBottom: '2rem' }}>
          {/* 플레이어 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: 'var(--foreground)' }}>
              {group.player?.nickname ?? '알 수 없음'}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.5 }}>
              @{group.player?.username ?? '?'}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--gold-dim)', marginLeft: 'auto' }}>
              {group.games.length}개
            </span>
          </div>

          {/* 게임 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {group.games.map(game => (
              <div key={game.id}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto auto auto auto', gap: '0.8rem', alignItems: 'center', padding: '0.65rem 1rem', background: 'rgba(30,74,52,0.1)', borderLeft: `2px solid ${game.is_available ? 'rgba(201,168,76,0.25)' : 'rgba(244,239,230,0.1)'}` }}>
                  {/* 썸네일 미리보기 */}
                  <div style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.3)', flexShrink: 0, overflow: 'hidden' }}>
                    {game.thumbnail_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={game.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '1rem' }}>🎲</span>
                    }
                  </div>

                  {/* 가용 여부 */}
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: game.is_available ? '#4ade80' : 'rgba(244,239,230,0.25)', minWidth: 40 }}>
                    {game.is_available ? '✓ 가능' : '✗'}
                  </span>

                  {/* 게임 정보 */}
                  <div>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>{game.name}</span>
                    {game.name_en && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--white-dim)', marginLeft: '0.5rem', opacity: 0.5 }}>{game.name_en}</span>}
                    {game.genre && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'var(--gold-dim)', marginLeft: '0.5rem', padding: '0.05rem 0.35rem', border: '1px solid rgba(201,168,76,0.2)' }}>{game.genre}</span>}
                    {(game.min_players || game.max_players) && (
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: 'var(--white-dim)', marginLeft: '0.5rem', opacity: 0.5 }}>
                        {game.min_players}–{game.max_players}인
                      </span>
                    )}
                    {game.note && <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.8rem', color: 'var(--white-dim)', marginLeft: '0.5rem', fontStyle: 'italic', opacity: 0.6 }}>{game.note}</span>}
                    {bggMsg[game.id] && (
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', color: bggMsg[game.id].startsWith('✓') ? '#4ade80' : '#f87171', marginLeft: '0.5rem' }}>
                        {bggMsg[game.id]}
                      </span>
                    )}
                  </div>

                  {/* 등록일 */}
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--white-dim)', opacity: 0.4 }}>
                    {new Date(game.created_at).toLocaleDateString('ko-KR')}
                  </span>

                  {/* BGG 이미지 갱신 */}
                  <button
                    onClick={() => refreshBggImage(game)}
                    disabled={bggRefreshId === game.id}
                    title="BGG에서 이미지 가져오기"
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', padding: '0.25rem 0.6rem', background: 'none', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {bggRefreshId === game.id ? '...' : '🖼 BGG'}
                  </button>

                  {/* 수정 */}
                  <button
                    onClick={() => setEditingId(editingId === game.id ? null : game.id)}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', padding: '0.25rem 0.6rem', background: editingId === game.id ? 'rgba(201,168,76,0.12)' : 'none', border: `1px solid ${editingId === game.id ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`, color: editingId === game.id ? 'var(--gold)' : 'var(--gold-dim)', cursor: 'pointer' }}>
                    ✎
                  </button>

                  {/* 삭제 */}
                  <button
                    onClick={() => deleteGame(game.id, game.name)}
                    disabled={deletingId === game.id}
                    style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', padding: '0.25rem 0.6rem', background: 'none', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', cursor: 'pointer' }}>
                    {deletingId === game.id ? '...' : '삭제'}
                  </button>
                </div>

                {/* 인라인 수정 폼 */}
                {editingId === game.id && (
                  <GameEditInline
                    game={game}
                    onSave={updated => {
                      setGames(prev => prev.map(g => g.id === game.id ? { ...g, ...updated } : g));
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', fontStyle: 'italic', color: 'rgba(244,239,230,0.25)', textAlign: 'center', padding: '3rem 0' }}>
          {search ? '검색 결과가 없습니다' : '등록된 게임이 없습니다'}
        </p>
      )}
    </div>
  );
}
