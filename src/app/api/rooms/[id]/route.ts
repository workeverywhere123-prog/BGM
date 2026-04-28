import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

function rankingPoints(rank: number, total: number): number {
  // 홀수 인원: 중간 등수 0, 위아래 ±1씩 (합계 항상 0)
  // 짝수 인원: 0 건너뛰고 위아래 대칭 (합계 항상 0)
  // 예) 3인: +1,0,-1 / 4인: +2,+1,-1,-2 / 5인: +2,+1,0,-1,-2
  if (total % 2 === 1) {
    const mid = Math.ceil(total / 2);
    return mid - rank;
  } else {
    const half = total / 2;
    return rank <= half ? half - rank + 1 : half - rank;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();

    const { data: room } = await supabase.from('rooms').select('host_id').eq('id', id).single();
    if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

    const { title, location, scheduled_at, game_types, max_players, note, is_online, boardlife_game_id, boardlife_game_name, boardlife_game_thumb } = await req.json();
    if (!location || !scheduled_at) return NextResponse.json({ error: '장소와 일시를 입력해주세요' }, { status: 400 });

    const { data: updated, error } = await supabase
      .from('rooms')
      .update({ title: title || null, location, scheduled_at, game_types: game_types ?? [], max_players: max_players ?? 6, note: note || null, is_online: is_online ?? false, boardlife_game_id: boardlife_game_id || null, boardlife_game_name: boardlife_game_name || null, boardlife_game_thumb: boardlife_game_thumb || null })
      .eq('id', id)
      .select('id, title, location, scheduled_at, game_types, max_players, status, note, host_id, boardlife_game_id, boardlife_game_name, boardlife_game_thumb, games_json, is_online')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const supabase = createSupabaseAdminClient();
    const body = await req.json();
    const { action } = body as { action: string; youtube_url?: string; bring_game_ids?: string[] };

    if (action === 'join') {
      const { data: room } = await supabase.from('rooms').select('max_players, status, host_id, league_match_id').eq('id', id).single();
      if (!room || !['open', 'full'].includes(room.status)) return NextResponse.json({ error: '입장할 수 없는 방입니다' }, { status: 400 });

      // League match room: only match players can join as members
      if (room.league_match_id) {
        const { data: matchPlayer } = await supabase
          .from('league_match_players')
          .select('id')
          .eq('match_id', room.league_match_id)
          .eq('player_id', user.id)
          .maybeSingle();
        if (!matchPlayer) return NextResponse.json({ error: '리그 경기 참가자만 입장할 수 있습니다. 관전으로 참여해주세요.' }, { status: 403 });
      }

      // If already a spectator, upgrade to member
      const { data: existing } = await supabase.from('room_members').select('id, is_spectator').eq('room_id', id).eq('player_id', user.id).maybeSingle();
      if (existing && !existing.is_spectator) return NextResponse.json({ error: '이미 참가 중입니다' }, { status: 400 });

      const { count } = await supabase.from('room_members').select('*', { count: 'exact', head: true }).eq('room_id', id).eq('is_spectator', false);
      if ((count ?? 0) >= room.max_players) return NextResponse.json({ error: '방이 꽉 찼습니다' }, { status: 400 });

      const { error: insErr } = await supabase.from('room_members').upsert(
        { room_id: id, player_id: user.id, is_spectator: false },
        { onConflict: 'room_id,player_id' }
      );
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

      const newCount = (count ?? 0) + 1;
      if (newCount >= room.max_players) {
        await supabase.from('rooms').update({ status: 'full' }).eq('id', id);
      }

      const { data: player } = await supabase.from('players').select('id, nickname, username').eq('id', user.id).single();
      return NextResponse.json({ ok: true, player, status: newCount >= room.max_players ? 'full' : 'open' });
    }

    if (action === 'spectate') {
      const { data: room } = await supabase.from('rooms').select('status').eq('id', id).single();
      if (!room || !['open', 'full', 'playing'].includes(room.status)) return NextResponse.json({ error: '관전할 수 없는 방입니다' }, { status: 400 });

      const { data: existing } = await supabase.from('room_members').select('id, is_spectator').eq('room_id', id).eq('player_id', user.id).maybeSingle();
      if (existing) return NextResponse.json({ error: '이미 참가 또는 관전 중입니다' }, { status: 400 });

      const { error } = await supabase.from('room_members').insert({ room_id: id, player_id: user.id, is_spectator: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const { data: player } = await supabase.from('players').select('id, nickname, username').eq('id', user.id).single();
      return NextResponse.json({ ok: true, player });
    }

    if (action === 'leave_spectate') {
      await supabase.from('room_members').delete().eq('room_id', id).eq('player_id', user.id).eq('is_spectator', true);
      return NextResponse.json({ ok: true });
    }

    if (action === 'to_spectate') {
      const { data: room } = await supabase.from('rooms').select('host_id, status').eq('id', id).single();
      if (room?.host_id === user.id) return NextResponse.json({ error: '방장은 관전자로 전환할 수 없습니다' }, { status: 400 });
      await supabase.from('room_members').delete().eq('room_id', id).eq('player_id', user.id).eq('is_spectator', false);
      if (room?.status === 'full') {
        await supabase.from('rooms').update({ status: 'open' }).eq('id', id);
      }
      const { error } = await supabase.from('room_members').insert({ room_id: id, player_id: user.id, is_spectator: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const { data: player } = await supabase.from('players').select('id, nickname, username').eq('id', user.id).single();
      return NextResponse.json({ ok: true, player });
    }

    if (action === 'leave') {
      const { data: room } = await supabase.from('rooms').select('host_id, status').eq('id', id).single();
      if (room?.host_id === user.id) return NextResponse.json({ error: '방장은 퇴장할 수 없습니다. 방을 닫아주세요.' }, { status: 400 });

      await supabase.from('room_members').delete().eq('room_id', id).eq('player_id', user.id);
      if (room?.status === 'full') {
        await supabase.from('rooms').update({ status: 'open' }).eq('id', id);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggle_ready') {
      const { data: room } = await supabase.from('rooms').select('host_id, ready_player_ids').eq('id', id).single();
      if (!room) return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });
      const current: string[] = room.ready_player_ids ?? [];
      const isReady = current.includes(user.id);
      const next = isReady ? current.filter((x: string) => x !== user.id) : [...current, user.id];
      await supabase.from('rooms').update({ ready_player_ids: next }).eq('id', id);
      return NextResponse.json({ ok: true, ready_player_ids: next });
    }

    if (action === 'start') {
      const { data: room } = await supabase.from('rooms').select('host_id, status, ready_player_ids').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      if (!['open', 'full'].includes(room?.status ?? '')) return NextResponse.json({ error: '이미 시작됐거나 종료된 방입니다' }, { status: 400 });

      const now = new Date().toISOString();
      await supabase.from('rooms').update({ status: 'playing', started_at: now }).eq('id', id);
      return NextResponse.json({ ok: true, status: 'playing', started_at: now });
    }

    if (action === 'record_results') {
      const { data: room } = await supabase.from('rooms').select('host_id, status, started_at').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

      const durationMinutes = room?.started_at
        ? Math.round((Date.now() - new Date(room.started_at).getTime()) / 60000)
        : null;

      const { game_type, participants } = body as {
        game_type: string;
        participants: { player_id: string; rank?: number; team?: string; role?: string; is_winner?: boolean; score?: number }[];
      };

      const { data: match, error: matchErr } = await supabase
        .from('matches')
        .insert({ meeting_id: null, game_type, played_at: new Date().toISOString(), created_by: user.id, duration_minutes: durationMinutes })
        .select('id')
        .single();
      if (matchErr || !match) return NextResponse.json({ error: matchErr?.message ?? 'match 생성 실패' }, { status: 500 });

      for (const p of participants) {
        await supabase.from('match_participants').insert({
          match_id: match.id,
          player_id: p.player_id,
          rank: p.rank ?? null,
          team: p.team ?? null,
          role: p.role ?? null,
          is_winner: p.is_winner ?? false,
          score: p.score ?? null,
          is_mvp: false,
        });
      }

      const { data: quarter } = await supabase.from('quarters').select('id').eq('is_active', true).maybeSingle();
      const total = participants.length;

      for (const p of participants) {
        let amount = 0;
        if (game_type === 'ranking') {
          amount = rankingPoints(p.rank ?? total, total);
        } else {
          amount = p.is_winner ? 2 : -1;
          // MVP bonus is applied separately after voting
        }
        if (amount !== 0) {
          await supabase.from('chip_transactions').insert({
            player_id: p.player_id,
            tx_type: 'game',
            amount,
            quarter_id: quarter?.id ?? null,
            note: `보드게임방 ${game_type} 결과`,
            created_by: user.id,
          });
        }
      }

      await supabase.from('rooms').update({ status: 'voting', last_match_id: match.id }).eq('id', id);
      return NextResponse.json({ ok: true, status: 'voting', match_id: match.id });
    }

    if (action === 'submit_mvp_vote') {
      const { nominee_id } = body as { nominee_id: string };
      await supabase.from('room_mvp_votes').upsert(
        { room_id: id, voter_id: user.id, nominee_id },
        { onConflict: 'room_id,voter_id' }
      );
      return NextResponse.json({ ok: true });
    }

    if (action === 'finalize_mvp') {
      const { data: room } = await supabase.from('rooms').select('host_id, last_match_id').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

      const { data: votes } = await supabase.from('room_mvp_votes').select('nominee_id').eq('room_id', id);
      if (votes?.length) {
        const tally: Record<string, number> = {};
        for (const v of votes) tally[v.nominee_id] = (tally[v.nominee_id] ?? 0) + 1;
        const mvpId = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (mvpId) {
          const { data: quarter } = await supabase.from('quarters').select('id').eq('is_active', true).maybeSingle();
          await supabase.from('chip_transactions').insert({
            player_id: mvpId, tx_type: 'game', amount: 1,
            quarter_id: quarter?.id ?? null, note: 'MVP 투표 보너스', created_by: user.id,
          });
          if (room?.last_match_id) {
            await supabase.from('match_participants').update({ is_mvp: true })
              .eq('match_id', room.last_match_id).eq('player_id', mvpId);
          }
        }
      }

      await supabase.from('rooms').update({ status: 'closed' }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'close') {
      const { data: room } = await supabase.from('rooms').select('host_id').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

      await supabase.from('rooms').update({ status: 'closed' }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'close_with_noshow') {
      const { data: room } = await supabase.from('rooms').select('host_id').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

      await supabase.from('rooms').update({ status: 'closed' }).eq('id', id);

      const { noshow_ids } = body as { noshow_ids: string[] };
      if (noshow_ids?.length) {
        const { data: quarter } = await supabase.from('quarters').select('id').eq('is_active', true).maybeSingle();
        for (const pid of noshow_ids) {
          await supabase.from('chip_transactions').insert({
            player_id: pid,
            tx_type: 'absence',
            amount: -1,
            quarter_id: quarter?.id ?? null,
            note: '보드게임방 노쇼',
            created_by: user.id,
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'set_online') {
      const { data: room } = await supabase.from('rooms').select('host_id').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      await supabase.from('rooms').update({ is_online: body.is_online ?? false }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_youtube') {
      const { data: room } = await supabase.from('rooms').select('host_id').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });

      await supabase.from('rooms').update({ youtube_url: body.youtube_url ?? null }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_bring_games') {
      await supabase.from('room_members').update({ bring_game_ids: body.bring_game_ids ?? [] }).eq('room_id', id).eq('player_id', user.id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_games') {
      const { data: room } = await supabase.from('rooms').select('host_id').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      const games = body.games ?? [];
      await supabase.from('rooms').update({ games_json: games }).eq('id', id);
      return NextResponse.json({ ok: true, games });
    }

    if (action === 'save_game_order') {
      const { data: room } = await supabase.from('rooms').select('host_id').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      await supabase.from('rooms').update({ game_order_json: body.order ?? null }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'save_team_result') {
      const { data: room } = await supabase.from('rooms').select('host_id').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      await supabase.from('rooms').update({ team_result_json: body.teams ?? null }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'reopen') {
      const { data: room } = await supabase.from('rooms').select('host_id, status, max_players').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      if (room?.status !== 'playing') return NextResponse.json({ error: '게임중 상태가 아닙니다' }, { status: 400 });
      const { count } = await supabase.from('room_members').select('*', { count: 'exact', head: true }).eq('room_id', id).eq('is_spectator', false);
      const newStatus = (count ?? 0) >= (room?.max_players ?? 6) ? 'full' : 'open';
      await supabase.from('rooms').update({ status: newStatus }).eq('id', id);
      return NextResponse.json({ ok: true, status: newStatus });
    }

    if (action === 'kick') {
      const { data: room } = await supabase.from('rooms').select('host_id, status').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      const { player_id } = body as { player_id: string };
      if (player_id === user.id) return NextResponse.json({ error: '자신을 내보낼 수 없습니다' }, { status: 400 });
      await supabase.from('room_members').delete().eq('room_id', id).eq('player_id', player_id);
      if (room?.status === 'full') {
        await supabase.from('rooms').update({ status: 'open' }).eq('id', id);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'invite') {
      const { data: room } = await supabase.from('rooms').select('host_id, max_players, status').eq('id', id).single();
      if (room?.host_id !== user.id) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
      const { player_id } = body as { player_id: string };
      const { data: alreadyMember } = await supabase.from('room_members').select('id').eq('room_id', id).eq('player_id', player_id).maybeSingle();
      if (alreadyMember) return NextResponse.json({ error: '이미 참가 중입니다' }, { status: 400 });
      await supabase.from('room_invitations').upsert(
        { room_id: id, inviter_id: user.id, invitee_id: player_id, status: 'pending' },
        { onConflict: 'room_id,invitee_id' }
      );
      const { data: invitee } = await supabase.from('players').select('id, nickname, username').eq('id', player_id).single();
      return NextResponse.json({ ok: true, invitee });
    }

    if (action === 'accept_invite') {
      const { data: inv } = await supabase.from('room_invitations').select('id, status').eq('room_id', id).eq('invitee_id', user.id).maybeSingle();
      if (!inv || inv.status !== 'pending') return NextResponse.json({ error: '유효한 초대가 없습니다' }, { status: 400 });
      const { data: room } = await supabase.from('rooms').select('max_players, status').eq('id', id).single();
      const { count } = await supabase.from('room_members').select('*', { count: 'exact', head: true }).eq('room_id', id).eq('is_spectator', false);
      if ((count ?? 0) >= (room?.max_players ?? 6)) return NextResponse.json({ error: '방이 꽉 찼습니다' }, { status: 400 });
      await supabase.from('room_invitations').update({ status: 'accepted' }).eq('id', inv.id);
      // If already a spectator (auto-added on visit), delete first then insert as member
      await supabase.from('room_members').delete().eq('room_id', id).eq('player_id', user.id);
      await supabase.from('room_members').insert({ room_id: id, player_id: user.id, is_spectator: false });
      const newCount = (count ?? 0) + 1;
      if (newCount >= (room?.max_players ?? 6)) {
        await supabase.from('rooms').update({ status: 'full' }).eq('id', id);
      }
      const { data: player } = await supabase.from('players').select('id, nickname, username').eq('id', user.id).single();
      return NextResponse.json({ ok: true, player, status: newCount >= (room?.max_players ?? 6) ? 'full' : room?.status });
    }

    if (action === 'decline_invite') {
      await supabase.from('room_invitations').update({ status: 'declined' }).eq('room_id', id).eq('invitee_id', user.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
