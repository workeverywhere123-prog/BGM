'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
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
