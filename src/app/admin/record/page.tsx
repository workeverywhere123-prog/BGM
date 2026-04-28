import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function RecordRedirectPage() {
  const supabase = await createSupabaseServerClient();

  // 가장 최근 활성/예정 모임으로 리다이렉트
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id')
    .in('status', ['active', 'upcoming'])
    .order('held_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (meeting) {
    redirect(`/admin/meeting/${meeting.id}`);
  }

  // 모임이 없으면 목록으로
  redirect('/admin/meeting');
}
