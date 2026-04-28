import Nav from '../nav';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import NotificationsClient from './NotificationsClient';
import Footer from '../footer';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  let user = null;
  try { user = await getSessionUser(); } catch {}
  if (!user) redirect('/login');

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('notifications')
    .select('id, title, message, type, read_at, created_at')
    .eq('player_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <>
      <Nav />
      <NotificationsClient initialNotifs={data ?? []} />
      <Footer />
    </>
  );
}
