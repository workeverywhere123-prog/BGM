import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();

  const [{ count: playerCount }, { count: meetingCount }, { count: noticeCount }, { data: recentMeetings }, { data: activeQuarter }] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('meetings').select('*', { count: 'exact', head: true }),
    supabase.from('notices').select('*', { count: 'exact', head: true }),
    supabase.from('meetings').select('id, number, held_at, status').order('number', { ascending: false }).limit(5),
    supabase.from('quarters').select('id, name').eq('is_active', true).maybeSingle(),
  ]);

  const stats = [
    { label: '총 플레이어', value: playerCount ?? 0, icon: '👥', href: '/admin/players' },
    { label: '총 모임', value: meetingCount ?? 0, icon: '📅', href: '/admin/meeting' },
    { label: '공지사항', value: noticeCount ?? 0, icon: '📢', href: '/admin/notice' },
    { label: '활성 분기', value: (activeQuarter as { name?: string } | null)?.name ?? '없음', icon: '🏆', href: '/admin/quarters' },
  ];

  const STATUS_COLOR: Record<string, string> = {
    upcoming: 'var(--gold)', active: '#4ade80', closed: 'var(--white-dim)',
  };
  const STATUS_LABEL: Record<string, string> = {
    upcoming: '예정', active: '진행중', closed: '종료',
  };

  return (
    <div>
      <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '3rem', color: 'var(--foreground)', marginBottom: '0.5rem' }}>관리자 대시보드</h1>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--gold)', marginBottom: '3rem' }}>BGM ADMIN</p>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
        {stats.map(s => (
          <Link href={s.href} key={s.label} style={{
            textDecoration: 'none', padding: '1.8rem',
            border: '1px solid rgba(201,168,76,0.15)',
            background: 'rgba(30,74,52,0.15)',
            transition: 'all 0.3s',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>{s.icon}</div>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '2rem', color: 'var(--gold)' }}>{s.value}</p>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', letterSpacing: '0.15em', color: 'var(--white-dim)', marginTop: '0.3rem' }}>{s.label}</p>
          </Link>
        ))}
      </div>

      {/* 빠른 액션 */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.3em', color: 'var(--gold)', marginBottom: '1rem' }}>빠른 액션</p>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          {[
            { href: '/admin/meeting/new', label: '+ 새 모임 만들기' },
            { href: '/admin/record', label: '+ 경기 기록하기' },
            { href: '/admin/notice/new', label: '+ 공지 작성하기' },
            { href: '/admin/quarters', label: '+ 분기 관리' },
          ].map(a => (
            <Link key={a.href} href={a.href} className="btn-gold" style={{ fontSize: '0.65rem' }}>{a.label}</Link>
          ))}
        </div>
      </div>

      {/* 최근 모임 */}
      <div>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.3em', color: 'var(--gold)', marginBottom: '1rem' }}>최근 모임</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {(recentMeetings ?? []).map((m: { id: string; number: number; held_at: string; status: string }) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.2rem', background: 'rgba(30,74,52,0.15)', borderLeft: '2px solid var(--gold-dim)' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>제{m.number}회 모임</span>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)' }}>{new Date(m.held_at).toLocaleDateString('ko-KR')}</span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', color: STATUS_COLOR[m.status] ?? 'var(--white-dim)', border: `1px solid ${STATUS_COLOR[m.status] ?? 'var(--white-dim)'}`, padding: '0.15rem 0.5rem' }}>
                  {STATUS_LABEL[m.status] ?? m.status}
                </span>
                <Link href={`/admin/meeting/${m.id}`} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold-dim)', textDecoration: 'none' }}>관리 →</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
