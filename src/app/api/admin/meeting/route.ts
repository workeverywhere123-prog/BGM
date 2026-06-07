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
    const { number, held_at, note, status, rsvp_deadline } = body;
    if (!number || !held_at) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });

    const { data, error } = await supabase.from('meetings').insert({
      league_id: null,
      number: parseInt(number),
      held_at,
      note: note || null,
      status,
      rsvp_deadline: rsvp_deadline ? new Date(rsvp_deadline).toISOString() : null,
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
        const amount = att.status === 'attended' ? 5 : att.status === 'late' ? -1 : -3;

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

    // ── 모임 정보 수정 ────────────────────────────────
    if (action === 'update_info') {
      const { number, held_at, note, status } = body as { number?: number; held_at?: string; note?: string; status?: string };
      const updates: Record<string, unknown> = {};
      if (number !== undefined) updates.number = number;
      if (held_at !== undefined) updates.held_at = held_at;
      if (note !== undefined) updates.note = note || null;
      if (status !== undefined) updates.status = status;
      const { error } = await supabase.from('meetings').update(updates).eq('id', meeting_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // ── 모임 취소 ────────────────────────────────────
    if (action === 'cancel_meeting') {
      await supabase.from('meetings').update({ status: 'cancelled' }).eq('id', meeting_id);
      // RSVP 투표자 + 전체 활성 회원에게 알림
      const { data: mtg } = await supabase.from('meetings').select('number').eq('id', meeting_id).single();
      const { data: players } = await supabase.from('players').select('id').eq('is_active', true);
      if (players?.length && mtg) {
        await supabase.from('notifications').insert(
          players.map(p => ({
            player_id: p.id,
            title: `❌ 제${mtg.number}회 모임이 취소되었습니다`,
            message: '예정된 정기 모임이 취소되었습니다. 문의는 운영진에게 연락해주세요.',
            type: 'meeting_cancelled',
            created_by: user.id,
          })),
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ── RSVP 알림 수동 재발송 ─────────────────────────
    if (action === 'resend_rsvp_notify') {
      const { data: mtg } = await supabase.from('meetings').select('number, rsvp_deadline').eq('id', meeting_id).single();
      const { data: rsvps } = await supabase.from('meeting_rsvps').select('player_id').eq('meeting_id', meeting_id);
      const voted = new Set((rsvps ?? []).map(r => r.player_id));
      const { data: players } = await supabase.from('players').select('id').eq('is_active', true);
      const unvoted = (players ?? []).filter(p => !voted.has(p.id));
      if (!unvoted.length) return NextResponse.json({ sent: 0 });
      const deadlineStr = mtg?.rsvp_deadline
        ? new Date(mtg.rsvp_deadline).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '미정';
      await supabase.from('notifications').insert(
        unvoted.map(p => ({
          player_id: p.id,
          title: `⏰ 제${mtg?.number}회 모임 참석 투표를 해주세요`,
          message: `아직 참석 여부를 등록하지 않으셨습니다. 마감: ${deadlineStr}. 미투표 시 LAPIS -1이 차감됩니다.`,
          type: 'meeting_rsvp',
          created_by: user.id,
        })),
      );
      return NextResponse.json({ sent: unvoted.length });
    }

    // ── RSVP → 출석 자동 채우기 ──────────────────────
    if (action === 'auto_fill_attendance') {
      const { quarter_id } = body as { quarter_id: string | null };
      const { data: rsvps } = await supabase.from('meeting_rsvps').select('player_id, status').eq('meeting_id', meeting_id);
      for (const r of rsvps ?? []) {
        const attStatus = r.status === 'attending' ? 'attended' : 'absent';
        await supabase.from('meeting_attendances').upsert(
          { meeting_id, player_id: r.player_id, status: attStatus, voted: true },
          { onConflict: 'meeting_id,player_id' },
        );
        await supabase.from('chip_transactions').delete()
          .eq('meeting_id', meeting_id).eq('player_id', r.player_id)
          .in('tx_type', ['attendance', 'late', 'absence', 'vote_skip']);
        await supabase.from('chip_transactions').insert({
          player_id: r.player_id, meeting_id,
          tx_type: attStatus === 'attended' ? 'attendance' : 'absence',
          amount: attStatus === 'attended' ? 5 : -3,
          quarter_id: quarter_id ?? null,
          note: `RSVP 기반 자동 출석 처리`,
          created_by: user.id,
        });
      }
      return NextResponse.json({ ok: true, filled: rsvps?.length ?? 0 });
    }

    // ── RSVP 마감 시간 설정 ───────────────────────────
    if (action === 'update_rsvp_deadline') {
      const { rsvp_deadline } = body as { rsvp_deadline: string | null };
      const { error } = await supabase.from('meetings')
        .update({ rsvp_deadline: rsvp_deadline || null })
        .eq('id', meeting_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

    // ── 경기 수정 (칩 재계산 포함) ───────────────────
    if (action === 'edit_match') {
      const { match_id, game_type, game_name, boardlife_game_id, boardlife_game_name, quarter_id, participants } = body as {
        match_id: string;
        game_type: string;
        game_name?: string;
        boardlife_game_id?: string | null;
        boardlife_game_name?: string | null;
        quarter_id?: string | null;
        participants: {
          player_id: string;
          team?: string;
          rank?: number;
          role?: string;
          is_winner?: boolean;
          is_mvp?: boolean;
        }[];
      };

      // 게임 upsert (이름이 바뀐 경우)
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

      // matches 업데이트
      const matchUpdates: Record<string, unknown> = { game_type };
      if (game_id !== null) matchUpdates.game_id = game_id;
      if (boardlife_game_id !== undefined) matchUpdates.boardlife_game_id = boardlife_game_id || null;
      if (boardlife_game_name !== undefined) matchUpdates.boardlife_game_name = boardlife_game_name || null;
      if (game_name !== undefined) matchUpdates.boardlife_game_name = boardlife_game_name || game_name || null;
      await supabase.from('matches').update(matchUpdates).eq('id', match_id);

      // 기존 칩 트랜잭션 + 참여자 삭제
      await supabase.from('chip_transactions').delete().eq('match_id', match_id);
      await supabase.from('match_participants').delete().eq('match_id', match_id);

      // 칩 재계산
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

      // match_participants 재삽입
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
        await supabase.from('chip_transactions').insert({
          player_id: p.player_id,
          meeting_id,
          match_id,
          tx_type: 'game',
          amount: cc,
          quarter_id: quarter_id ?? null,
          note: `${game_name || boardlife_game_name || game_type} 경기 수정 결과`,
          created_by: user.id,
        });
      }
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
