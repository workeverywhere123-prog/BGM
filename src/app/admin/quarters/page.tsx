import { createSupabaseServerClient } from '@/lib/supabase/server';
import QuartersClient from './QuartersClient';

export default async function AdminQuartersPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('quarters')
    .select('id, name, started_at, ended_at, is_active')
    .order('started_at', { ascending: false });

  return <QuartersClient initialQuarters={data ?? []} />;
}
