'use server';

import { revalidatePath } from 'next/cache';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types/domain';

/**
 * 규칙 정독 보너스 청구 (1 LAPIS, 최초 1회)
 * - players.rules_read_at 이 null 인 유저만 지급
 */
export async function claimRulesLapisAction(): Promise<ActionResult<null>> {
  const user = await requireSessionUser().catch(() => null);
  if (!user) {
    return { ok: false, error: { code: 'UNAUTHENTICATED', message: '로그인이 필요합니다' } };
  }

  const supabase = await createSupabaseServerClient();

  // 이미 받았는지 확인
  const { data: player } = await supabase
    .from('players')
    .select('rules_read_at')
    .eq('id', user.id)
    .single();

  if (player?.rules_read_at) {
    return { ok: false, error: { code: 'CONFLICT', message: '이미 규칙 정독 보너스를 받았습니다' } };
  }

  const svc = createSupabaseServiceClient();

  // 1 LAPIS 지급 + rules_read_at 기록 (동시 실행)
  const [txResult, updateResult] = await Promise.all([
    svc.from('chip_transactions').insert({
      player_id: user.id,
      amount: 1,
      tx_type: 'rules_read',
      note: '규칙 정독 보너스 📖',
    }),
    svc.from('players')
      .update({ rules_read_at: new Date().toISOString() })
      .eq('id', user.id),
  ]);

  if (txResult.error) {
    return { ok: false, error: { code: 'UNKNOWN', message: txResult.error.message } };
  }
  if (updateResult.error) {
    // 트랜잭션이 아니라 롤백 불가. 그냥 로그만
    console.error('[claimRulesLapis] update rules_read_at failed:', updateResult.error.message);
  }

  revalidatePath('/notice');
  return { ok: true, data: null };
}
