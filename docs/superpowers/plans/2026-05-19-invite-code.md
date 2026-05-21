# Invite Code & Signup Restriction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 초대코드가 없으면 가입 불가하도록 제한하고, 관리자가 `/admin/invites`에서 1회용 코드를 생성·관리할 수 있게 한다.

**Architecture:** Supabase `invite_codes` 테이블에 코드를 저장하고, 가입 Server Action에서 `service_role` 클라이언트로 검증 후 사용 처리한다. 관리자 페이지는 기존 admin layout(is_admin 체크)을 그대로 활용한다.

**Tech Stack:** Next.js 15 App Router, Supabase (service_role), TypeScript, Vitest

---

## 파일 맵

| 액션 | 파일 |
|------|------|
| 생성 | `supabase/migration-invite-codes.sql` |
| 생성 | `src/domain/invite-code.ts` |
| 생성 | `src/domain/invite-code.test.ts` |
| 수정 | `src/app/(auth)/AuthCard.tsx` |
| 수정 | `src/app/(auth)/actions.ts` |
| 생성 | `src/app/admin/invites/page.tsx` |
| 생성 | `src/app/admin/invites/InvitesClient.tsx` |
| 생성 | `src/app/admin/invites/actions.ts` |
| 수정 | `src/app/admin/layout.tsx` |

---

## Task 1: DB 마이그레이션

**Files:**
- Create: `supabase/migration-invite-codes.sql`

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- supabase/migration-invite-codes.sql

CREATE TABLE IF NOT EXISTS invite_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at     timestamptz,
  expires_at  timestamptz,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- 누구도 클라이언트에서 직접 읽기/쓰기 불가 (service_role만 접근)
CREATE POLICY "no_client_access" ON invite_codes
  FOR ALL TO authenticated USING (false);
```

- [ ] **Step 2: Supabase 대시보드에서 실행**

  Supabase 대시보드 → SQL Editor → 위 SQL 실행
  URL: https://supabase.com/dashboard/project/khvkuowhnavsaorgjpyo

- [ ] **Step 3: 테이블 생성 확인**

  대시보드 → Table Editor → `invite_codes` 테이블 존재 확인

---

## Task 2: 초대코드 도메인 로직 (순수 함수 + 테스트)

**Files:**
- Create: `src/domain/invite-code.ts`
- Create: `src/domain/invite-code.test.ts`

- [ ] **Step 1: 테스트 파일 먼저 작성**

```typescript
// src/domain/invite-code.test.ts
import { describe, it, expect } from 'vitest';
import { generateCode, validateInviteCode } from './invite-code';

