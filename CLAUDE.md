# BGM Boardgame League — 프로젝트 컨텍스트

## 프로젝트 개요
**BGM (Boardgame in Melbourne)** — 멜버른 한인 보드게임 모임 관리 웹사이트
스택: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase

## 로컬 실행
```bash
npm run dev        # http://localhost:9000
```

## Supabase 연결 정보
- 프로젝트 ID: `khvkuowhnavsaorgjpyo` (Tokyo 리전)
- `.env.local` 에 키 있음 (절대 커밋 금지)
- 대시보드: https://supabase.com/dashboard/project/khvkuowhnavsaorgjpyo

## 인증 방식
이메일 없이 **아이디/비밀번호**만 사용
- 내부적으로 `{username}@bgm.local` 형식 fake email을 Supabase에 전달
- 관련 파일: `src/app/(auth)/actions.ts`, `src/app/(auth)/AuthCard.tsx`
- Supabase 대시보드에서 "Confirm email" **OFF** 상태 유지 필수

## 핵심 아키텍처: 칩 시스템
Elo 레이팅 **대신** BGM 클럽 규칙 기반 칩 포인트 사용

### 게임 타입별 칩 규칙
| 타입 | 규칙 |
|------|------|
| 팀전 (team) | 승 +1 / 패 -1 |
| 마피아 (mafia) | 마피아승 +2 / 시민승 +1 / 특수캐릭터승 +3 / 패배 0 |
| 1vs多 (onevsmany) | 1인팀 승 +2 / 다인팀 승 +1 / 패 -1 |
| 데스매치 (deathmatch) | 인당 3칩 베팅 → 승자독식 |
| 협력 (coop) | MVP 최다득표 +1 |
| 순위게임 (ranking) | 인원별 차등 (+2/+1/0/-1/-2...) |
| 참석 | +1 / 지각·불참 -1 / 투표미참여 -1 |
| 추첨 | 5회 모임마다, 칩 비례 확률 |

### 칩 계산 로직
`src/domain/chip.ts` — 순수 함수, 사이드 이펙트 없음

## DB 스키마 (M2 이후)
```
players           — 회원 (username, nickname)
leagues           — BGM 리그 컨테이너
league_memberships— 리그 멤버 (owner/manager/player)
games             — 보드게임 타이틀 목록
meetings          — 모임 회차 (1회, 2회, ...)
matches           — 경기 (game_type 포함)
match_participants — 경기별 참여자 + chip_change
meeting_attendances— 출석/투표 기록
chip_transactions  — 모든 칩 이동 (단일 소스)
player_chip_totals — 칩 잔고 뷰 (자동 집계)
```

## 주요 페이지
| 경로 | 설명 |
|------|------|
| `/` | 홈 — 칩 랭킹 리더보드 |
| `/login` | 로그인 (아이디 기반) |
| `/signup` | 회원가입 |
| `/admin/record` | 경기 기록 입력 폼 (로그인 필요) |

## 주요 파일 구조
```
src/
  app/
    (auth)/           — 로그인/회원가입
    (admin)/record/   — 경기 기록 폼 + server action
    page.tsx          — 홈 (리더보드)
  domain/
    chip.ts           — 칩 계산 순수 함수
  types/
    domain.ts         — 전체 TypeScript 타입
  lib/
    supabase/
      server.ts       — 서버 컴포넌트용 클라이언트
      service.ts      — service_role 클라이언트 (RLS 우회)
      middleware.ts   — 세션 갱신
    session.ts        — getSessionUser / requireSessionUser
    env.ts            — 환경변수 + isSupabaseConfigured()
supabase/
  schema.sql          — 초기 스키마
  schema-patch.sql    — M1 패치 (username 추가 등)
  migration-chip-system.sql — M2 칩 시스템 마이그레이션
```

## 현재 M2 완료 상태
- [x] DB 마이그레이션 실행 완료 (migration-chip-system.sql)
- [x] 칩 계산 도메인 로직 (chip.ts)
- [x] 경기 기록 폼 (/admin/record)
- [x] 홈 리더보드

## 다음 작업 후보 (M3)
- 출석 체크 기능 (/admin/attendance)
- 모임 관리 페이지 (/admin/meetings)
- 회원별 칩 히스토리 페이지
- 모바일 반응형 개선
- Vercel 배포

## 주의사항
- `chip_transactions` 테이블은 RLS로 client 쓰기 차단 → **반드시 `createSupabaseServiceClient()` 사용**
- 환경변수 없으면 `isSupabaseConfigured()` → false → 앱이 graceful하게 동작 (크래시 안 남)
- `@bgm.local` 도메인으로 실제 이메일이 발송되지 않도록 Supabase에서 Confirm email OFF 유지
