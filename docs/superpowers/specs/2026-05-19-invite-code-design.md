# Invite Code & Signup Restriction — Design Spec

**Date:** 2026-05-19  
**Project:** BGM Boardgame League  
**Status:** Approved

---

## Overview

BGM 모임 외부인의 무단 가입을 막기 위해 초대코드 기반 가입 제한 시스템을 추가한다.  
관리자가 `/admin/invites` 페이지에서 1회용 초대코드를 생성·관리하고, 가입 시 유효한 코드를 입력해야만 계정이 생성된다.

---

## DB Schema

### 새 테이블: `invite_codes`

```sql
CREATE TABLE invite_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at     timestamptz,
  expires_at  timestamptz,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: 일반 유저는 자신이 사용한 코드 외 읽기 불가
-- 쓰기는 service_role 전용 (검증·사용 처리 모두 server action에서)
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
```

---

## 가입 플로우 변경

### 기존
```
아이디 + 비밀번호 → supabase.auth.signUp()
```

### 변경 후
```
아이디 + 비밀번호 + 초대코드
  → 코드 검증 (service_role client)
      1. 코드 존재 여부
      2. is_active = true
      3. used_by IS NULL
      4. expires_at > now() OR expires_at IS NULL
  → supabase.auth.signUp()
  → invite_codes.used_by, used_at 업데이트 (service_role)
```

### 검증 실패 메시지
- 존재하지 않음: "유효하지 않은 초대코드입니다"
- 이미 사용됨: "이미 사용된 초대코드입니다"
- 만료됨: "만료된 초대코드입니다"
- 비활성: "유효하지 않은 초대코드입니다" (보안상 비활성/없음 동일 메시지)

---

## 변경 파일

### 1. `src/app/(auth)/AuthCard.tsx`
- 초대코드 입력 필드 추가 (signup 모드에서만 표시)
- 필드: `invite_code`, required, 대소문자 구분 없이 입력받되 서버에서 대문자 처리

### 2. `src/app/(auth)/actions.ts`
- `signupAction`에 초대코드 검증 로직 추가
- `createSupabaseServiceClient()` 사용하여 RLS 우회 후 코드 검증·업데이트

### 3. `src/lib/supabase/service.ts`
- 이미 존재하는 service_role 클라이언트 — 그대로 사용

---

## 관리자 페이지

### 경로: `/admin/invites`

#### 구성
1. **헤더**: "초대코드 관리" 타이틀 + 코드 생성 버튼
2. **생성 폼** (inline 또는 모달):
   - 만료일 선택 (date picker, 선택사항)
   - "생성" 버튼 → 8자 랜덤 대문자 영숫자 코드 자동 생성
3. **코드 목록 테이블**:
   - 코드값 | 상태 | 만료일 | 생성일 | 사용자 | 비활성화 버튼

#### 코드 상태
| 상태 | 조건 |
|------|------|
| 미사용 | `used_by IS NULL` + `is_active = true` + 만료 안됨 |
| 사용됨 | `used_by IS NOT NULL` |
| 만료됨 | `expires_at < now()` + 미사용 |
| 비활성 | `is_active = false` |

#### Server Actions (`/admin/invites/actions.ts`)
- `createInviteCodeAction(expiresAt?: string)` — 코드 생성
- `deactivateInviteCodeAction(id: string)` — 비활성화

#### 관리자 권한 체크
- 기존 admin layout의 인증 로직 그대로 적용

---

## 새 파일 목록

| 파일 | 용도 |
|------|------|
| `src/app/admin/invites/page.tsx` | 초대코드 관리 페이지 (서버 컴포넌트) |
| `src/app/admin/invites/InvitesClient.tsx` | 생성/비활성화 인터랙션 (클라이언트 컴포넌트) |
| `src/app/admin/invites/actions.ts` | 코드 생성·비활성화 Server Actions |
| `supabase/migration-invite-codes.sql` | DB 마이그레이션 |

---

## 보안 고려사항

- 코드 검증 전체를 server action에서 처리 → 브루트포스 시 서버 부하만 증가, 클라이언트 노출 없음
- 비활성 코드와 존재하지 않는 코드에 동일 메시지 → 코드 존재 여부 노출 방지
- `service_role` 클라이언트로만 `invite_codes` 쓰기 → RLS가 클라이언트 직접 조작 차단
- 코드는 8자 영숫자 대문자 (약 2.8조 경우의 수) → 추측 불가

---

## 구현 순서

1. DB 마이그레이션 실행
2. `signupAction` 수정 + `AuthCard` 초대코드 필드 추가
3. `/admin/invites` 페이지 구현
4. 관리자 네비게이션에 "초대코드" 링크 추가
5. 동작 테스트 (유효 코드 / 만료 코드 / 중복 사용)
