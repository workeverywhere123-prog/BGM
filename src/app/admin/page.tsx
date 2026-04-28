import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    { count: playerCount }, { count: noticeCount },
    { data: activeQuarter }, { data: activeLeague },
    { count: weeklyRooms }, { data: openRooms },
    { data: allRoomsForTypes }, { data: recentPlayers },
  ] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('notices').select('*', { count: 'exact', head: true }),
    supabase.from('quarters').select('id, name').eq('is_active', true).maybeSingle(),
    supabase.from('leagues').select('id, name').eq('is_active', true).maybeSingle(),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('rooms').select('game_types').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from('players').select('id, nickname, username, created_at').order('created_at', { ascending: false }).limit(4),
  ]);

  // 인기 게임 타입 집계
  const typeCount: Record<string, number> = {};
  (allRoomsForTypes ?? []).forEach((r: { game_types: string[] }) => {
    (r.game_types ?? []).forEach(t => { typeCount[t] = (typeCount[t] ?? 0) + 1; });
  });
  const popularTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const stats = [
    { label: '총 플레이어', value: playerCount ?? 0, icon: '👥', href: '/admin/players', sub: `이번 주 +${(recentPlayers ?? []).length}명` },
    { label: '이번 주 개설 방', value: weeklyRooms ?? 0, icon: '🏠', href: '/admin/rooms', sub: `현재 모집중 ${(openRooms as unknown as number) ?? 0}개` },
    { label: '활성 분기', value: (activeQuarter as { name?: string } | null)?.name ?? '없음', icon: '📆', href: '/admin/quarters', sub: 'LAPIS 집계 중' },
    { label: '진행 중 리그', value: (activeLeague as { name?: string } | null)?.name ?? '없음', icon: '🥇', href: '/admin/leagues', sub: '이벤트 리그' },
    { label: '공지사항', value: noticeCount ?? 0, icon: '📢', href: '/admin/notice', sub: '전체 공지' },
  ];

  return (
    <div>
      <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '3rem', color: 'var(--foreground)', marginBottom: '0.3rem' }}>관리자 대시보드</h1>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.3em', color: 'var(--gold)', marginBottom: '3rem' }}>BGM ADMIN — {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.8rem', marginBottom: '3rem' }}>
        {stats.map(s => (
          <Link href={s.href} key={s.label} style={{ textDecoration: 'none', padding: '1.5rem 1.2rem', border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(30,74,52,0.15)', transition: 'border-color 0.2s' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.6rem' }}>{s.icon}</div>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '1.6rem', color: 'var(--gold)', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--white-dim)', marginTop: '0.3rem' }}>{s.label}</p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.78rem', color: 'var(--white-dim)', opacity: 0.5, marginTop: '0.2rem', fontStyle: 'italic' }}>{s.sub}</p>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>

        {/* 인기 게임 타입 */}
        <div style={{ border: '1px solid rgba(201,168,76,0.12)', padding: '1.5rem', background: 'rgba(30,74,52,0.08)' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--gold)', marginBottom: '1.2rem' }}>인기 게임 타입 (30일)</p>
          {popularTypes.length === 0 ? (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'var(--white-dim)', opacity: 0.4 }}>데이터 없음</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {popularTypes.map(([type, count], i) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold)', minWidth: 16, opacity: i < 3 ? 1 : 0.5 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--foreground)' }}>{type}</span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold-dim)' }}>{count}회</span>
                    </div>
                    <div style={{ height: 2, background: 'rgba(201,168,76,0.08)', borderRadius: 1 }}>
                      <div style={{ height: '100%', width: `${(count / (popularTypes[0]?.[1] ?? 1)) * 100}%`, background: 'var(--gold)', opacity: 0.4 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 최근 가입자 */}
        <div style={{ border: '1px solid rgba(201,168,76,0.12)', padding: '1.5rem', background: 'rgba(30,74,52,0.08)' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--gold)', marginBottom: '1.2rem' }}>최근 가입자</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {(recentPlayers ?? []).map((p: { id: string; nickname: string; username: string; created_at: string }) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link href={`/profile/${p.username}`} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)', textDecoration: 'none' }}>
                  {p.nickname} <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', opacity: 0.5 }}>@{p.username}</span>
                </Link>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', color: 'var(--white-dim)', opacity: 0.5 }}>
                  {new Date(p.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.3em', color: 'var(--gold)', marginBottom: '1rem' }}>빠른 액션</p>
        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
          {[
            { href: '/admin/leagues', label: '🥇 새 리그 개설' },
            { href: '/admin/meeting/new', label: '📅 새 모임 만들기' },
            { href: '/admin/record', label: '🎲 경기 기록' },
            { href: '/admin/notice/new', label: '📢 공지 작성' },
            { href: '/admin/quarters', label: '📆 분기 관리' },
            { href: '/admin/rooms', label: '🏠 방 모니터링' },
            { href: '/admin/raffle', label: '🎲 추첨 관리' },
            { href: '/admin/notifications', label: '🔔 알림 발송' },
            { href: '/admin/inquiries', label: '📩 문의 관리' },
          ].map(a => (
            <Link key={a.href} href={a.href} className="btn-gold" style={{ fontSize: '0.62rem' }}>{a.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
