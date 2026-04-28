import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/env';
import { requireSessionUser } from '@/lib/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) redirect('/');
  const user = await requireSessionUser().catch(() => redirect('/login'));
  if (!user.is_admin) redirect('/');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* 관리자 사이드 네비 */}
      <div style={{ display: 'flex' }}>
        <aside style={{ width: 220, minHeight: '100vh', background: 'rgba(22,53,36,0.6)', borderRight: '1px solid rgba(201,168,76,0.15)', padding: '2rem 0', position: 'fixed', top: 0 }}>
          <Link href="/" style={{ display: 'block', fontFamily: "'Great Vibes', cursive", fontSize: '2rem', color: 'var(--gold)', padding: '0 1.5rem 1.5rem', textDecoration: 'none', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>BGM</Link>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', padding: '1.5rem 1.5rem 0.5rem' }}>관리자 메뉴</p>
          <nav>
            {[
              { href: '/admin', label: '대시보드', icon: '📊' },
              { href: '/admin/players', label: '플레이어', icon: '👥' },
              { href: '/admin/leagues', label: '리그 관리', icon: '🥇' },
              { href: '/admin/quarters', label: '분기 관리', icon: '📆' },
              { href: '/admin/rooms', label: '방 모니터링', icon: '🏠' },
              { href: '/admin/meeting', label: '모임/기록', icon: '🎲' },
              { href: '/admin/notice', label: '공지사항', icon: '📢' },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: '0.7rem',
                padding: '0.8rem 1.5rem',
                fontFamily: "'Cinzel', serif", fontSize: '0.68rem', letterSpacing: '0.12em',
                color: 'var(--white-dim)', textDecoration: 'none',
                transition: 'all 0.2s',
                borderLeft: '2px solid transparent',
              }}>
                <span>{item.icon}</span>{item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main style={{ marginLeft: 220, flex: 1, padding: '2.5rem', minHeight: '100vh' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
