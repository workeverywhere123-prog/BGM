import Link from 'next/link';
import { getSessionUser } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logoutAction } from './(auth)/actions';

async function getLeaderboard() {
  try {
    const supabase = await createSupabaseServerClient();
    // player_chip_totals 뷰 + players 조인
    const { data } = await supabase
      .from('player_chip_totals')
      .select('player_id, total_chips')
      .order('total_chips', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) return [];

    // nickname 조회
    const ids = data.map((r: { player_id: string }) => r.player_id);
    const { data: playerData } = await supabase
      .from('players')
      .select('id, nickname, username')
      .in('id', ids);

    const playerMap = Object.fromEntries((playerData ?? []).map((p: { id: string; nickname: string; username: string }) => [p.id, p]));

    return data.map((r: { player_id: string; total_chips: number }, i: number) => ({
      rank: i + 1,
      ...playerMap[r.player_id],
      total_chips: r.total_chips,
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getSessionUser().catch(() => null) : null;
  const leaderboard = configured ? await getLeaderboard() : [];

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 p-8 pt-16">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold tracking-tight">BGM 🎲</h1>
        <p className="text-sm opacity-60">Boardgame in Melbourne — 칩 랭킹</p>
      </div>

      {!configured && (
        <div className="max-w-lg rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-yellow-200">
          <p className="font-medium">Supabase 설정이 필요합니다</p>
          <p className="mt-1 opacity-80">
            <code className="rounded bg-black/30 px-1">supabase/SETUP.md</code> 가이드를 따라 환경변수를 설정하세요.
          </p>
        </div>
      )}

      {/* 로그인/로그아웃 */}
      <div className="flex items-center gap-3">
        {configured && !user && (
          <>
            <Link
              href="/login"
              className="rounded-md bg-white px-5 py-2 text-sm font-medium text-black hover:opacity-90"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-md border border-white/20 px-5 py-2 text-sm font-medium hover:bg-white/10"
            >
              회원가입
            </Link>
          </>
        )}
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm opacity-70">
              <span className="font-semibold text-white">{user.nickname}</span>님
            </span>
            <Link
              href="/admin/record"
              className="rounded-md border border-white/20 px-4 py-1.5 text-sm hover:bg-white/10"
            >
              경기 기록
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-white/20 px-4 py-1.5 text-sm hover:bg-white/10"
              >
                로그아웃
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 리더보드 */}
      {configured && (
        <section className="w-full max-w-md space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest opacity-40 text-center">
            칩 랭킹
          </h2>

          {leaderboard.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-sm opacity-50">아직 기록된 경기가 없습니다</p>
              {user && (
                <Link
                  href="/admin/record"
                  className="mt-3 inline-block text-xs underline opacity-70 hover:opacity-100"
                >
                  첫 경기를 기록하세요 →
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              {leaderboard.map((entry: { rank: number; nickname: string; total_chips: number }, i: number) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 px-5 py-3 text-sm ${
                    i !== leaderboard.length - 1 ? 'border-b border-white/5' : ''
                  } ${i < 3 ? 'bg-white/5' : ''}`}
                >
                  <span className={`w-6 text-center font-bold tabular-nums ${
                    entry.rank === 1 ? 'text-yellow-400' :
                    entry.rank === 2 ? 'text-slate-300' :
                    entry.rank === 3 ? 'text-amber-600' : 'opacity-40'
                  }`}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                  </span>
                  <span className="flex-1 font-medium">{entry.nickname}</span>
                  <span className="tabular-nums font-semibold">
                    {entry.total_chips > 0 ? '+' : ''}{entry.total_chips}
                    <span className="ml-1 text-xs opacity-50">칩</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
