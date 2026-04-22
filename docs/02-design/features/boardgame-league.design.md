---
template: design
version: 1.2
description: PDCA Design phase document for boardgame-league (Dynamic level)
variables:
  - feature: boardgame-league
  - date: 2026-04-20
  - author: 안종태
  - project: boardgame-league
  - version: 0.1.0
---

# boardgame-league Design Document

> **Summary**: 리더보드 중심의 보드게임 리그 관리 웹앱. Next.js + Supabase(Postgres + Auth + RLS) 기반 Dynamic 프로젝트.
>
> **Stack pivot 2026-04-20**: 초기 설계의 bkend.ai BaaS 대신 **Supabase**로 변경. Auth/JWT/RLS 모델은 호환되어 핵심 설계는 유지되며, Data API 호출 방식만 Supabase JS SDK로 교체.
>
> **Project**: boardgame-league
> **Version**: 0.1.0
> **Author**: 안종태
> **Date**: 2026-04-20
> **Status**: Draft
> **Planning Doc**: [boardgame-league.plan.md](../../01-plan/features/boardgame-league.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | [Schema Definition](../../01-plan/schema.md) | ✅ |
| Phase 1.5 | [Glossary](../../01-plan/glossary.md) | ✅ |
| Phase 2 | [Coding Conventions](../../01-plan/conventions.md) | ❌ (In this doc §10) |
| Phase 3 | Mockup | ❌ (Inline in §5) |
| Phase 4 | API Spec | ❌ (Inline in §4) |

> **Note**: Pipeline Phase 2/3/4 문서는 별도로 만들지 않고 이 Design 문서 §4, §5, §10에 통합됩니다.

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 보드게임 모임은 승패 기록이 수첩/대화로 흩어지고, 랭킹이 주관적이며, 대진 편성이 비효율적이다 |
| **Solution** | 리더보드를 중심축으로 한 웹앱 — 시즌·매치·Elo 자동 계산 + 브래킷 관리 + RBAC로 신뢰 가능한 공식 기록 제공 |
| **Function/UX Effect** | 로그인→경기결과 입력 10초, 실시간 Elo 리더보드 갱신, 매니저 전용 브래킷 편성 UI |
| **Core Value** | "어제의 대결이 오늘의 순위가 된다" — 기록하는 순간 공식이 된다 |

---

## 1. Overview

### 1.1 Design Goals

- 리더보드 중심 UX (홈 진입 시 즉시 순위 확인, 1-click으로 상세 진입)
- **Supabase**로 백엔드를 최소 서버 코드 운영 (Auth/Postgres/RLS 위임)
- Elo 계산은 Server Action에서 **PL/pgSQL 함수 + 트랜잭션**으로 원자성 보장
- Match는 단일 진실(Source of Truth), RankingSnapshot은 조회 최적화 캐시
- FR-01 ~ FR-11 모든 요구사항을 Clean Architecture 4-레이어 분리로 구현

### 1.2 Design Principles

- **SoT 원칙**: Match만이 진실. Ranking은 파생(derived) 데이터
- **RLS-First**: 권한 체크는 **Supabase Postgres RLS 정책**이 1차 방어, 애플리케이션은 UX용 2차 검증
- **Server-First Rendering**: 리더보드·시즌 페이지는 Server Component + ISR
- **Mutations Only Server Actions**: Client에서 Supabase에 직접 write 금지 → Server Action으로 단일 경로 강제
- **Service Role은 최후의 수단**: 기본은 유저 JWT + RLS. RankingSnapshot upsert 같이 시스템이 써야 하는 경우만 service-role client 사용
- **Progressive Enhancement**: 핵심 읽기 기능은 로그인 없이 접근 가능 (공개 리그)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────┐   Server Actions    ┌────────────────────┐   PostgREST+JWT   ┌──────────────┐
│  Browser         │────────────────────▶│  Next.js 15        │──────────────────▶│  Supabase    │
│  (React 19 RSC)  │◀────────────────────│  App Router        │◀──────────────────│  - Auth (GoTrue) │
│  + supabase-js   │   HTML/JSON         │  - RSC / ISR       │   Postgres+RLS    │  - Postgres  │
└──────────────────┘                     │  - Server Actions  │                   │  - Storage   │
         │                               │  - middleware.ts   │                   │  - Realtime  │
         │ (browser client: public reads │  - @supabase/ssr   │                   └──────────────┘
         │  + OAuth redirect only)       └────────────────────┘
         └──────────────────────────────────────────┘
```

**세 가지 클라이언트 타입:**

| Client | File | Runs in | Permissions |
|--------|------|---------|-------------|
| Browser client | `lib/supabase/client.ts` | `'use client'` 컴포넌트 | anon key + user JWT (RLS 적용) |
| Server client | `lib/supabase/server.ts` | RSC, Server Actions | anon key + user JWT from cookies (RLS 적용) |
| Service client | `lib/supabase/service.ts` | **Server Actions only** | service-role key (RLS 우회 — 신중히 사용) |

### 2.2 Data Flow (핵심: 경기 결과 입력)

```
[Player] 결과 입력 폼
   │
   ▼
Client Component (react-hook-form + zod)
   │  { season_id, player_a, player_b, result }
   ▼
Server Action: recordMatch()
   │  1) 인증 확인 (supabase.auth.getUser via server client)
   │  2) 권한 확인 (manager/owner via LeagueMembership — SELECT with RLS)
   │  3) Elo 계산 (player_a.rating, player_b.rating)
   │  4) Postgres RPC: record_match_and_update_rankings(...)
   │     - BEGIN → INSERT match → UPSERT 2 ranking_snapshots → COMMIT
   │     - 실패 시 전체 롤백 (Postgres 트랜잭션)
   │  5) revalidatePath('/leagues/[slug]/leaderboard')
   ▼
