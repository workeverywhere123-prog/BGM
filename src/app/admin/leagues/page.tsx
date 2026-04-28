import { createSupabaseServerClient } from '@/lib/supabase/server';
import LeaguesClient from './LeaguesClient';

export default async function AdminLeaguesPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: leagues }, { data: players }] = await Promise.all([
    supabase.from('leagues').select(`
      id, name, description, start_date, end_date, is_active, prizes, created_at, players_per_game,
      league_participants(id, player_id, score, rank, note),
      league_matches(
        id, round, match_index, status, played_at,
        league_match_players(id, player_id, rank, score, points_earned)
      )
    `).order('created_at', { ascending: false }),
    supabase.from('players').select('id, nickname, username').order('nickname'),
  ]);

  const pmap = Object.fromEntries((players ?? []).map(p => [p.id, p]));

  const enriched = (leagues ?? []).map(l => {
    type RawMP = { id: string; player_id: string; rank: number | null; score: number | null; points_earned: number };
    type RawMatch = { id: string; round: number; match_index: number; status: string; played_at: string | null; league_match_players: RawMP[] };
    type RawLP = { id: string; player_id: string; score: number; rank: number | null; note: string | null };

    const rawMatches = ((l as unknown as { league_matches?: RawMatch[] }).league_matches ?? []);

    return {
      ...l,
      participants: (l.league_participants as RawLP[])
        .map(lp => ({ ...lp, player: pmap[lp.player_id] ?? { nickname: '?', username: '' } }))
        .sort((a, b) => b.score - a.score),
      schedule: rawMatches
        .map(m => ({
          ...m,
          matchPlayers: m.league_match_players.map(mp => ({
            ...mp,
            player: pmap[mp.player_id] ?? { nickname: '?', username: '' },
          })),
        }))
        .sort((a, b) => a.round !== b.round ? a.round - b.round : a.match_index - b.match_index),
    };
  });

  return <LeaguesClient initialLeagues={enriched as never[]} allPlayers={players ?? []} />;
}
