import { getSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import WelcomeNoticeModal from './WelcomeNoticeModal';

export default async function WelcomeNoticeGate() {
  try {
    const user = await getSessionUser();
    if (!user) return null;

    const supabase = createSupabaseAdminClient();

    const [{ data: player }, { data: notice }] = await Promise.all([
      supabase.from('players').select('terms_agreed_at').eq('id', user.id).single(),
      supabase.from('notices').select('id').eq('is_pinned', true).eq('category', 'important').order('created_at', { ascending: false }).limit(1).single(),
    ]);

    if (player?.terms_agreed_at) return null;
    if (!notice) return null;

    return <WelcomeNoticeModal noticeId={notice.id} />;
  } catch {
    return null;
  }
}