Leaderboard (Server Component, ISR 60s) → 즉시 반영
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `app/leagues/[slug]/leaderboard/page.tsx` | `services/ranking.ts`, `supabase/server` | 리더보드 조회 |
| `services/match.ts` | `domain/elo.ts`, Postgres RPC `record_match_and_update_rankings` | 매치 기록 + Elo 업데이트 |
| `domain/elo.ts` | — (pure) | K=32 Elo 계산 |
| `app/(auth)/login/page.tsx` | `supabase/server`, `supabase/client` | 이메일/구글 로그인 |
| `lib/supabase/*` | `@supabase/supabase-js`, `@supabase/ssr` (env: `NEXT_PUBLIC_SUPABASE_*`) | 브라우저/서버/서비스 클라이언트 |

---

## 3. Data Model

### 3.1 Entity Definition (TypeScript)

Phase 1 Schema(`docs/01-plan/schema.md`)의 10개 엔티티를 TypeScript 인터페이스로 표현.

```typescript
// src/types/domain.ts

export type MatchResult = 'a_win' | 'b_win' | 'draw';
export type SeasonStatus = 'upcoming' | 'active' | 'closed';
export type BracketStatus = 'open' | 'scheduled' | 'played' | 'cancelled';
export type LeagueRole = 'owner' | 'manager' | 'player';
export type ParticipationStatus = 'applied' | 'confirmed' | 'declined';

export interface Player {
  id: string;              // UUID — matches auth.users.id (Supabase Auth)
  email: string;
  nickname: string;
  avatar_url?: string;
  bio?: string;
  is_active: boolean;
  createdAt: string;       // ISO 8601
  updatedAt: string;
}

export interface League {
  id: string;
  name: string;
  slug: string;            // URL-safe unique
  owner_id: string;        // → Player.id
  default_game_id?: string;// → Game.id
  elo_k: number;           // default 32
  is_public: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeagueMembership {
  id: string;
  league_id: string;
  player_id: string;
  role: LeagueRole;
  joined_at: string;
}

export interface Season {
  id: string;
  league_id: string;
  name: string;
  number: number;
  started_at: string;
  ended_at?: string;
  status: SeasonStatus;
}

export interface Game {
  id: string;
  name: string;
  min_players: number;
  max_players: number;
  supports_draw: boolean;
}

export interface Match {
  id: string;
  season_id: string;
  game_id: string;
  played_at: string;
  player_a_id: string;
  player_b_id: string;
  winner_id?: string;      // null on draw
  loser_id?: string;
  result: MatchResult;
  elo_change_a: number;
  elo_change_b: number;
  created_by: string;      // auditor (manager user id)
}

export interface Round {
  id: string;
  season_id: string;
  number: number;
  name: string;
}

export interface Bracket {
  id: string;
  round_id: string;
  player_a_id: string;
  player_b_id: string;
  scheduled_at?: string;
  status: BracketStatus;
  match_id?: string;       // populated when played
}

export interface MatchParticipation {
  id: string;
  bracket_id: string;
  player_id: string;
  status: ParticipationStatus;
}

export interface RankingSnapshot {
  id: string;
  season_id: string;
  player_id: string;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
  elo: number;             // default 1500
  win_rate: number;        // 0..1 (wins/(wins+losses+draws))
  updated_at: string;
}
```

