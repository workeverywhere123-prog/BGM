import Nav from '../nav';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';
import GamePageClient from './GamePageClient';
import Footer from '../footer';

async function getAllPlayerGames() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('player_games')
      .select('id, name, boardlife_id, boardlife_url, thumbnail_url, min_players, max_players, genre, note, players(id, nickname, username)')
      .order('name');
    return data ?? [];
  } catch { return []; }
}

export default async function GamesPage() {
  const configured = isSupabaseConfigured();
  const [games, sessionUser] = await Promise.all([
    configured ? getAllPlayerGames() : Promise.resolve([]),
    getSessionUser().catch(() => null),
  ]);

  const gameMap = new Map<string, {
    boardlife_id: string | null; boardlife_url: string | null;
    name: string; thumbnail_url: string | null;
    min_players: number | null; max_players: number | null;
    genre: string | null; note: string | null;
    // owner별 player_game_id 포함 (수정 API 호출용)
    owners: Array<{ id: string; nickname: string; username: string; playerGameId: string }>;
  }>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const g of games as any[]) {
    const key = g.boardlife_id ?? g.name;
    if (!gameMap.has(key)) {
      gameMap.set(key, {
        boardlife_id: g.boardlife_id, boardlife_url: g.boardlife_url,
        name: g.name, thumbnail_url: g.thumbnail_url,
        min_players: g.min_players, max_players: g.max_players,
        genre: g.genre, note: g.note,
        owners: [],
      });
    }
    const entry = gameMap.get(key)!;
    if (g.players) {
      entry.owners.push({ ...g.players, playerGameId: g.id });
    }
    if (g.genre && !entry.genre) entry.genre = g.genre;
  }

  const ownerMap = new Map<string, { id: string; nickname: string; username: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const g of games as any[]) {
    if (g.players && !ownerMap.has(g.players.id)) {
      ownerMap.set(g.players.id, g.players);
    }
  }

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div className="bgm-section" style={{ paddingBottom: '1.5rem', textAlign: 'center' }}>
          <p className="section-label">게임 라이브러리</p>
          <h1 className="section-title">보드게임 책장</h1>
          <div className="section-divider" />
          <p style={{ fontStyle: 'italic', color: 'var(--white-dim)', fontSize: '1rem', marginBottom: '1.5rem' }}>
            멤버들이 보유한 보드게임
          </p>
        </div>
        <GamePageClient
          games={[...gameMap.values()]}
          owners={[...ownerMap.values()]}
          currentUserId={sessionUser?.id ?? null}
          currentUsername={sessionUser?.username as string ?? null}
        />
      </div>
      <Footer />
    </>
  );
}
