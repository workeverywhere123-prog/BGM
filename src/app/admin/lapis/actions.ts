'use server';

import { revalidatePath } from 'next/cache';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types/domain';

// ─────────────────────────────────────────────
// deleteLapisAction — 트랜잭션 취소 (삭제)
// ─────────────────────────────────────────────
export async function deleteLapisAction(txId: string): Promise<ActionResult<null>> {
  const user = await requireSessionUser().catch(() => null);
  if (!user?.is_admin) {
    return { ok: false, error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' } };
  }

  const svc = createSupabaseServiceClient();
  const { error } = await svc.from('chip_transactions').delete().eq('id', txId);
  if (error) {
    return { ok: false, error: { code: 'UNKNOWN', message: error.message } };
  }

  revalidatePath('/admin/lapis');
  revalidatePath('/');
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────
// addManualLapisAction — 수동 LAPIS 지급/차감
// ─────────────────────────────────────────────
export async function addManualLapisAction(
  playerId: string,
  amount: number,
  note: string,
): Promise<ActionResult<null>> {
  const user = await requireSessionUser().catch(() => null);
  if (!user?.is_admin) {
    return { ok: false, error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' } };
  }
  if (!note.trim()) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: '사유를 입력해주세요' } };
  }
  if (amount === 0 || isNaN(amount)) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: '0은 입력할 수 없습니다' } };
  }

  // 활성 분기 조회
  const supabase = await createSupabaseServerClient();
  const { data: activeQ } = await supabase
    .from('quarters').select('id').eq('is_active', true).maybeSingle();

  const svc = createSupabaseServiceClient();
  const { error } = await svc.from('chip_transactions').insert({
    player_id: playerId,
    amount,
    tx_type: 'manual' as const,
    note: note.trim(),
    created_by: user.id,
    quarter_id: activeQ?.id ?? null,
  });

  if (error) {
    return { ok: false, error: { code: 'UNKNOWN', message: error.message } };
  }

  revalidatePath('/admin/lapis');
  revalidatePath('/');
  return { ok: true, data: null };
}