### 3.2 Entity Relationships

```
[Player] 1 ── N [LeagueMembership] N ── 1 [League]
   │                                       │
   │                                       └── 1 ── N [Season] 1 ── N [Match]
   │                                                       │              ▲
   │                                                       └── 1 ── N [Round] 1 ── N [Bracket]
   │                                                                                      │
   │                                                                                      └──▶ [Match] (via match_id)
   │
   └── 1 ── N [RankingSnapshot] (per season)
   └── 1 ── N [MatchParticipation] (per bracket)
```

### 3.3 Postgres Table Schema (Supabase)

| Table | PK | Unique Constraints | FK | RLS Intent |
|-------|----|---------------------|----|------------|
| `players` | id (= auth.users.id) | email, nickname | — | Read: public · Write: self only |
| `leagues` | id | slug | owner_id → players.id | Read: is_public OR member · Write: owner |
| `league_memberships` | id | (league_id, player_id) | both | Read: members of league · Write: owner/manager of league |
| `seasons` | id | (league_id, number) | league_id | Read: if league readable · Write: owner/manager |
| `games` | id | name | — | Read: public · Write: authenticated |
| `matches` | id | — | season_id, game_id, players | Read: if league readable · Write: owner/manager (INSERT only) |
| `rounds` | id | (season_id, number) | season_id | Read: if league readable · Write: owner/manager |
| `brackets` | id | — | round_id, players | Read: members · Write: owner/manager |
| `match_participations` | id | (bracket_id, player_id) | both | Read: members · Write: self OR owner/manager |
| `ranking_snapshots` | id | (season_id, player_id) | both | Read: public if league public · Write: service_role only |

**Key RLS patterns (예시):**

```sql
-- 리그 읽기: 공개이거나 멤버인 경우
create policy "leagues_read" on leagues for select
  using (
    is_public = true
    or exists (
      select 1 from league_memberships lm
      where lm.league_id = leagues.id and lm.player_id = auth.uid()
    )
  );

-- 매치 쓰기: owner/manager 만 insert
create policy "matches_insert" on matches for insert
  with check (
    exists (
      select 1 from seasons s
      join league_memberships lm on lm.league_id = s.league_id
      where s.id = matches.season_id
        and lm.player_id = auth.uid()
        and lm.role in ('owner','manager')
    )
  );

-- ranking_snapshots 는 service_role 만 write (Postgres 함수에서 실행)
create policy "ranking_snapshots_write_none" on ranking_snapshots
  for all to authenticated using (false) with check (false);
```

> Supabase 자동 필드: `created_at`, `updated_at` 는 `default now()` + trigger로 관리.
> 모든 테이블에 `alter table <x> enable row level security;` 선적용 필수.

---

## 4. API Specification

### 4.1 Approach

- **읽기(GET)**: Server Component가 `createSupabaseServerClient()`로 PostgREST SELECT 호출. 공개 리그는 anon 권한으로도 읽힘.
- **쓰기(INSERT/UPDATE/DELETE)**: **Server Action 전용**. Client → Server Action → Supabase. RLS 통과 필수.
- **Auth**: Supabase Auth (GoTrue). email/password + Google OAuth. `@supabase/ssr`이 쿠키 기반 JWT 자동 관리.
- **트랜잭션 필요 로직**: Postgres `function` + `rpc()` 호출. 예: `record_match_and_update_rankings()` (INSERT match + UPSERT 2 snapshots 원자 처리).

### 4.2 Server Actions (Mutations)

