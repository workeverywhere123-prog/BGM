import Nav from '../nav';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import GamePageClient from './GamePageClient';
import Footer from '../footer';

async function getAllPlayerGames() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('player_games')
      .select('id, name, boardlife_id, boardlife_url, thumbnail_url, min_players, max_players, players(id, nickname, username)')
      .order('name');
    return data ?? [];
  } catch { return []; }
}

export default async function GamesPage() {
  const configured = isSupabaseConfigured();
  const games = configured ? await getAllPlayerGames() : [];

  const gameMap = new Map<string, {
    boardlife_id: string | null; boardlife_url: string | null;
    name: string; thumbnail_url: string | null;
    min_players: number | null; max_players: number | null;
    owners: Array<{ id: string; nickname: string; username: string }>;
  }>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const g of games as any[]) {
    const key = g.boardlife_id ?? g.name;
    if (!gameMap.has(key)) {
      gameMap.set(key, { boardlife_id: g.boardlife_id, boardlife_url: g.boardlife_url, name: g.name, thumbnail_url: g.thumbnail_url, min_players: g.min_players, max_players: g.max_players, owners: [] });
    }
    if (g.players) gameMap.get(key)!.owners.push(g.players);
  }

  return (
    <>
      <Nav />
      <div style={{ paddingTop: '6rem', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div className="bgm-section" style={{ paddingBottom: '2rem', textAlign: 'center' }}>
          <p className="section-label">게임 라이브러리</p>
          <h1 className="section-title">보드게임책장</h1>
          <div className="section-divider" />
          <p style={{ fontStyle: 'italic', color: 'var(--white-dim)', fontSize: '1rem', marginBottom: '2rem' }}>
            멤버들이 보유한 보드게임
          </p>
        </div>
        <GamePageClient games={[...gameMap.values()]} />
      </div>

      <Footer />
    </>
  );
}
