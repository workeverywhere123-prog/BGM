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

// ─── Zero-Bias Scheduling ───────────────────────────────────────────────────

/** Sum of encounter counts for all pairs within a set of groups */
function groupScore(groups: number[][], enc: number[][]): number {
  let score = 0;
  for (const g of groups)
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++)
        score += enc[g[i]][g[j]];
  return score;
}

/** Local swap optimization: swap players between groups to minimise repeat meetings */
function swapOptimize(groups: number[][], enc: number[][]): number[][] {
  const G = groups.length;
  const gs = groups.map(g => [...g]);
  let improved = true;
  let iter = 0;
  while (improved && iter++ < 200) {
    improved = false;
    for (let g1 = 0; g1 < G; g1++) {
      for (let g2 = g1 + 1; g2 < G; g2++) {
        for (let p1 = 0; p1 < gs[g1].length; p1++) {
          for (let p2 = 0; p2 < gs[g2].length; p2++) {
            const before = groupScore([gs[g1], gs[g2]], enc);
            [gs[g1][p1], gs[g2][p2]] = [gs[g2][p2], gs[g1][p1]];
            if (groupScore([gs[g1], gs[g2]], enc) < before) {
              improved = true;
            } else {
              [gs[g1][p1], gs[g2][p2]] = [gs[g2][p2], gs[g1][p1]];
            }
          }
        }
      }
    }
  }
  return gs;
}

/** Generate groups of K from active player indices, minimising encounter repetition */
function optimalGroup(active: number[], K: number, enc: number[][]): number[][] {
  const G = Math.floor(active.length / K);
  let bestGroups: number[][] | null = null;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 8; attempt++) {
    const shuffled = [...active].sort(() => Math.random() - 0.5);
    const groups = swapOptimize(
      Array.from({ length: G }, (_, g) => shuffled.slice(g * K, (g + 1) * K)),
      enc,
    );
    const s = groupScore(groups, enc);
    if (s < bestScore) { bestScore = s; bestGroups = groups; }
  }
  return bestGroups!;
}

interface ScheduleResult {
  rounds: { roundNumber: number; matches: string[][] }[];
  qc: {
    totalRounds: number;
    gamesPerRound: number;
    sitOutPerRound: number;
    maxEncounters: number;   // worst-case pair meeting count
    minEncounters: number;   // best-case pair meeting count
    sitOutVariance: number;  // max - min sit-outs across players
    playCountVariance: number;
  };
}

function generateSchedule(playerIds: string[], playersPerGame: number): ScheduleResult {
  const N = playerIds.length;
  const K = playersPerGame;
  const G = Math.floor(N / K);  // games per round
  const S = N % K;               // sit-outs per round

  // Rounds needed so every player sits out equally often
  let numRounds: number;
  if (S === 0) {
    numRounds = Math.max(G * 2, 4);
  } else {
    const g = gcd(N, S);
    numRounds = N / g;
    if (numRounds < 4) numRounds *= Math.ceil(4 / numRounds);
  }

  // Encounter matrix: enc[i][j] = times player i and j shared a table
  const enc: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  const sitCount = new Array(N).fill(0);
  const playCount = new Array(N).fill(0);

  const rounds: { roundNumber: number; matches: string[][] }[] = [];

  for (let r = 0; r < numRounds; r++) {
    // Select sit-outs: prefer players who sat out least (tie-break randomly)
    const sitouts: number[] = [];
    if (S > 0) {
      const byCount = [...Array(N).keys()].sort((a, b) =>
        sitCount[a] !== sitCount[b] ? sitCount[a] - sitCount[b] : Math.random() - 0.5,
      );
      sitouts.push(...byCount.slice(0, S));
    }

    const active = [...Array(N).keys()].filter(i => !sitouts.includes(i));
    const groups = optimalGroup(active, K, enc);

    // Update encounter matrix & play counts
    for (const group of groups) {
      for (let i = 0; i < group.length; i++)
        for (let j = i + 1; j < group.length; j++) {
          enc[group[i]][group[j]]++;
          enc[group[j]][group[i]]++;
        }
      for (const p of group) playCount[p]++;
    }
    for (const s of sitouts) sitCount[s]++;

    rounds.push({ roundNumber: r + 1, matches: groups.map(g => g.map(i => playerIds[i])) });
  }

  // QC metrics
  const pairEncs: number[] = [];
  for (let i = 0; i < N; i++)
    for (let j = i + 1; j < N; j++)
      pairEncs.push(enc[i][j]);

  return {
    rounds,
    qc: {
      totalRounds: numRounds,
      gamesPerRound: G,
      sitOutPerRound: S,
      maxEncounters: Math.max(...pairEncs),
      minEncounters: Math.min(...pairEncs),
      sitOutVariance: Math.max(...sitCount) - Math.min(...sitCount),
      playCountVariance: Math.max(...playCount) - Math.min(...playCount),
    },
  };
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

      const { rounds, qc } = generateSchedule(playerIds, K);

      // Insert matches
      const matchInserts = rounds.flatMap(({ roundNumber, matches }) =>
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
      const playerInserts = rounds.flatMap(({ roundNumber, matches }) =>
        matches.flatMap((players, idx) => {
          const matchId = matchMap.get(`${roundNumber}-${idx}`);
          if (!matchId) return [];
          return players.map(playerId => ({ match_id: matchId, player_id: playerId, points_earned: 0 }));
        })
      );

      const { error: pErr } = await supabase.from('league_match_players').insert(playerInserts);
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

      return NextResponse.json({ ok: true, rounds: rounds.length, matches: matchInserts.length, qc });
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
