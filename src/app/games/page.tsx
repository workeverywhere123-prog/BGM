import Nav from '../nav';
import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import GameSearch from './GameSearch';

async function getAllPlayerGames() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('player_games')
      .select('id, name, name_en, bgg_id, thumbnail_url, min_players, max_players, is_available, players(id, nickname, username)')
      .eq('is_available', true)
      .order('name');
    return data ?? [];
  } catch { return []; }
}

export default async function GamesPage() {
  const configured = isSupabaseConfigured();
  const games = configured ? await getAllPlayerGames() : [];

  // 게임별 보유자 그룹핑
  const gameMap = new Map<number | string, {
    bgg_id: number | null; name: string; name_en: string | null;
    thumbnail_url: string | null; min_players: number | null; max_players: number | null;
    owners: Array<{ id: string; nickname: string; username: string }>;
  }>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const g of games as any[]) {
    const key = g.bgg_id ?? g.name;
    if (!gameMap.has(key)) {
      gameMap.set(key, { bgg_id: g.bgg_id, name: g.name, name_en: g.name_en, thumbnail_url: g.thumbnail_url, min_players: g.min_players, max_players: g.max_players, owners: [] });
    }
    if (g.players) gameMap.get(key)!.owners.push(g.players);
  }
  const groupedGames = [...gameMap.values()];

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div className="bgm-section" style={{ paddingBottom: '2rem', textAlign: 'center' }}>
          <p className="section-label">게임 라이브러리</p>
          <h1 className="section-title">보드게임 목록</h1>
          <div className="section-divider" />
          <p style={{ fontStyle: 'italic', color: 'var(--white-dim)', fontSize: '1rem', marginBottom: '2rem' }}>
            멤버들이 보유한 보드게임 · 모임에서 대여 가능
          </p>
          {/* BGG 게임 검색 */}
          <GameSearch />
        </div>

        {/* 보유 게임 목록 */}
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem 6rem' }}>
          <p className="section-label" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            멤버 보유 게임 ({groupedGames.length}종)
          </p>
          {groupedGames.length === 0 ? (
            <div className="board-empty"><p>등록된 게임이 없습니다</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {groupedGames.map((g, i) => (
                <div key={i} style={{
                  border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(30,74,52,0.12)',
                  padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
                  transition: 'all 0.3s',
                }}>
                  {g.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.thumbnail_url} alt={g.name} style={{ width: '100%', height: 120, objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
                  )}
                  {!g.thumbnail_url && (
                    <div style={{ width: '100%', height: 80, background: 'rgba(201,168,76,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🎲</div>
                  )}
                  <div>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', fontWeight: 600 }}>{g.name}</p>
                    {g.name_en && <p style={{ fontSize: '0.8rem', color: 'var(--white-dim)', fontStyle: 'italic' }}>{g.name_en}</p>}
                  </div>
                  {(g.min_players || g.max_players) && (
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--gold)' }}>
                      {g.min_players}–{g.max_players}인
                    </p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {g.owners.map(o => (
                      <Link href={`/profile/${o.username}`} key={o.id} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.08em', color: 'var(--white-dim)', border: '1px solid rgba(201,168,76,0.15)', padding: '0.2rem 0.5rem', textDecoration: 'none' }}>
                        {o.nickname}
                      </Link>
                    ))}
                  </div>
                  {g.bgg_id && (
                    <a href={`https://boardgamegeek.com/boardgame/${g.bgg_id}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', textDecoration: 'none', marginTop: 'auto' }}>
                      BGG 보기 →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="bgm-footer">
        <div className="footer-logo">BGM</div>
        <div className="footer-copy">© 2026 Boardgame in Melbourne.</div>
        <div className="footer-links"><a href="#">인스타그램</a><a href="#">디스코드</a></div>
      </footer>
    </>
  );
}
