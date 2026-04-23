import Link from 'next/link';
import { getSessionUser } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logoutAction } from './(auth)/actions';

export default async function Nav() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getSessionUser().catch(() => null) : null;

  let isAdmin = false;
  if (user) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('players')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = data?.is_admin ?? false;
  }

  return (
    <nav className="bgm-nav">
      <Link href="/" className="bgm-nav-logo">BGM</Link>
      <ul className="bgm-nav-links">
        <li><Link href="/league">리그</Link></li>
        <li><Link href="/rooms">보드게임방</Link></li>
        <li><Link href="/rules">규칙</Link></li>
        <li><Link href="/notice">공지사항</Link></li>
        <li><Link href="/games">보드게임</Link></li>
        {isAdmin && <li><Link href="/admin" style={{ color: 'var(--gold)' }}>관리자</Link></li>}
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
