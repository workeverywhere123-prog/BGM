'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/NotificationBell';
import { isSupabaseConfigured } from '@/lib/env';

type NavUser = { nickname: string; username: string; is_admin: boolean; unread_count: number } | null;

const NAV_LINKS = [
  { href: '/league', label: '리그 현황' },
  { href: '/meeting', label: '모임 일정' },
  { href: '/rooms', label: '보드게임방' },
  { href: '/notice', label: '공지사항' },
  { href: '/games', label: '보드게임 책장' },
  { href: '/records', label: '기록 전당' },
];

export default function Nav() {
  const [user, setUser] = useState<NavUser>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isSupabaseConfigured()) { setReady(true); return; }
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then((data: NavUser) => { setUser(data); setReady(true); })
      .catch(() => setReady(true));
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.refresh();
    router.push('/');
  };

  return (
    <>
      <nav className="bgm-nav" suppressHydrationWarning>
        <Link href="/" className="bgm-nav-logo">BGM</Link>

        {/* Desktop links */}
        <ul className="bgm-nav-links" suppressHydrationWarning>
          {NAV_LINKS.map(l => (
            <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
          ))}
          {user?.is_admin && (
            <li><Link href="/admin" style={{ color: 'var(--gold)' }}>관리자</Link></li>
          )}
        </ul>

        {/* Desktop auth */}
        <div className="bgm-nav-auth bgm-nav-auth--desktop">
          {!ready ? (
            <span style={{ display: 'inline-block', width: 120, opacity: 0 }} aria-hidden />
          ) : !user ? (
            <>
              <Link href="/login" className="btn-gold">로그인</Link>
              <Link href="/signup" className="btn-outline">회원가입</Link>
            </>
          ) : (
            <>
              <NotificationBell initialUnread={user.unread_count} profileUsername={user.username} />
              <Link
                href={`/profile/${user.username}`}
                style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: 'var(--white-dim)', fontSize: '1rem', textDecoration: 'none' }}
              >
                <span style={{ color: 'var(--gold-light)', fontStyle: 'normal' }}>{user.nickname}</span>님
              </Link>
              <button onClick={handleLogout} className="btn-ghost">로그아웃</button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="bgm-nav-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
        >
          <span className={`ham-line ${menuOpen ? 'open' : ''}`} />
          <span className={`ham-line ${menuOpen ? 'open' : ''}`} />
          <span className={`ham-line ${menuOpen ? 'open' : ''}`} />
        </button>
      </nav>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div className="bgm-mobile-overlay" onClick={() => setMenuOpen(false)} />
      )}
      <div className={`bgm-mobile-drawer ${menuOpen ? 'open' : ''}`}>
        <ul className="bgm-mobile-links">
          {NAV_LINKS.map(l => (
            <li key={l.href}>
              <Link href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</Link>
            </li>
          ))}
          {user?.is_admin && (
            <li>
              <Link href="/admin" style={{ color: 'var(--gold)' }} onClick={() => setMenuOpen(false)}>관리자</Link>
            </li>
          )}
        </ul>
        <div className="bgm-mobile-auth">
          {!ready ? null : !user ? (
            <>
              <Link href="/login" className="btn-gold" onClick={() => setMenuOpen(false)}>로그인</Link>
              <Link href="/signup" className="btn-outline" onClick={() => setMenuOpen(false)}>회원가입</Link>
            </>
          ) : (
            <>
              <Link
                href={`/profile/${user.username}`}
                onClick={() => setMenuOpen(false)}
                style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: 'var(--white-dim)', fontSize: '1.1rem', textDecoration: 'none' }}
              >
                <span style={{ color: 'var(--gold-light)', fontStyle: 'normal' }}>{user.nickname}</span>님
              </Link>
              <button onClick={handleLogout} className="btn-ghost">로그아웃</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
