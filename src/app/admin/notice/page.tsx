import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const CATEGORY_LABEL: Record<string, string> = {
  important: '중요', rule: '규칙', event: '이벤트', general: '일반',
};

export default async function AdminNoticePage() {
  const supabase = await createSupabaseServerClient();
  const { data: notices } = await supabase
    .from('notices')
    .select('id, title, category, is_pinned, created_at')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)' }}>공지사항 관리</h1>
        <Link href="/admin/notice/new" className="btn-gold">+ 공지 작성</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {(notices ?? []).map((n: { id: string; title: string; category: string; is_pinned: boolean; created_at: string }) => (
          <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: n.is_pinned ? 'rgba(201,168,76,0.07)' : 'rgba(30,74,52,0.12)', borderLeft: `2px solid ${n.is_pinned ? 'var(--gold)' : 'var(--gold-dim)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              {n.is_pinned && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '0.1rem 0.4rem' }}>고정</span>}
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', border: '1px solid rgba(244,239,230,0.15)', padding: '0.1rem 0.4rem' }}>{CATEGORY_LABEL[n.category]}</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>{n.title}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)' }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</span>
              <Link href={`/notice/${n.id}`} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'rgba(244,239,230,0.4)', textDecoration: 'none' }}>보기</Link>
              <Link href={`/admin/notice/${n.id}`} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold-dim)', textDecoration: 'none', padding: '0.2rem 0.7rem', border: '1px solid rgba(201,168,76,0.3)' }}>수정 →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
