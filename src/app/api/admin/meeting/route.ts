import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireSessionUser } from '@/lib/session';

async function requireAdmin() {
  const user = await requireSessionUser();
  if (!user.is_admin) throw new Error('권한 없음');
  const supabase = await createSupabaseServerClient();
  return { user, supabase };
}

// 순위전 LAPIS 계산
function rankingPoints(rank: number, total: number): number {
  if (total <= 3) {
    return [3, 1, -1][rank - 1] ?? -1;
  } else if (total === 4) {
    return [3, 2, -1, -2][rank - 1] ?? -2;
  } else {
    return [5, 3, 0][rank - 1] ?? -2;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const body = await req.json();
    const { number, held_at, note, status } = body;
    if (!number || !held_at) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });

    const { data, error } = await supabase.from('meetings').insert({
      league_id: null,
      number: parseInt(number),
      held_at,
      note: note || null,
      status,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류' }, { status: 403 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, supabase } = await requireAdmin();
    const body = await req.json();
    const { action, meeting_id } = body as { action: string; meeting_id: string };

    // ── 모임 상태 변경 ────────────────────────────────
    if (action === 'update_status') {
      const { status } = body as { status: string };
      const { error } = await supabase.from('meetings').update({ status }).eq('id', meeting_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // ── 출석 저장 ─────────────────────────────────────
    if (action === 'save_attendance') {
      const { attendances, quarter_id } = body as {
        attendances: { player_id: string; status: 'attended' | 'late' | 'absent'; voted: boolean }[];
        quarter_id: string | null;
      };

      for (const att of attendances) {
        // upsert attendance record
        await supabase.from('meeting_attendances').upsert({
          meeting_id, player_id: att.player_id, status: att.status, voted: att.voted,
        }, { onConflict: 'meeting_id,player_id' });

        // 기존 출석 관련 chip_transaction 삭제 후 재입력
        await supabase.from('chip_transactions').delete()
          .eq('meeting_id', meeting_id)
          .eq('player_id', att.player_id)
          .in('tx_type', ['attendance', 'late', 'absence', 'vote_skip']);

        const txType = att.status === 'attended' ? 'attendance' : att.status === 'late' ? 'late' : 'absence';
        const amount = att.status === 'attended' ? 1 : -1;

        await supabase.from('chip_transactions').insert({
          player_id: att.player_id,
          meeting_id,
          tx_type: txType,
          amount,
          quarter_id: quarter_id ?? null,
          note: `${att.status === 'attended' ? '출석' : att.status === 'late' ? '지각' : '불참'} — 모임 기록`,
          created_by: user.id,
        });

        if (att.voted === false) {
          await supabase.from('chip_transactions').insert({
            player_id: att.player_id,
            meeting_id,
            tx_type: 'vote_skip',
            amount: -1,
            quarter_id: quarter_id ?? null,
            note: '투표 미참여',
            created_by: user.id,
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    // ── 경기 기록 ─────────────────────────────────────
    if (action === 'record_match') {
      const { game_type, game_name, boardlife_game_id, boardlife_game_name, participants, quarter_id } = body as {
        game_type: string;
        game_name: string;
        boardlife_game_id: string | null;
        boardlife_game_name: string | null;
        quarter_id: string | null;
        participants: {
          player_id: string;
          team?: string;
          rank?: number;
          role?: string;
          is_winner?: boolean;
          is_mvp?: boolean;
        }[];
      };

      // 게임 upsert
      let game_id: string | null = null;
      if (game_name) {
        const { data: existingGame } = await supabase.from('games').select('id').eq('name', game_name).maybeSingle();
        if (existingGame) {
          game_id = existingGame.id;
        } else {
          const { data: newGame } = await supabase.from('games').insert({
            name: game_name, min_players: 2, max_players: 10, supports_draw: false,
          }).select('id').single();
          game_id = newGame?.id ?? null;
        }
      }

      // 경기 생성
      const { data: match, error: matchErr } = await supabase.from('matches').insert({
        meeting_id, game_id, game_type, played_at: new Date().toISOString(), created_by: user.id,
        boardlife_game_id: boardlife_game_id || null,
        boardlife_game_name: boardlife_game_name || null,
      }).select('id').single();

      if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 });
      const match_id = match.id;

      // LAPIS 계산
      const total = participants.length;
      const chipChanges: { player_id: string; chip_change: number }[] = participants.map(p => {
        let chip_change = 0;
        if (game_type === 'ranking') {
          chip_change = rankingPoints(p.rank ?? total, total);
        } else if (game_type === 'mafia') {
          if (p.role === 'mafia') chip_change = p.is_winner ? 3 : -3;
          else chip_change = p.is_winner ? 1 : -1;
        } else if (game_type === 'team') {
          chip_change = p.is_winner ? 2 : -2;
        } else if (game_type === 'coop') {
          const allWin = participants.every(x => x.is_winner);
          chip_change = (allWin ? 2 : -2) + (p.is_mvp ? 1 : 0);
        } else if (game_type === 'onevsmany') {
          if (p.team === 'solo') chip_change = p.is_winner ? 5 : -5;
          else chip_change = p.is_winner ? 1 : -1;
        } else if (game_type === 'deathmatch') {
          chip_change = p.is_winner ? 2 : -2;
        }
        return { player_id: p.player_id, chip_change };
      });

      // match_participants insert
      for (const p of participants) {
        const cc = chipChanges.find(c => c.player_id === p.player_id)?.chip_change ?? 0;
        await supabase.from('match_participants').insert({
          match_id,
          player_id: p.player_id,
          team: p.team ?? null,
          rank: p.rank ?? null,
          role: p.role ?? null,
          is_winner: p.is_winner ?? null,
          is_mvp: p.is_mvp ?? false,
          chip_change: cc,
        });
        if (cc !== 0) {
          await supabase.from('chip_transactions').insert({
            player_id: p.player_id,
            meeting_id,
            match_id,
            tx_type: 'game',
            amount: cc,
            quarter_id: quarter_id ?? null,
            note: `${game_name || game_type} 경기 결과`,
            created_by: user.id,
          });
        }
      }

      // ── Discord 알림 (fire-and-forget) ───────────────
      if (process.env.DISCORD_WEBHOOK_URL) {
        const notifyParticipants = participants.map(p => {
          const cc = chipChanges.find(c => c.player_id === p.player_id)?.chip_change ?? 0;
          return { nickname: '?', rank: p.rank, is_winner: p.is_winner, chip_change: cc, player_id: p.player_id };
        });
        // 플레이어 닉네임 조회
        const pids = notifyParticipants.map(p => p.player_id);
        const { data: pNames } = await supabase.from('players').select('id, nickname').in('id', pids);
        const pnmap = Object.fromEntries((pNames ?? []).map(p => [p.id, p.nickname]));
        const enriched = notifyParticipants.map(p => ({ ...p, nickname: pnmap[p.player_id] ?? '?' }));
        fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:9000'}/api/discord/notify`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'match_result', game_name: game_name || boardlife_game_name || game_type, game_type, participants: enriched }),
        }).catch(() => {});
      }

      return NextResponse.json({ ok: true, match_id });
    }

    // ── 경기 삭제 ─────────────────────────────────────
    if (action === 'delete_match') {
      const { match_id } = body as { match_id: string };
      // chip_transactions의 match_id는 on delete set null이므로 match 삭제만 해도 됨
      // 단, 수동으로 삭제
      await supabase.from('chip_transactions').delete().eq('match_id', match_id);
      await supabase.from('match_participants').delete().eq('match_id', match_id);
      await supabase.from('matches').delete().eq('id', match_id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류' }, { status: 403 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const { meeting_id } = await req.json();
    await supabase.from('meetings').delete().eq('id', meeting_id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '오류' }, { status: 403 });
  }
}
