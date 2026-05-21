import { createSupabaseServiceClient } from '@/lib/supabase/service';
import InvitesClient from './InvitesClient';

export const dynamic = 'force-dynamic';

export default async function AdminInvitesPage() {
  const serviceClient = createSupabaseServiceClient();

  const { data: codes } = await serviceClient
    .from('invite_codes')
    .select('id, code, is_active, used_by, used_at, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const usedByIds = (codes ?? [])
    .map(c => c.used_by)
    .filter((id): id is string => id !== null);

  let nicknameMap: Record<string, string> = {};
  if (usedByIds.length > 0) {
    const { data: players } = await serviceClient
      .from('players')
      .select('id, nickname')
      .in('id', usedByIds);
    nicknameMap = Object.fromEntries((players ?? []).map(p => [p.id, p.nickname]));
  }

  const rows = (codes ?? []).map(c => ({
    ...c,
    usedByNickname: c.used_by ? (nicknameMap[c.used_by] ?? null) : null,
  }));

  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', marginBottom: '0.5rem' }}>ADMIN</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', color: 'var(--foreground)' }}>초대코드 관리</h1>
        <div style={{ width: 40, height: 1, background: 'var(--gold)', opacity: 0.4, marginTop: '0.75rem' }} />
      </div>
      <InvitesClient codes={rows} />
    </div>
  );
}
