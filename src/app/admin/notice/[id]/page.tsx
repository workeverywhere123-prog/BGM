import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import NoticeEditClient from './NoticeEditClient';

export default async function AdminNoticeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: notice } = await supabase
    .from('notices')
    .select('id, title, content, category, is_pinned')
    .eq('id', id)
    .single();

  if (!notice) notFound();

  return <NoticeEditClient notice={notice} />;
}
