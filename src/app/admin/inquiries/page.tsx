import { createSupabaseAdminClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AdminInquiriesClient from './AdminInquiriesClient';

export const dynamic = 'force-dynamic';

export default async function AdminInquiriesPage() {
  const supabase = createSupabaseAdminClient();
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id, title, message, status, admin_reply, replied_at, created_at, player_id')
    .order('created_at', { ascending: false });

  const playerIds = [...new Set((inquiries ?? []).map(i => i.player_id))];
  let playerMap: Record<string, { nickname: string; username: string }> = {};
  if (playerIds.length) {
    const { data: players } = await supabase.from('players').select('id, nickname, username').in('id', playerIds);
    playerMap = Object.fromEntries((players ?? []).map(p => [p.id, p]));
  }

  const enriched = (inquiries ?? []).map(i => ({
    ...i, player: playerMap[i.player_id] ?? { nickname: '?', username: '' },
  }));

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <Link href="/admin" style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', textDecoration: 'none', opacity: 0.5 }}>← 어드민</Link>
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.3rem', color: 'var(--gold)', margin: '0.5rem 0 2rem' }}>
        문의 관리
        {enriched.filter(i => i.status === 'open').length > 0 && (
          <span style={{ marginLeft: '0.8rem', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: '#fb923c' }}>
            {enriched.filter(i => i.status === 'open').length}건 미답변
          </span>
        )}
      </h1>
      <AdminInquiriesClient inquiries={enriched} />
    </div>
  );
}
