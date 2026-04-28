import Link from 'next/link';
import { getSessionUser } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/env';
import { logoutAction } from './(auth)/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import NotificationBell from '@/components/NotificationBell';

export default async function Nav() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getSessionUser().catch(() => null) : null;

  let unreadCount = 0;
  if (user && configured) {
    try {
      const supabase = await createSupabaseServerClient();
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', user.id)
        .is('read_at', null);
      unreadCount = count ?? 0;
    } catch {}
  }

  return (
    <nav className="bgm-nav">
      <Link href="/" className="bgm-nav-logo">BGM</Link>
      <ul className="bgm-nav-links">
        <li><Link href="/league">리그</Link></li>
        <li><Link href="/rooms">모임일정</Link></li>
        <li><Link href="/rules">규칙</Link></li>
        <li><Link href="/notice">공지사항</Link></li>
        <li><Link href="/games">보드게임책장</Link></li>
        <li><Link href="/records">기록실</Link></li>
        <li><Link href="/stats">분석실</Link></li>
        <li><Link href="/leaderboard">명예의전당</Link></li>
        <li><Link href="/raffle">행운판</Link></li>
        {user?.is_admin && <li><Link href="/admin" style={{ color: 'var(--gold)' }}>관리자</Link></li>}
      </ul>
      <div className="bgm-nav-auth">
        {configured && !user && (
          <>
            <Link href="/login" className="btn-gold">로그인</Link>
            <Link href="/signup" className="btn-outline">회원가입</Link>
          </>
        )}
        {user && (
          <>
            <NotificationBell initialUnread={unreadCount} profileUsername={user.username} />
            <Link href={`/profile/${user.username}`} style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic',
              color: 'var(--white-dim)',
              fontSize: '1rem',
              textDecoration: 'none',
            }}>
              <span style={{ color: 'var(--gold-light)', fontStyle: 'normal' }}>{user.nickname}</span>님
            </Link>
            <form action={logoutAction} style={{ display: 'inline' }}>
              <button type="submit" className="btn-ghost">로그아웃</button>
            </form>
          </>
        )}
      </div>
    </nav>
  );
}
