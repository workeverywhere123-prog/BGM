'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { validateInviteCode } from '@/domain/invite-code';
import type { ActionResult } from '@/types/domain';

/** 아이디: 영문/숫자/밑줄/하이픈, 2~20자 */
function validateUsername(v: unknown): v is string {
  return typeof v === 'string' && /^[a-zA-Z0-9_-]{2,20}$/.test(v);
}

function validatePassword(v: unknown): v is string {
  return typeof v === 'string' && v.length >= 6;
}

/** 아이디 → 내부 전용 fake email (Supabase Auth는 email 필드를 필요로 함) */
function toFakeEmail(username: string): string {
  return `${username.toLowerCase()}@bgm.local`;
}

/** 아이디 + 비밀번호로 회원가입. */
export async function signupAction(
  _prev: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!validateUsername(username)) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '아이디는 2~20자, 영문/숫자/_/- 만 사용 가능합니다',
      },
    };
  }
  if (!validatePassword(password)) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: '비밀번호는 6자 이상이어야 합니다' },
    };
  }

  // 초대코드 검증
  const rawCode = String(formData.get('invite_code') ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(rawCode)) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: '초대코드 형식이 올바르지 않습니다 (8자리 영숫자)' } };
  }

  const serviceClient = createSupabaseServiceClient();
  const { data: codeRow } = await serviceClient
    .from('invite_codes')
    .select('id, is_active, used_by, expires_at')
    .eq('code', rawCode)
    .maybeSingle();

  const codeStatus = validateInviteCode(codeRow);
  if (codeStatus === 'used') {
    return { ok: false, error: { code: 'CONFLICT', message: '이미 사용된 초대코드입니다' } };
  }
  if (codeStatus === 'expired') {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: '만료된 초대코드입니다' } };
  }
  if (codeStatus !== 'ok') {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 초대코드입니다' } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: toFakeEmail(username),
    password,
    options: {
      // trigger가 raw_user_meta_data 에서 username을 읽어 players 테이블에 저장
      data: { username: username.toLowerCase() },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { ok: false, error: { code: 'CONFLICT', message: '이미 사용 중인 아이디입니다' } };
    }
    return { ok: false, error: { code: 'UNKNOWN', message: error.message } };
  }

  // 코드 사용 처리
  if (data?.user?.id && codeRow?.id) {
    await serviceClient
      .from('invite_codes')
      .update({ used_by: data.user.id, used_at: new Date().toISOString() })
      .eq('id', codeRow.id);
  }

  revalidatePath('/', 'layout');
  return { ok: true, data: null };
}

/** 아이디 + 비밀번호로 로그인. 성공 시 redirectTo로 이동. */
export async function loginAction(
  _prev: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirectTo') ?? '/');

  if (!validateUsername(username) || !validatePassword(password)) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: '아이디 또는 비밀번호를 확인해 주세요' },
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: toFakeEmail(username),
    password,
  });

  if (error) {
    return {
      ok: false,
      error: { code: 'UNAUTHENTICATED', message: '아이디 또는 비밀번호가 올바르지 않습니다' },
    };
  }

  revalidatePath('/', 'layout');
  redirect(redirectTo);
}

/** 로그아웃 후 홈으로 이동. */
export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
