# Supabase Setup Guide — boardgame-league

실제 로그인/DB가 동작하려면 아래 5단계를 순서대로 진행합니다. 전체 15~20분.

## 1. 계정 생성 + 프로젝트 만들기

1. https://supabase.com 접속 → **Start your project** → GitHub 계정으로 가입 (무료 tier)
2. 대시보드 → **New project** 클릭
3. 설정:
   - **Name**: `boardgame-league`
   - **Database Password**: 안전한 비밀번호 생성 후 저장 (**Password Manager에 꼭 기록**)
   - **Region**: `Northeast Asia (Seoul)` 권장
   - **Pricing Plan**: Free
4. 프로젝트 생성 대기 (1~2분)

## 2. API 키 복사 → `.env.local` 작성

프로젝트 대시보드 → 왼쪽 메뉴 **Project Settings (⚙️)** → **API** 탭에서 3개 값 복사:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 절대 공개 금지)

프로젝트 루트에서:

```bash
cp .env.example .env.local
```

후 `.env.local`을 에디터로 열어 3개 값을 실제 값으로 교체.

## 3. 테이블 + RLS 정책 적용

Supabase 대시보드 → 왼쪽 **SQL Editor** → **New query** →
저장소의 `supabase/schema.sql` 내용 전체 복사 붙여넣기 → 우측 하단 **Run** 클릭.

성공 메시지 확인 후:
- 왼쪽 **Table Editor** 로 이동 → `players`, `leagues`, `seasons`, `matches` 등 10개 테이블 존재 확인
- 왼쪽 **Authentication → Policies** 에서 각 테이블의 정책이 활성화됐는지 확인

## 4. 이메일 인증 설정 (Email/Password)

Supabase 대시보드 → **Authentication → Providers → Email** (기본으로 켜져 있음).

개발 편의를 위해 **Confirm email** 옵션을 **OFF**로 잠시 비활성화 (로컬 테스트 시 메일 확인 생략). 배포 전에는 다시 **ON**.

## 5. (선택) Google OAuth

대시보드 → **Authentication → Providers → Google** → Enable → Google Cloud Console에서 OAuth client ID/Secret 발급 후 Supabase에 붙여넣기. **Callback URL**(예: `https://<project>.supabase.co/auth/v1/callback`)을 Google Cloud Console의 승인된 리디렉션 URI에 등록.

---

## 다음 단계

```bash
npm install        # @supabase/* 설치
npm run test:run   # domain 테스트 통과 확인
npm run dev        # http://localhost:9000
```

`/login`, `/signup` 페이지에서 실제 가입이 성공하면 Supabase 대시보드 → **Authentication → Users** 에 유저가 나타나고, **Table Editor → players** 에도 자동으로 행이 생성되면 (handle_new_user 트리거) 연결 성공.

## 문제가 생기면

| 증상 | 원인 | 조치 |
|------|------|------|
| `Missing required env var` | `.env.local` 값 누락 | 2단계 재확인 |
| 가입은 되는데 `players`에 행이 없음 | `handle_new_user` 트리거 미생성 | `supabase/schema.sql` 재실행 |
| 로그인 후 `.from().select()` 결과가 빈 배열 | RLS 정책 누락 | `supabase/schema.sql` 재실행 + Policies 탭 확인 |
