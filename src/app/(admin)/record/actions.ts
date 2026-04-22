'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireSessionUser } from '@/lib/session';
import { calcChips } from '@/domain/chip';
import type { ActionResult, RecordMatchInput, ParticipantInput } from '@/types/domain';

// ─────────────────────────────────────────────────────────
// recordMatchAction
// ─────────────────────────────────────────────────────────

export async function recordMatchAction(
  input: RecordMatchInput
): Promise<ActionResult<{ match_id: string }>> {
  const user = await requireSessionUser().catch(() => null);
  if (!user) {
    return { ok: false, error: { code: 'UNAUTHENTICATED', message: '로그인이 필요합니다' } };
  }

  if (!input.meeting_id) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: '모임을 선택해주세요' } };
  }
  if (!input.game_type) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: '게임 타입을 선택해주세요' } };
  }
  if (!input.participants || input.participants.length < 2) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: '참여자를 2명 이상 추가해주세요' } };
  }

  // 칩 계산 (순수 함수)
  let chipResults: { player_id: string; chip_change: number }[];
  try {
    chipResults = calcChips(input.game_type, input.participants, {
      deathmatch_bet: input.deathmatch_bet,
    });
  } catch (err) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: '칩 계산 오류: ' + (err as Error).message },
    };
  }

  const chipByPlayer = Object.fromEntries(chipResults.map((r) => [r.player_id, r.chip_change]));

  const supabase = await createSupabaseServerClient();

  // 1) matches 삽입
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      meeting_id: input.meeting_id,
      game_id: input.game_id ?? null,
      game_type: input.game_type,
      note: input.note ?? null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (matchError || !match) {
    return { ok: false, error: { code: 'UNKNOWN', message: matchError?.message ?? '경기 저장 실패' } };
  }

  const matchId = match.id;

  // 2) match_participants 일괄 삽입
  const participantRows = input.participants.map((p: ParticipantInput) => ({
    match_id: matchId,
    player_id: p.player_id,
    team: p.team ?? null,
    rank: p.rank ?? null,
    role: p.role ?? null,
    is_winner: p.is_winner ?? null,
    is_mvp: p.is_mvp ?? false,
    chip_change: chipByPlayer[p.player_id] ?? 0,
  }));

  const { error: mpError } = await supabase.from('match_participants').insert(participantRows);

  if (mpError) {
    // 롤백: match 삭제
    await supabase.from('matches').delete().eq('id', matchId);
    return { ok: false, error: { code: 'UNKNOWN', message: '참여자 저장 실패: ' + mpError.message } };
  }

  // 3) chip_transactions 일괄 삽입 (game 타입)
  const txRows = chipResults.map((r) => ({
    player_id: r.player_id,
    meeting_id: input.meeting_id,
    match_id: matchId,
    tx_type: 'game' as const,
    amount: r.chip_change,
    note: `${input.game_type} 경기`,
    created_by: user.id,
  }));

  // chip_transactions는 RLS가 client 쓰기를 막으므로 service_role로 삽입
  const serviceClient = createSupabaseServiceClient();
  const { error: txError } = await serviceClient.from('chip_transactions').insert(txRows);

  if (txError) {
    // chip_transactions는 실패해도 매치 기록은 유지 (나중에 재처리 가능)
    console.error('[recordMatchAction] chip_transactions insert failed:', txError.message);
  }

  revalidatePath('/');
  revalidatePath('/admin/record');

  return { ok: true, data: { match_id: matchId } };
}

// ─────────────────────────────────────────────────────────
// ensureMeetingAction — 모임 없으면 자동 생성
// ─────────────────────────────────────────────────────────

export async function ensureMeetingAction(
  leagueId: string,
  meetingNumber: number,
  heldAt: string
): Promise<ActionResult<{ meeting_id: string }>> {
  const user = await requireSessionUser().catch(() => null);
  if (!user) {
    return { ok: false, error: { code: 'UNAUTHENTICATED', message: '로그인이 필요합니다' } };
  }

  const supabase = await createSupabaseServerClient();

  // 이미 있으면 반환
  const { data: existing } = await supabase
    .from('meetings')
    .select('id')
    .eq('league_id', leagueId)
    .eq('number', meetingNumber)
    .maybeSingle();

  if (existing) return { ok: true, data: { meeting_id: existing.id } };

  const { data, error } = await supabase
    .from('meetings')
    .insert({ league_id: leagueId, number: meetingNumber, held_at: heldAt, status: 'active' })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: { code: 'UNKNOWN', message: error?.message ?? '모임 생성 실패' } };
  }
  return { ok: true, data: { meeting_id: data.id } };
}
