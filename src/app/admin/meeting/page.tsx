import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import AdminMeetingPollManager from './AdminMeetingPollManager';

export default async function AdminMeetingListPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: meetings }, { data: polls }] = await Promise.all([
    supabase.from('meetings').select('id, number, held_at, status, note').order('number', { ascending: false }),
    supabase.from('meeting_polls').select('id, title, deadline, status, options, meeting_id').order('created_at', { ascending: false }).limit(20),
  ]);

  // 투표별 득표 현황
  const pollIds = (polls ?? []).map(p => p.id);
  const voteMap: Record<string, { count: number; byOption: Record<number, string[]> }> = {};
  if (pollIds.length) {
    const { data: votes } = await supabase
      .from('meeting_poll_votes').select('poll_id, player_id, option_index').in('poll_id', pollIds);
    for (const v of votes ?? []) {
      const pid = v.poll_id as string;
      if (!voteMap[pid]) voteMap[pid] = { count: 0, byOption: {} };
      voteMap[pid].count += 1;
      const idx = v.option_index as number;
      if (!voteMap[pid].byOption[idx]) voteMap[pid].byOption[idx] = [];
      voteMap[pid].byOption[idx].push(v.player_id as string);
    }
  }

  const pollsWithVotes = (polls ?? []).map(p => {
    const vm = voteMap[p.id];
    const optionVotes = (p.options as { label: string }[]).map((_, i) => vm?.byOption[i] ?? []);
    return { ...p, voteCount: vm?.count ?? 0, optionVotes };
  });

  const STATUS_COLOR: Record<string, string> = { upcoming: 'var(--gold)', active: '#4ade80', closed: 'var(--white-dim)', cancelled: '#f87171' };
  const STATUS_LABEL: Record<string, string> = { upcoming: '예정', active: '진행중', closed: '종료', cancelled: '취소됨' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.5rem', color: 'var(--foreground)' }}>모임 관리</h1>
      </div>

      {/* ── 일정 투표 (모임 생성 진입점) ── */}
      <AdminMeetingPollManager initialPolls={pollsWithVotes} />

      {/* ── 확정된 모임 목록 ── */}
      <div style={{ marginTop: '2rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', marginBottom: '1rem' }}>확정된 모임</p>
        {(meetings ?? []).length === 0 ? (
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', fontStyle: 'italic', color: 'rgba(244,239,230,0.25)', textAlign: 'center', padding: '2rem 0' }}>
            투표를 마감하면 모임이 자동 생성됩니다
          </p>
        ) : (
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
                  <Link href={`/admin/meeting/${m.id}`} className="btn-gold" style={{ fontSize: '0.6rem', padding: '0.35rem 0.9rem' }}>관리 →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