describe('generateCode', () => {
  it('8자 대문자 영숫자를 반환한다', () => {
    const code = generateCode();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it('호출마다 다른 값을 반환한다', () => {
    const codes = new Set(Array.from({ length: 20 }, generateCode));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('validateInviteCode', () => {
  const baseRow = {
    is_active: true,
    used_by: null,
    expires_at: null,
  };

  it('정상 코드는 ok를 반환한다', () => {
    expect(validateInviteCode(baseRow)).toBe('ok');
  });

  it('비활성 코드는 invalid를 반환한다', () => {
    expect(validateInviteCode({ ...baseRow, is_active: false })).toBe('invalid');
  });

  it('이미 사용된 코드는 used를 반환한다', () => {
    expect(validateInviteCode({ ...baseRow, used_by: 'some-uuid' })).toBe('used');
  });

  it('만료된 코드는 expired를 반환한다', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(validateInviteCode({ ...baseRow, expires_at: past })).toBe('expired');
  });

  it('만료일이 미래면 ok를 반환한다', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(validateInviteCode({ ...baseRow, expires_at: future })).toBe('ok');
  });

  it('row가 null이면 invalid를 반환한다', () => {
    expect(validateInviteCode(null)).toBe('invalid');
  });
});
```

- [ ] **Step 2: 테스트 실행 → FAIL 확인**

```bash
npm run test:run -- src/domain/invite-code.test.ts
```
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 도메인 함수 구현**

```typescript
// src/domain/invite-code.ts

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateCode(): string {
  return Array.from({ length: 8 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
}

export type InviteCodeStatus = 'ok' | 'invalid' | 'used' | 'expired';

interface InviteCodeRow {
  is_active: boolean;
  used_by: string | null;
  expires_at: string | null;
}

export function validateInviteCode(row: InviteCodeRow | null): InviteCodeStatus {
  if (!row || !row.is_active) return 'invalid';
  if (row.used_by !== null) return 'used';
  if (row.expires_at !== null && new Date(row.expires_at) < new Date()) return 'expired';
  return 'ok';
}
```

- [ ] **Step 4: 테스트 실행 → PASS 확인**

```bash
npm run test:run -- src/domain/invite-code.test.ts
```
Expected: 7 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add src/domain/invite-code.ts src/domain/invite-code.test.ts
git commit -m "feat: add invite code domain logic"
```

---

## Task 3: 가입 폼에 초대코드 필드 추가

**Files:**
- Modify: `src/app/(auth)/AuthCard.tsx`

- [ ] **Step 1: AuthCard에 초대코드 입력 필드 추가**

`src/app/(auth)/AuthCard.tsx` 에서 비밀번호 `</label>` 블록 바로 뒤에 추가:

```tsx
{/* 초대코드 — signup 모드에서만 표시 */}
{isSignup && (
  <label className="block">
    <span className="mb-1 block text-sm opacity-80">초대코드</span>
    <input
      required
      name="invite_code"
      type="text"
      minLength={8}
      maxLength={8}
      autoComplete="off"
      className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30 uppercase"
      placeholder="8자리 초대코드"
      style={{ letterSpacing: '0.2em' }}
    />
  </label>
)}
```

- [ ] **Step 2: 브라우저에서 `/signup` 확인**

  `npm run dev` 후 `http://localhost:9000/signup` 에서 초대코드 필드가 세 번째 항목으로 표시되는지 확인

- [ ] **Step 3: 커밋**

```bash
git add src/app/\(auth\)/AuthCard.tsx
git commit -m "feat: add invite code field to signup form"
```

---

## Task 4: 가입 Server Action에 초대코드 검증 추가

**Files:**
- Modify: `src/app/(auth)/actions.ts`

- [ ] **Step 1: actions.ts 상단 import 추가**

파일 상단에 추가:

```typescript
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { validateInviteCode } from '@/domain/invite-code';
```

- [ ] **Step 2: signupAction 내부 수정**

기존 `signupAction` 함수에서 `validatePassword` 체크 이후, `supabase.auth.signUp()` 호출 이전 부분에 아래 블록 추가:

```typescript
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
```

- [ ] **Step 3: 회원가입 성공 후 코드 사용 처리**

기존 `supabase.auth.signUp()` 호출 후 error 체크 블록 뒤, `revalidatePath` 바로 앞에 추가:

```typescript
  // 코드 사용 처리 (가입 성공 후)
  // data.user가 없으면 Supabase confirm 설정 문제이므로 코드는 소모하지 않음
  if (data?.user?.id && codeRow?.id) {
    await serviceClient
      .from('invite_codes')
      .update({ used_by: data.user.id, used_at: new Date().toISOString() })
      .eq('id', codeRow.id);
  }
```

  기존 `const { error } = await supabase.auth.signUp(...)` 를 `const { data, error } = await supabase.auth.signUp(...)` 로 변경 (data 추가).

- [ ] **Step 4: 동작 테스트 (수동)**

  1. Supabase 대시보드 SQL Editor에서 테스트 코드 생성:
     ```sql
     INSERT INTO invite_codes (code) VALUES ('TESTCODE');
     ```
  2. `/signup` 에서 `TESTCODE` 로 가입 시도 → 성공 확인
  3. 같은 코드로 재가입 시도 → "이미 사용된 초대코드입니다" 에러 확인
  4. 없는 코드로 가입 시도 → "유효하지 않은 초대코드입니다" 에러 확인

- [ ] **Step 5: 커밋**

```bash
git add src/app/\(auth\)/actions.ts
git commit -m "feat: validate invite code on signup"
```

---

## Task 5: 관리자 초대코드 Server Actions

**Files:**
- Create: `src/app/admin/invites/actions.ts`

- [ ] **Step 1: actions.ts 생성**

```typescript
// src/app/admin/invites/actions.ts
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
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/admin/invites/actions.ts
git commit -m "feat: admin invite code server actions"
```

---

## Task 6: 관리자 초대코드 페이지

**Files:**
- Create: `src/app/admin/invites/page.tsx`
- Create: `src/app/admin/invites/InvitesClient.tsx`

- [ ] **Step 1: InvitesClient.tsx (인터랙션 컴포넌트) 생성**

```tsx
// src/app/admin/invites/InvitesClient.tsx
'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { createInviteCodeAction, deactivateInviteCodeAction } from './actions';
import type { ActionResult } from '@/types/domain';

interface InviteRow {
  id: string;
  code: string;
  is_active: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
  usedByNickname?: string | null;
}

export default function InvitesClient({ codes }: { codes: InviteRow[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ code: string }> | null,
    FormData
  >(createInviteCodeAction, null);

  async function handleDeactivate(id: string) {
    await deactivateInviteCodeAction(id);
    router.refresh();
  }

  function getStatus(row: InviteRow): { label: string; color: string } {
    if (!row.is_active) return { label: '비활성', color: '#888' };
    if (row.used_by) return { label: '사용됨', color: '#4ade80' };
    if (row.expires_at && new Date(row.expires_at) < new Date()) return { label: '만료', color: '#f87171' };
    return { label: '미사용', color: 'var(--gold)' };
  }

  return (
    <div>
      {/* 생성 폼 */}
      <form action={formAction} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', padding: '1.5rem', border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--gold-dim)' }}>만료일 (선택)</span>
          <input
            type="date"
            name="expires_at"
            min={new Date().toISOString().split('T')[0]}
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', padding: '0.5rem 0.75rem', fontFamily: "'Cinzel', serif", fontSize: '0.8rem' }}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          style={{ padding: '0.55rem 1.5rem', background: 'var(--gold)', color: '#0a1f14', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em', border: 'none', cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.6 : 1 }}
        >
          {pending ? '생성 중...' : '+ 코드 생성'}
        </button>
        {state && state.ok && (
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.9rem', color: 'var(--gold)', letterSpacing: '0.2em' }}>
            생성됨: <strong>{state.data.code}</strong>
          </p>
        )}
        {state && !state.ok && (
          <p style={{ color: '#f87171', fontSize: '0.8rem' }}>{state.error.message}</p>
        )}
      </form>

      {/* 코드 목록 */}
      {codes.length === 0 ? (
        <p style={{ color: 'var(--white-dim)', opacity: 0.5, fontFamily: "'Cinzel', serif", fontSize: '0.75rem' }}>생성된 코드가 없습니다</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Cinzel', serif", fontSize: '0.72rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
              {['코드', '상태', '만료일', '생성일', '사용자', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0.6rem 1rem', color: 'var(--gold-dim)', letterSpacing: '0.15em', fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map(row => {
              const status = getStatus(row);
              return (
                <tr key={row.id} style={{ borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                  <td style={{ padding: '0.75rem 1rem', letterSpacing: '0.2em', color: 'var(--foreground)' }}>{row.code}</td>
                  <td style={{ padding: '0.75rem 1rem', color: status.color }}>{status.label}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--white-dim)' }}>{row.expires_at ? row.expires_at.split('T')[0] : '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--white-dim)' }}>{row.created_at.split('T')[0]}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--white-dim)' }}>{row.usedByNickname ?? (row.used_by ? '(탈퇴)' : '—')}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {row.is_active && !row.used_by && (
                      <button
                        onClick={() => handleDeactivate(row.id)}
                        style={{ background: 'none', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', padding: '0.25rem 0.65rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', cursor: 'pointer', letterSpacing: '0.1em' }}
                      >
                        비활성화
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: page.tsx (서버 컴포넌트) 생성**

```tsx
// src/app/admin/invites/page.tsx
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import InvitesClient from './InvitesClient';

export const dynamic = 'force-dynamic';

export default async function AdminInvitesPage() {
  const serviceClient = createSupabaseServiceClient();

  const { data: codes } = await serviceClient
    .from('invite_codes')
    .select('id, code, is_active, used_by, used_at, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  // 사용자 닉네임 조인
  const usedByIds = (codes ?? [])
    .map(c => c.used_by)
    .filter((id): id is string => id !== null);

  let nicknameMap: Record<string, string> = {};
  if (usedByIds.length > 0) {
    const { data: players } = await serviceClient
      .from('players')
      .select('id, nickname')
      .in('id', usedByIds);
    nicknameMap = Object.fromEntries((players ?? []).map(p => [p.id, p.nickname]));
  }

  const rows = (codes ?? []).map(c => ({
    ...c,
    usedByNickname: c.used_by ? (nicknameMap[c.used_by] ?? null) : null,
  }));

  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--gold-dim)', marginBottom: '0.5rem' }}>ADMIN</p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2rem', color: 'var(--foreground)' }}>초대코드 관리</h1>
        <div style={{ width: 40, height: 1, background: 'var(--gold)', opacity: 0.4, marginTop: '0.75rem' }} />
      </div>
      <InvitesClient codes={rows} />
    </div>
  );
}
```

- [ ] **Step 3: 브라우저에서 `/admin/invites` 확인**

  - 페이지 로드, 코드 생성 버튼, 생성된 코드 목록 표시 확인
  - 만료일 설정 후 생성 → 만료일 컬럼 표시 확인

- [ ] **Step 4: 커밋**

```bash
git add src/app/admin/invites/
git commit -m "feat: admin invite code management page"
```

---

## Task 7: 관리자 사이드 네비에 초대코드 링크 추가

**Files:**
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: 레이아웃 nav 배열에 항목 추가**

`src/app/admin/layout.tsx` 의 nav 배열에 아래 항목 추가 (공지사항 바로 위):

```typescript
{ href: '/admin/invites', label: '초대코드', icon: '🎫' },
```

최종 배열:
```typescript
[
  { href: '/admin', label: '대시보드', icon: '📊' },
  { href: '/admin/players', label: '플레이어', icon: '👥' },
  { href: '/admin/leagues', label: '리그 관리', icon: '🥇' },
  { href: '/admin/quarters', label: '분기 관리', icon: '📆' },
  { href: '/admin/rooms', label: '방 모니터링', icon: '🏠' },
  { href: '/admin/meeting', label: '모임 관리', icon: '📋' },
  { href: '/record', label: '경기 기록', icon: '🎲' },
  { href: '/admin/invites', label: '초대코드', icon: '🎫' },
  { href: '/admin/notice', label: '공지사항', icon: '📢' },
]
```

- [ ] **Step 2: 사이드바에서 "초대코드" 메뉴 표시 확인**

  `/admin` 페이지에서 사이드바에 "🎫 초대코드" 항목 표시, 클릭 시 `/admin/invites` 이동 확인

- [ ] **Step 3: 최종 커밋**

```bash
git add src/app/admin/layout.tsx
git commit -m "feat: add invite code link to admin sidebar"
```

---

## 최종 동작 확인 체크리스트

- [ ] `/admin/invites` 에서 만료일 없는 코드 생성
- [ ] `/admin/invites` 에서 만료일 있는 코드 생성
- [ ] `/signup` 에서 유효한 코드로 가입 성공
- [ ] `/signup` 에서 이미 사용된 코드로 가입 → 에러 메시지 확인
- [ ] `/signup` 에서 없는 코드로 가입 → 에러 메시지 확인
- [ ] `/admin/invites` 에서 사용된 코드에 사용자 닉네임 표시 확인
- [ ] `/admin/invites` 에서 코드 비활성화 버튼 동작 확인
- [ ] 비활성화된 코드로 `/signup` 시도 → "유효하지 않은 초대코드입니다" 확인
