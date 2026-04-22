'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { ActionResult } from '@/types/domain';

type FormAction = (
  prev: ActionResult<null> | null,
  formData: FormData
) => Promise<ActionResult<null>>;

interface AuthCardProps {
  mode: 'login' | 'signup';
  action: FormAction;
  redirectTo?: string;
}

export function AuthCard({ mode, action, redirectTo = '/' }: AuthCardProps) {
  const [state, formAction, pending] = useActionState<
    ActionResult<null> | null,
    FormData
  >(action, null);

  const isSignup = mode === 'signup';
  const title = isSignup ? '회원가입' : '로그인';
  const submit = isSignup ? '가입하기' : '로그인';
  const altHref = isSignup ? '/login' : '/signup';
  const altLabel = isSignup ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입';

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
      <h1 className="mb-6 text-2xl font-semibold">{title}</h1>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        {/* 아이디 */}
        <label className="block">
          <span className="mb-1 block text-sm opacity-80">아이디</span>
          <input
            required
            name="username"
            type="text"
            minLength={2}
            maxLength={20}
            autoComplete="username"
            pattern="[a-zA-Z0-9_\-]{2,20}"
            title="영문, 숫자, _, - 만 사용 가능 (2~20자)"
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
            placeholder="영문, 숫자, _, - (2~20자)"
          />
        </label>

        {/* 비밀번호 */}
        <label className="block">
          <span className="mb-1 block text-sm opacity-80">비밀번호</span>
          <input
            required
            name="password"
            type="password"
            minLength={6}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
            placeholder="6자 이상"
          />
        </label>

        {state && !state.ok && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error.message}
          </p>
        )}

        {state && state.ok && isSignup && (
          <p className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            가입 완료! <Link href="/login" className="underline">로그인</Link> 하세요.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-white text-black py-2 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? '처리 중...' : submit}
        </button>
      </form>

      <p className="mt-6 text-center text-sm opacity-70">
        <Link href={altHref} className="underline hover:opacity-100">
          {altLabel}
        </Link>
      </p>
    </div>
  );
}
