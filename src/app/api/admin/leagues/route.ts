import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const user = await requireSessionUser();
  if (!user.is_admin) throw new Error('Forbidden');
  const supabase = await createSupabaseServerClient();
  return { user, supabase };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function generateSchedule(playerIds: string[], playersPerGame: number) {
  const N = playerIds.length;
  const gamesPerRound = Math.floor(N / playersPerGame);
  const sitOut = N % playersPerGame;

  // Calculate balanced number of rounds so everyone plays equal times
  let numRounds: number;
  if (sitOut === 0) {
    numRounds = Math.max(gamesPerRound * 2, 4);
  } else {
    const g = gcd(N, sitOut);
    numRounds = N / g;
    if (numRounds < 4) numRounds *= Math.ceil(4 / numRounds);
  }

  // Initial random shuffle
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const playCount: Record<string, number> = Object.fromEntries(shuffled.map(id => [id, 0]));

  const rounds: { roundNumber: number; matches: string[][] }[] = [];

  for (let r = 0; r < numRounds; r++) {
    // Sort by play count asc, randomize ties for variety
    const sorted = [...shuffled].sort((a, b) => {
      const diff = playCount[a] - playCount[b];
      return diff !== 0 ? diff : Math.random() - 0.5;
    });

    const active = sorted.slice(0, gamesPerRound * playersPerGame);

    // Shuffle within same-count tiers for varied matchups
    const byCount = new Map<number, string[]>();
    active.forEach(p => {
      const c = playCount[p];
      if (!byCount.has(c)) byCount.set(c, []);
      byCount.get(c)!.push(p);
    });

    const shuffledActive: string[] = [];
    [...byCount.entries()].sort(([a], [b]) => a - b).forEach(([, group]) => {
      for (let i = group.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [group[i], group[j]] = [group[j], group[i]];
      }
      shuffledActive.push(...group);
    });

    const matches: string[][] = [];
    for (let g = 0; g < gamesPerRound; g++) {
      const gamePlayers = shuffledActive.slice(g * playersPerGame, (g + 1) * playersPerGame);
      matches.push(gamePlayers);
      gamePlayers.forEach(p => playCount[p]++);
    }

    rounds.push({ roundNumber: r + 1, matches });
  }

  return rounds;
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireAdmin();
    const body = await req.json();
    const { name, description, start_date, end_date, prizes, is_active, players_per_game } = body;
    if (!name) return NextResponse.json({ error: '리그 이름을 입력해주세요' }, { status: 400 });

    if (is_active) {
      await supabase.from('leagues').update({ is_active: false }).eq('is_active', true);
    }

    const { data, error } = await supabase.from('leagues').insert({
      name, description: description || null,
      start_date: start_date || null, end_date: end_date || null,
      prizes: prizes ?? [], is_active: !!is_active, created_by: user.id,
      players_per_game: players_per_game ?? 4,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const { id, action, ...rest } = await req.json();

    if (action === 'activate') {
      await supabase.from('leagues').update({ is_active: false }).eq('is_active', true);
      await supabase.from('leagues').update({ is_active: true }).eq('id', id);
      return NextResponse.json({ ok: true });
    }
    if (action === 'deactivate') {
      await supabase.from('leagues').update({ is_active: false }).eq('id', id);
      return NextResponse.json({ ok: true });
    }
    if (action === 'add_participant') {
      const { player_id } = rest;
      const { error } = await supabase.from('league_participants').insert({ league_id: id, player_id });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'remove_participant') {
      const { participant_id } = rest;
      await supabase.from('league_participants').delete().eq('id', participant_id);
      return NextResponse.json({ ok: true });
    }
    if (action === 'update') {
      const { name, description, start_date, end_date, prizes, players_per_game } = rest;
      await supabase.from('leagues').update({ name, description, start_date, end_date, prizes, players_per_game }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'generate_schedule') {
      // Delete existing matches (cascades to league_match_players)
      await supabase.from('league_matches').delete().eq('league_id', id);

      const { data: participants } = await supabase
        .from('league_participants').select('player_id').eq('league_id', id);
      if (!participants?.length) return NextResponse.json({ error: '참가자가 없습니다' }, { status: 400 });

      const { data: league } = await supabase
        .from('leagues').select('players_per_game').eq('id', id).single();
      const K = league?.players_per_game ?? 4;

      const playerIds = participants.map(p => p.player_id);
      if (playerIds.length < K) {
        return NextResponse.json({ error: `${K}인 게임을 위해 최소 ${K}명의 참가자가 필요합니다` }, { status: 400 });
      }

      const schedule = generateSchedule(playerIds, K);

      // Insert matches
      const matchInserts = schedule.flatMap(({ roundNumber, matches }) =>
        matches.map((_, idx) => ({
          league_id: id,
          round: roundNumber,
          match_index: idx,
          status: 'pending' as const,
          player1_id: null, player2_id: null, winner_id: null, score1: null, score2: null,
        }))
      );

      const { data: insertedMatches, error: mErr } = await supabase
        .from('league_matches').insert(matchInserts).select('id, round, match_index');
      if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

      // Map round-index → match id
      const matchMap = new Map<string, string>();
      insertedMatches?.forEach(m => matchMap.set(`${m.round}-${m.match_index}`, m.id));

      // Insert league_match_players
      const playerInserts = schedule.flatMap(({ roundNumber, matches }) =>
        matches.flatMap((players, idx) => {
          const matchId = matchMap.get(`${roundNumber}-${idx}`);
          if (!matchId) return [];
          return players.map(playerId => ({ match_id: matchId, player_id: playerId, points_earned: 0 }));
        })
      );

      const { error: pErr } = await supabase.from('league_match_players').insert(playerInserts);
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

      return NextResponse.json({ ok: true, rounds: schedule.length, matches: matchInserts.length });
    }

    if (action === 'record_match_result') {
      const { match_id, results } = rest;
      // results: [{ player_id, rank, score }]

      const { data: match } = await supabase
        .from('league_matches').select('league_id').eq('id', match_id).single();
      if (!match) return NextResponse.json({ error: '경기를 찾을 수 없습니다' }, { status: 404 });

      const K = results.length;

      // Update each player's result — points: 1st=K, 2nd=K-1, ..., last=1
      for (const r of results as { player_id: string; rank: number; score?: number }[]) {
        const pointsEarned = K - r.rank + 1;
        await supabase.from('league_match_players').update({
          rank: r.rank,
          score: r.score ?? null,
          points_earned: pointsEarned,
        }).eq('match_id', match_id).eq('player_id', r.player_id);
      }

      await supabase.from('league_matches').update({
        status: 'completed',
        played_at: new Date().toISOString(),
      }).eq('id', match_id);

      // Recalculate league_participants scores from completed matches
      const { data: completedMatches } = await supabase
        .from('league_matches').select('id')
        .eq('league_id', match.league_id).eq('status', 'completed');

      if (completedMatches?.length) {
        const { data: allPoints } = await supabase
          .from('league_match_players').select('player_id, points_earned')
          .in('match_id', completedMatches.map(m => m.id));

        const totals: Record<string, number> = {};
        for (const p of allPoints ?? []) {
          totals[p.player_id] = (totals[p.player_id] ?? 0) + p.points_earned;
        }

        for (const [playerId, total] of Object.entries(totals)) {
          await supabase.from('league_participants')
            .update({ score: total })
            .eq('league_id', match.league_id)
            .eq('player_id', playerId);
        }
      }

      return NextResponse.json({ ok: true });
    }

    if (action === 'reset_schedule') {
      await supabase.from('league_matches').delete().eq('league_id', id);
      // Also reset participant scores
      await supabase.from('league_participants').update({ score: 0 }).eq('league_id', id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await req.json();
    const { error } = await supabase.from('leagues').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}