| Action | File | Roles | Purpose |
|--------|------|-------|---------|
| `signup(email, password, nickname)` | `app/(auth)/actions.ts` | guest | Player 레코드 생성 + JWT 발급 |
| `login(email, password)` | `app/(auth)/actions.ts` | guest | JWT 발급 + cookie 세팅 |
| `logout()` | `app/(auth)/actions.ts` | self | cookie 제거 |
| `createLeague(name, slug)` | `app/leagues/actions.ts` | self | League + LeagueMembership(owner) |
| `inviteMember(leagueId, email, role)` | `app/leagues/[slug]/actions.ts` | owner/manager | LeagueMembership insert |
| `createSeason(leagueId, name, number)` | `app/leagues/[slug]/actions.ts` | owner/manager | Season insert |
| `recordMatch(seasonId, matchData)` | `app/leagues/[slug]/actions.ts` | owner/manager | **Match insert + RankingSnapshot upsert (트랜잭션)** |
| `createBracket(roundId, players)` | `app/leagues/[slug]/actions.ts` | owner/manager | Bracket insert |
| `applyToBracket(bracketId)` | `app/leagues/[slug]/actions.ts` | self | MatchParticipation(applied) |
| `confirmParticipation(partId)` | `app/leagues/[slug]/actions.ts` | owner/manager | status → confirmed |

### 4.3 Detailed Specification: `recordMatch` (핵심 액션)

**Input (zod schema):**
```typescript
z.object({
  season_id: z.string().uuid(),
  game_id: z.string().uuid(),
  played_at: z.string().datetime(),
  player_a_id: z.string().uuid(),
  player_b_id: z.string().uuid(),
  result: z.enum(['a_win', 'b_win', 'draw']),
  bracket_id: z.string().uuid().optional(), // bracket에서 들어온 경우
})
```

**Success (201 Created):**
```json
{
  "ok": true,
  "match": {
    "id": "uuid",
    "elo_change_a": 12,
    "elo_change_b": -12,
    "played_at": "2026-04-20T10:30:00Z"
  },
  "snapshots": [
    { "player_id": "a", "elo": 1512, "rank": 3 },
    { "player_id": "b", "elo": 1488, "rank": 5 }
  ]
}
```

**Error Responses:**
- `400 VALIDATION_ERROR`: zod 실패 (player_a == player_b, 미래 시각 등)
- `401 UNAUTHENTICATED`: JWT 없음/만료
- `403 FORBIDDEN`: LeagueMembership.role ∉ {owner, manager}
- `404 NOT_FOUND`: season/game/player 누락
- `409 CONFLICT`: 동일 (season_id, played_at, players) 중복
- `500 ELO_TX_FAILED`: Postgres 트랜잭션 실패 (롤백됨)

### 4.4 Public Read API (Supabase PostgREST)

Server Component 내부에서 `createSupabaseServerClient()` 사용. anon key + RLS로 공개 데이터만 노출.

| Query | Equivalent | Purpose | Cache |
|-------|-----------|---------|-------|
| `from('ranking_snapshots').select().eq('season_id', id).order('rank')` | SELECT ... ORDER BY rank | 리더보드 조회 | ISR 60s |
| `from('matches').select().eq('season_id', id).order('played_at', {ascending:false}).limit(20)` | 최근 20경기 | 최근 경기 | ISR 60s |
| `from('leagues').select().eq('is_public', true)` | 공개 리그 목록 | 공개 리그 목록 | ISR 300s |
| `from('seasons').select().eq('league_id', id)` | 시즌 목록 | 시즌 목록 | ISR 300s |

---

## 5. UI/UX Design

### 5.1 Screen Layout (Leaderboard-centric)

```
┌─────────────────────────────────────────────────────────────┐
│  Logo  | 홈 · 리그 · 내경기 · 프로필              [로그인]   │  ← Header
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏆 [리그이름] Season 3 · 리더보드             [시즌 전환 ▾]│
│                                                             │
│  ┌─────┬──────────────┬──────┬──────┬──────┬─────────┐    │
│  │ Rk  │ Player       │ Elo  │ W-L-D│ Win% │ Trend   │    │
│  ├─────┼──────────────┼──────┼──────┼──────┼─────────┤    │
│  │ 1   │ 🥇 Alice     │ 1824 │ 12-3 │ 80%  │ ▲ +24   │    │
│  │ 2   │ 🥈 Bob       │ 1765 │ 10-5 │ 66%  │ ▼ -8    │    │
│  │ 3   │ 🥉 Carol     │ 1701 │ 9-6  │ 60%  │ ─       │    │
│  │ ... │              │      │      │      │         │    │
│  └─────┴──────────────┴──────┴──────┴──────┴─────────┘    │
│                                                             │
│  [+ 경기 결과 입력]   (manager/owner 만 표시)              │
│                                                             │
│  ── 최근 경기 ──                                            │
│  • Alice ▶ Bob  (30분 전) · 체스 · +12 / -12                │
│  • Carol ▶ Dave (2시간 전) · 체스 · +8 / -8                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Footer · © 2026 boardgame-league                          │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 User Flow

```
[Guest]
  └─ 홈 → 공개 리그 목록 → 리더보드 조회 (읽기 전용)
         └─ 로그인 CTA → 이메일/구글 로그인 → Player 생성 (최초)

