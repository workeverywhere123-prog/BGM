import Link from 'next/link';
import Nav from '../nav';
import { getSessionUser } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function getLeaderboard() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('player_chip_totals')
      .select('player_id, total_chips')
      .order('total_chips', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) return [];

    const ids = data.map((r: { player_id: string }) => r.player_id);
    const { data: playerData } = await supabase
      .from('players')
      .select('id, nickname, username')
      .in('id', ids);

    const playerMap = Object.fromEntries(
      (playerData ?? []).map((p: { id: string; nickname: string; username: string }) => [p.id, p])
    );

    return data.map((r: { player_id: string; total_chips: number }, i: number) => ({
      rank: i + 1,
      ...playerMap[r.player_id],
      total_chips: r.total_chips,
    }));
  } catch {
    return [];
  }
}

const RANK_SYMBOL = ['✦', '2', '3'];
const ROW_CLASS = ['gold-row', 'silver-row', 'bronze-row'];

export default async function LeaderboardPage() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getSessionUser().catch(() => null) : null;
  const leaderboard = configured ? await getLeaderboard() : [];

  return (
    <>
      <Nav />
      <section className="bgm-section leaderboard-section" style={{ minHeight: '100vh', paddingTop: '8rem' }}>
        <p className="section-label">Season 2026</p>
        <h2 className="section-title">Leaderboard</h2>
        <div className="section-divider" />

        {!configured ? (
          <div className="board-empty" style={{ maxWidth: 640, margin: '0 auto' }}>
            <p>Supabase 설정 후 실제 랭킹이 표시됩니다.</p>
          </div>
        ) : (
          <div className="board">
            <div className="board-header">
              <span>#</span>
              <span>PLAYER</span>
              <span style={{ textAlign: 'center' }}>CHIPS</span>
            </div>
            {leaderboard.length === 0 ? (
              <div className="board-empty">
                <p>아직 기록된 경기가 없습니다</p>
                {user && <Link href="/admin/record">첫 경기를 기록하세요 →</Link>}
              </div>
            ) : (
              leaderboard.map((entry: { rank: number; nickname: string; total_chips: number }, i: number) => (
                <div key={i} className={`board-row ${ROW_CLASS[i] ?? 'plain-row'}`}>
                  <span className={`board-rank ${i === 0 ? 'top' : ''}`}>
                    {i < 3 ? RANK_SYMBOL[i] : entry.rank}
                  </span>
                  <span className="board-name">{entry.nickname}</span>
                  <span className="board-pts">
                    {entry.total_chips > 0 ? '+' : ''}{entry.total_chips}
                    <span style={{ fontSize: '0.65rem', marginLeft: '0.3rem', opacity: 0.5 }}>칩</span>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </section>
      <footer className="bgm-footer">
        <div className="footer-logo">BGM</div>
        <div className="footer-copy">© 2026 Boardgame in Melbourne. All rights reserved.</div>
        <div className="footer-links">
          <a href="#">Instagram</a>
          <a href="#">Discord</a>
          <a href="#">Meetup</a>
        </div>
      </footer>
    </>
  );
}
