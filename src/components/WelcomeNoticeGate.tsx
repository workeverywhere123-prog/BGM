import { unstable_cache } from 'next/cache';
import { getSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import WelcomeNoticeModal from './WelcomeNoticeModal';

const getWelcomeNotice = unstable_cache(
  async () => {
    try {
      const supabase = createSupabaseAdminClient();
      const { data } = await supabase
        .from('notices')
        .select('id')
        .eq('is_pinned', true)
        .eq('category', 'important')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    } catch {
      // Supabase 연결 실패(일시정지 등) 시 조용히 null 반환
      return null;
    }
  },
  ['welcome-notice'],
  { revalidate: 300 }
);

export default async function WelcomeNoticeGate() {
  try {
    const [user, notice] = await Promise.all([
      getSessionUser().catch(() => null),
      getWelcomeNotice().catch(() => null),
    ]);
    if (!user || user.terms_agreed_at || !notice) return null;
    return <WelcomeNoticeModal noticeId={notice.id} />;
  } catch {
    return null;
  }
}
