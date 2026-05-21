'use server';

import { revalidatePath } from 'next/cache';
import { requireSessionUser } from '@/lib/session';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { generateCode } from '@/domain/invite-code';
import type { ActionResult } from '@/types/domain';

async function assertAdmin() {
  const user = await requireSessionUser();
  if (!user.is_admin) throw new Error('FORBIDDEN');
  return user;
}

export async function createInviteCodeAction(
  _prev: ActionResult<{ code: string }> | null,
  formData: FormData
): Promise<ActionResult<{ code: string }>> {
  const admin = await assertAdmin();
  const expiresAtRaw = String(formData.get('expires_at') ?? '').trim();
  const expires_at = expiresAtRaw
    ? new Date(expiresAtRaw + 'T23:59:59').toISOString()
    : null;

  const serviceClient = createSupabaseServiceClient();

  // 중복 충돌 시 최대 3회 재시도
  for (let i = 0; i < 3; i++) {
    const code = generateCode();
    const { error } = await serviceClient
      .from('invite_codes')
      .insert({ code, created_by: admin.id, expires_at });

    if (!error) {
      revalidatePath('/admin/invites');
      return { ok: true, data: { code } };
    }
    if (!error.message.includes('unique')) {
      return { ok: false, error: { code: 'UNKNOWN', message: error.message } };
    }
  }

  return { ok: false, error: { code: 'UNKNOWN', message: '코드 생성에 실패했습니다. 다시 시도하세요.' } };
}

export async function deactivateInviteCodeAction(id: string): Promise<void> {
  await assertAdmin();
  const serviceClient = createSupabaseServiceClient();
  await serviceClient
    .from('invite_codes')
    .update({ is_active: false })
    .eq('id', id);
  revalidatePath('/admin/invites');
}
