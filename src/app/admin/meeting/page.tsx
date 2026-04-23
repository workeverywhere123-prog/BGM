import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AdminMeetingListPage() {
  const supabase = await createSupabaseServerClient();
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, number, held_at, status, note')
    .order('number', { ascending: false });

  const STATUS_COLOR: Record<string, string> = { upcoming: 'var(--gold)', active: '#4ade80', closed: 'var(--white-dim)' };
  const STATUS_LABEL: Record<string, string> = { upcoming: '예정', active: '진행중', closed: '종료' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)' }}>모임 관리</h1>
        <Link href="/admin/meeting/new" className="btn-gold">+ 새 모임</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {(meetings ?? []).map((m: { id: string; number: number; held_at: string; status: string; note: string | null }) => (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'rgba(30,74,52,0.15)', borderLeft: '2px solid var(--gold-dim)' }}>
            <div>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', color: 'var(--foreground)' }}>제{m.number}회 모임</span>
              {m.note && <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--white-dim)', marginTop: '0.2rem' }}>{m.note}</p>}
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)' }}>{new Date(m.held_at).toLocaleDateString('ko-KR')}</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.1em', color: STATUS_COLOR[m.status], border: `1px solid ${STATUS_COLOR[m.status]}`, padding: '0.15rem 0.5rem' }}>
                {STATUS_LABEL[m.status]}
              </span>
              <Link href={`/admin/meeting/${m.id}`} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--gold)', textDecoration: 'none' }}>상세 관리 →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
