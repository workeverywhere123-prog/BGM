import { createSupabaseServerClient } from '@/lib/supabase/server';
import AdminGamesClient from './AdminGamesClient';

export default async function AdminGamesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: games } = await supabase
    .from('player_games')
    .select('*, players(id, nickname, username)')
    .order('created_at', { ascending: false });

  return <AdminGamesClient initialGames={games ?? []} />;
}