[Player]
  └─ 홈 → 내 리그 → 리더보드 → 내 순위 확인
       └─ 브래킷 참가 신청 → (manager 승인 대기)

[Manager/Owner]
  └─ 리더보드 → [+ 경기 결과] → 폼 입력 → recordMatch()
       ├─ 성공: 리더보드 자동 갱신 (revalidate)
       └─ 실패: 에러 토스트 + 폼 유지
  └─ 라운드 생성 → 브래킷 자동/수동 편성 → 참가자 확정

[Owner]
  └─ 리그 설정 → 멤버 초대 (email) → role 부여
       └─ 시즌 종료 → ended_at 기록 → 새 시즌 오픈
```

### 5.3 Component List

| Component | Location | Layer | Responsibility |
|-----------|----------|-------|----------------|
| `LeaderboardTable` | `src/components/leaderboard/LeaderboardTable.tsx` | Presentation | 순위 테이블 (sortable) |
| `RankBadge` | `src/components/leaderboard/RankBadge.tsx` | Presentation | 🥇🥈🥉 + 숫자 배지 |
| `EloTrendIndicator` | `src/components/leaderboard/EloTrendIndicator.tsx` | Presentation | ▲▼ 변동 표시 |
| `RecordMatchDialog` | `src/components/match/RecordMatchDialog.tsx` | Presentation | 경기 결과 입력 모달 |
| `MatchForm` | `src/components/match/MatchForm.tsx` | Presentation | react-hook-form + zod |
| `RecentMatches` | `src/components/match/RecentMatches.tsx` | Presentation | 최근 경기 리스트 |
| `BracketBoard` | `src/components/bracket/BracketBoard.tsx` | Presentation | 토너먼트 브래킷 시각화 |
| `AuthForm` | `src/components/auth/AuthForm.tsx` | Presentation | 로그인/회원가입 폼 |
| `ProtectedRoute` | `src/components/auth/ProtectedRoute.tsx` | Presentation | 권한 가드 래퍼 |
| `SeasonSwitcher` | `src/components/season/SeasonSwitcher.tsx` | Presentation | 시즌 드롭다운 |

### 5.4 Key Pages (Next.js App Router)

| Route | File | Rendering |
|-------|------|-----------|
| `/` | `app/page.tsx` | RSC (공개 리그 TOP) |
| `/login` | `app/(auth)/login/page.tsx` | RSC + Client form |
| `/signup` | `app/(auth)/signup/page.tsx` | RSC + Client form |
| `/leagues/[slug]` | `app/leagues/[slug]/page.tsx` | RSC (ISR 60s) |
| `/leagues/[slug]/leaderboard` | `app/leagues/[slug]/leaderboard/page.tsx` | RSC (ISR 60s) |
| `/leagues/[slug]/seasons/[seasonId]` | `.../page.tsx` | RSC (ISR 60s) |
| `/leagues/[slug]/brackets` | `.../brackets/page.tsx` | RSC (manager만) |
| `/me` | `app/me/page.tsx` | RSC (auth required) |
| `/me/matches` | `app/me/matches/page.tsx` | RSC (auth required) |

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| `VALIDATION_ERROR` | 입력값이 올바르지 않습니다 | zod 검증 실패 | 폼 필드 하이라이트 + 메시지 |
| `UNAUTHENTICATED` | 로그인이 필요합니다 | JWT 없음/만료 | `/login?redirect=...`로 이동 |
| `FORBIDDEN` | 권한이 없습니다 | role 부족 | 토스트 + 이전 페이지 |
| `NOT_FOUND` | 리소스를 찾을 수 없습니다 | 404 | Next.js not-found.tsx |
| `CONFLICT` | 이미 등록된 데이터입니다 | unique 위반 | 폼 유지 + 에러 메시지 |
| `ELO_TX_FAILED` | 경기 기록 중 오류 (롤백됨) | Postgres 트랜잭션 실패 | 재시도 버튼 + 운영자 알림 |
| `NETWORK_ERROR` | 네트워크 오류 | fetch 실패 | 재시도 버튼 |
| `UNKNOWN` | 알 수 없는 오류 | 예외 | Sentry 리포트 + 일반 메시지 |

### 6.2 Error Response Format (Server Action)

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; details?: unknown } };
```

### 6.3 UI Error Presentation

- Inline (form field): zod 에러 → `<FormField error={message}/>`
- Toast (action result): shadcn `<Toaster/>` + `toast.error()`
- Page-level: Next.js `error.tsx` + `not-found.tsx`
- Global fallback: `global-error.tsx`

---

## 7. Security Considerations

- [x] Input validation: 모든 Server Action 입구에서 zod 파싱 (XSS/Injection 차단)
- [x] 인증: **Supabase Auth (GoTrue)** JWT → `@supabase/ssr`이 httpOnly + Secure + SameSite=Lax 쿠키로 자동 관리
- [x] 인가: **Postgres RLS 필수** — 테이블별 `enable row level security` + role-based 정책 (§3.3)
- [x] 애플리케이션 2차 검증: Server Action 진입 시 `requireSessionUser()` + `assertRole()` (UX용)
- [x] 민감 데이터: `NEXT_PUBLIC_SUPABASE_*`에는 anon key만. `SUPABASE_SERVICE_ROLE_KEY`는 서버 env 전용 (절대 client bundle 금지)
- [x] Service role 사용은 명시적으로 `createSupabaseServiceClient()` 파일 주석으로 제한 (§2.1)
- [x] HTTPS: Vercel 기본 적용
- [x] Rate Limiting: Server Action에 `recordMatch` 분당 10건 제한 (`lib/rate-limit.ts`)
- [x] CSRF: Server Actions는 Next.js가 자동 토큰 검증
- [x] OAuth: Google은 Supabase 대시보드에서 Provider 설정 (client secret은 Supabase에만 저장, 앱 env에 노출 안 됨)
- [x] Audit log: Match에 `created_by` 기록 → 분쟁 시 추적

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit Test | `domain/elo.ts` (순수 함수) | Vitest |
| Unit Test | `services/*` (Supabase mock) | Vitest + msw |
| Integration | Server Actions (E2E handler) | Vitest + 테스트용 Supabase 프로젝트 (혹은 local supabase CLI) |
| Manual QA | 주요 User Flow (회원가입 → 매치 입력 → 리더보드) | 체크리스트 |
| Zero Script QA | 런타임 에러 감지 | `npm run dev` 콘솔 + Next.js 로그 |

### 8.2 Test Cases (Key)

- [ ] Happy: 매니저가 `a_win` 매치 기록 시 Alice +Δ, Bob -Δ, 리더보드 갱신
- [ ] Happy: 무승부(`draw`) 시 두 선수 Elo 변화량 절댓값 동일 (< K/2)
- [ ] Happy: 비공개 리그는 비로그인 시 리더보드 접근 차단
- [ ] Error: player_a == player_b → VALIDATION_ERROR
- [ ] Error: 일반 player가 recordMatch 호출 → FORBIDDEN
- [ ] Error: 만료된 JWT로 요청 → UNAUTHENTICATED + 리프레시 시도
- [ ] Edge: 신규 Player (RankingSnapshot 없음) 첫 경기 → elo 1500에서 시작
- [ ] Edge: 시즌 종료(`closed`) 후 매치 입력 시도 → VALIDATION_ERROR
- [ ] Edge: Elo 하한 (< 100) 방어
- [ ] Concurrency: 동시에 두 매니저가 같은 브래킷 결과 입력 → 409 CONFLICT

---

## 9. Clean Architecture

> Reference: `docs/01-plan/boardgame-league.plan.md §6.3` (Dynamic level)

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | React components, pages, hooks, forms | `src/app/`, `src/components/`, `src/hooks/` |
| **Application** | Server Actions, service orchestration, 트랜잭션 조정 | `src/services/`, `src/app/**/actions.ts` |
| **Domain** | 엔티티 타입, Elo 계산, 권한 체크 규칙 (순수) | `src/types/`, `src/domain/` |
| **Infrastructure** | Supabase 클라이언트, 외부 API, 로깅 | `src/lib/` (supabase/*.ts, session.ts, rate-limit.ts) |

### 9.2 Dependency Rules

```
┌─────────────────────────────────────────────────────────────┐
│                    Dependency Direction                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Presentation ──→ Application ──→ Domain ←── Infrastructure│
│                          │                                  │
│                          └──→ Infrastructure                │
│                                                             │
│   Rule: Inner layers MUST NOT depend on outer layers        │
│         Domain은 supabase SDK / React를 절대 import 하지 않음 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 File Import Rules

| From | Can Import | Cannot Import |
|------|-----------|---------------|
| Presentation (`components/`, `app/**/page.tsx`) | Application, Domain | `lib/supabase/*` 로 직접 write 호출 |
| Application (`services/`, `actions.ts`) | Domain, Infrastructure | Presentation |
| Domain (`domain/`, `types/`) | 순수 TS only | 모든 외부 레이어 |
| Infrastructure (`lib/`) | Domain (types only) | Application, Presentation |

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `LeaderboardTable` | Presentation | `src/components/leaderboard/` |
| `RecordMatchDialog` | Presentation | `src/components/match/` |
| `recordMatchAction` | Application | `src/app/leagues/[slug]/actions.ts` |
| `MatchService.create` | Application | `src/services/match.ts` |
| `RankingService.recalculate` | Application | `src/services/ranking.ts` |
| `computeElo(ra, rb, result, k)` | Domain | `src/domain/elo.ts` |
| `assertMembership(leagueId, roles)` | Domain | `src/domain/auth-rules.ts` |
| `Match, Player, ...` types | Domain | `src/types/domain.ts` |
| `createSupabaseServerClient` | Infrastructure | `src/lib/supabase/server.ts` |
| `createSupabaseBrowserClient` | Infrastructure | `src/lib/supabase/client.ts` |
| `createSupabaseServiceClient` | Infrastructure | `src/lib/supabase/service.ts` |
| `rateLimit` | Infrastructure | `src/lib/rate-limit.ts` |

---

## 10. Coding Convention Reference

> Phase 2 문서(`docs/01-plan/conventions.md`)를 별도 생성하지 않고 이 절에 통합.

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `LeaderboardTable`, `MatchForm` |
| Functions | camelCase | `computeElo()`, `recordMatch()` |
| Server Actions | `<verb><Noun>Action` | `recordMatchAction`, `createLeagueAction` |
| Constants | UPPER_SNAKE_CASE | `ELO_K_DEFAULT`, `INITIAL_RATING` |
| Types/Interfaces | PascalCase | `Match`, `RankingSnapshot`, `ActionResult<T>` |
| Files (component) | PascalCase.tsx | `LeaderboardTable.tsx` |
| Files (utility/service) | camelCase.ts | `elo.ts`, `match.ts` |
| Folders | kebab-case | `match-form/`, `auth-provider/` |
| DB fields | snake_case | `season_id`, `elo_change_a` |
| API responses | snake_case (Postgres) → camelCase 변환은 presentation layer 선택 사항 | — |

### 10.2 Import Order

```typescript
// 1. External libraries
import { useState } from 'react';
import { z } from 'zod';

// 2. Internal absolute imports (services, lib)
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { recordMatch } from '@/services/match';

// 3. Internal components
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';

// 4. Relative imports
import { useLeagueContext } from './hooks';

// 5. Type imports
import type { Match, Player } from '@/types/domain';

// 6. Styles
import './styles.css';
```

### 10.3 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 anon key (RLS-protected) | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (bypasses RLS) | **Server only** |
| `NEXT_PUBLIC_APP_URL` | Base URL (for OAuth redirect) | Client + Server |

> Google OAuth 클라이언트 ID/Secret 은 Supabase 대시보드 (Authentication → Providers) 에 직접 입력합니다. 앱 .env 에는 보관하지 않음.

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | PascalCase, Feature folder 기준 (`leaderboard/`, `match/`) |
| File organization | `src/components/<feature>/`, `src/services/<entity>.ts` |
| State management | Server Component 우선 → Client는 **TanStack Query** (서버 상태) + **Zustand** (UI 상태) |
| Form handling | `react-hook-form` + `zod` resolver |
| Error handling | Server Actions는 `ActionResult<T>` 반환 (throw 금지) |
| Styling | Tailwind utility-first + shadcn/ui 컴포넌트 |
| Date handling | ISO 8601 문자열로 저장, 표시 시 `date-fns` 포맷 |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── actions.ts
│   ├── leagues/
│   │   ├── page.tsx                       # 공개 리그 목록
│   │   └── [slug]/
│   │       ├── page.tsx                   # 리그 홈
│   │       ├── leaderboard/page.tsx       # 리더보드 (핵심)
│   │       ├── seasons/[seasonId]/page.tsx
│   │       ├── brackets/page.tsx
│   │       └── actions.ts                 # Server Actions
│   ├── me/
│   │   ├── page.tsx
│   │   └── matches/page.tsx
│   ├── layout.tsx
│   ├── page.tsx                           # 홈
│   ├── error.tsx
│   ├── not-found.tsx
│   └── globals.css
├── components/
│   ├── ui/                                # shadcn 기본
│   ├── leaderboard/
│   ├── match/
│   ├── bracket/
│   ├── auth/
│   └── season/
├── services/
│   ├── match.ts                           # recordMatch, listMatches
│   ├── ranking.ts                         # getLeaderboard, recalculate
│   ├── league.ts
│   ├── season.ts
│   └── bracket.ts
├── domain/
│   ├── elo.ts                             # computeElo (pure)
│   ├── auth-rules.ts                      # assertMembership
│   └── rating.ts                          # INITIAL_RATING, ELO_K
├── types/
│   └── domain.ts                          # 10 entity interfaces
├── lib/
│   ├── supabase/
│   │   ├── client.ts                      # Browser client
│   │   ├── server.ts                      # RSC / Server Action
│   │   ├── service.ts                     # service-role (bypass RLS)
│   │   └── middleware.ts                  # session refresh helper
│   ├── env.ts                             # typed env accessors
│   ├── session.ts                         # getSessionUser helper
│   ├── rate-limit.ts
│   └── utils.ts
└── hooks/
    ├── useSession.ts
    ├── useLeague.ts
    └── useLeaderboard.ts
```

### 11.2 Implementation Order (FR 매핑)

| # | Step | FR 매핑 | Acceptance |
|---|------|---------|------------|
| 1 | `domain/elo.ts` + Vitest | — | `computeElo(1500, 1500, 'a_win', 32) = ±16` |
| 2 | `types/domain.ts` 10개 인터페이스 | — | TS 컴파일 OK |
| 3 | Supabase 프로젝트 생성 + `supabase/schema.sql` 적용 | — | 10개 테이블 생성 확인 |
| 4 | RLS 정책 SQL 적용 (§3.3) | FR-02, FR-08 | 대시보드 Policies 탭 확인 |
| 5 | `lib/supabase/{client,server,service,middleware}.ts` | FR-01 | 환경변수 로드 + 세션 조회 작동 |
| 6 | `(auth)/login`, `(auth)/signup` + Server Actions | FR-01 | 이메일 가입 → Player 생성 |
| 7 | Google OAuth 추가 | FR-01 | `/login?provider=google` |
| 8 | `app/leagues/[slug]/leaderboard/page.tsx` (read-only) | FR-06 | 순위 표시 |
| 9 | `RecordMatchDialog` + `recordMatchAction` | FR-03, FR-04, FR-05 | 매니저만 입력, Elo 자동 업데이트 |
| 10 | 최근 경기 섹션 + `RecentMatches` | FR-05 | 최근 20건 표시 |
| 11 | 시즌 전환 (SeasonSwitcher) | FR-07 | 과거 시즌 리더보드 조회 |
| 12 | 내 경기 기록 (`/me/matches`) | FR-09 | 본인 경기 목록 |
| 13 | 브래킷 관리 (`/leagues/[slug]/brackets`) | FR-10 | 라운드/브래킷 CRUD |
| 14 | 참가 신청/확정 플로우 | FR-11 | applied → confirmed |
| 15 | 리그 설정 + 멤버 초대 | FR-02 | owner가 role 부여 |
| 16 | Error/Loading 상태 + Toaster | — | 모든 액션 피드백 |
| 17 | SEO (`metadata`, sitemap) + Security 점검 | NFR | Lighthouse ≥ 90 |
| 18 | Vercel 배포 | — | `https://boardgame-league.vercel.app` |

### 11.3 Milestones

- **M1 (이번 주)**: Steps 1-7 — 인증 + 기본 인프라 (로그인해서 빈 리그 페이지 도달)
- **M2 (다음 주)**: Steps 8-12 — 리더보드 + 매치 기록 (핵심 가치 제공)
- **M3**: Steps 13-15 — 브래킷 + 멤버십
- **M4**: Steps 16-18 — 마감, 배포

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-20 | Initial draft (Dynamic level, leaderboard-centric, 11 FR 매핑) | 안종태 |
