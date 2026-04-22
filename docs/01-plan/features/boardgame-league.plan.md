# boardgame-league Planning Document

> **Summary**: 보드게임 리그의 선수·경기·랭킹·일정을 한 곳에서 관리하는 리더보드 중심 웹 서비스.
>
> **Project**: boardgame-league
> **Version**: 0.1.0
> **Author**: 안종태
> **Date**: 2026-04-20
> **Status**: Draft
>
> **⚠️ Stack pivot 2026-04-20**: 이 Plan 문서는 Plan 단계 스냅샷으로 BaaS를 **bkend.ai**로 선택했으나, Do 단계에서 **Supabase**로 교체됨. 최신 구현 결정은 `docs/02-design/features/boardgame-league.design.md` 를 참조. BaaS 종류 외 모든 결정(레벨=Dynamic, Elo K=32, 리더보드 중심 UX 등)은 그대로 유효.

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 보드게임 리그는 현재 스프레드시트·단톡방·수기 장부로 흩어져 관리돼 승패 기록 유실, 랭킹 집계 지연, 일정 혼선이 발생한다. |
| **Solution** | Next.js(App Router) + bkend.ai(BaaS) 기반의 리더보드 중심 웹 앱에서 회원·경기결과·랭킹·일정을 한 번에 관리한다. |
| **Function/UX Effect** | 메인에서 바로 TOP 5 랭킹을 보고, 로그인 1회로 경기결과 입력·일정 확인·대진표까지 이동 가능하다. 집계는 서버에서 자동 계산된다. |
| **Core Value** | "리그 운영자가 엑셀을 닫고, 선수가 링크 하나로 내 순위를 확인한다." — 운영 부담 제거 + 선수 몰입감 강화. |

---

## 1. Overview

### 1.1 Purpose

보드게임 리그를 운영하는 소규모 커뮤니티(동호회·사내 동아리·카페 모임)가 리그 진행을 체계적으로 관리하고, 선수들은 자신의 순위와 전적을 실시간으로 확인할 수 있는 웹 서비스를 구축한다.

### 1.2 Background

보드게임 리그 운영자는 일반적으로 구글 스프레드시트, 카카오톡 단톡방, 수기 메모장을 병행한다. 이로 인해:

- 경기 결과가 유실되거나 중복 입력됨
- 승점/Elo 계산이 수동이라 시즌 후반부로 갈수록 지연
- 다음 경기 일정과 대진 공지가 채널마다 달라 선수들이 혼란
- 시즌 종료 후 "누가 몇 승 몇 패였는지" 확인이 어려움

리그 전용 웹 서비스가 있다면 이 작업이 **링크 하나 공유 → 자동 집계**로 바뀐다.

### 1.3 Related Documents

- Requirements: 사용자 답변 기반 (회원가입/로그인, 경기결과, 랭킹, 일정/대진표 — multiSelect)
- References:
  - Next.js App Router docs (https://nextjs.org/docs/app)
  - bkend.ai BaaS docs (https://bkend.ai/docs)
  - Elo Rating System (https://en.wikipedia.org/wiki/Elo_rating_system)

---

## 2. Scope

### 2.1 In Scope (v1.0)

- [ ] 회원가입/로그인 (이메일 + 비밀번호, 추후 소셜 로그인 확장 여지)
- [ ] 선수 프로필 (닉네임, 가입일, 소속 리그)
- [ ] 리그 생성 및 설정 (리그 이름, 시즌, 대상 게임)
- [ ] 경기 결과 입력 (승자/패자/스코어/날짜/메모)
- [ ] 랭킹/리더보드 계산 (승률 + Elo 기본 제공, 메인 화면 TOP 5)
- [ ] 일정 및 대진표 관리 (라운드별 대진, 참가 신청)
- [ ] 전적 히스토리 조회 (본인/타 선수)
- [ ] 리더보드 중심 메인 페이지 (비로그인 접근 가능, 로그인 시 개인화)

### 2.2 Out of Scope (v1.0 이후)

- 토너먼트 자동 대진 생성 (싱글 일리미네이션/더블 일리미네이션 알고리즘)
- 팀 리그 / 복수 인원 매치 (3인 이상 동시 플레이)
- 실시간 채팅·댓글
- 결제·유료 리그 운영
- 모바일 네이티브 앱 (웹 우선, PWA는 v1.1 검토)
- 소셜 로그인 (Google, Kakao) — v1.1에서 bkend-auth로 확장 예정
- 푸시 알림 / 이메일 알림

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 이메일/비밀번호 회원가입 및 로그인, 로그아웃 | High | Pending |
| FR-02 | 리그 생성자(운영자) 권한과 일반 선수 권한 분리 (RBAC) | High | Pending |
| FR-03 | 경기 결과 입력: 승자, 패자, 스코어, 날짜, 게임명 | High | Pending |
| FR-04 | 랭킹 자동 계산: 승률 및 Elo 점수 (초기 1500점) | High | Pending |
| FR-05 | 메인 페이지에 현재 시즌 TOP 5 리더보드 표시 (비로그인 접근) | High | Pending |
| FR-06 | 전체 리더보드 페이지 (페이지네이션, 정렬) | High | Pending |
| FR-07 | 선수 프로필 페이지 (전적, 최근 경기, Elo 변동 그래프) | Medium | Pending |
| FR-08 | 리그 일정/대진표 생성 및 조회 | Medium | Pending |
| FR-09 | 경기 참가 신청/확정 기능 | Medium | Pending |
| FR-10 | 경기 결과 수정/삭제 (운영자 전용) | Medium | Pending |
| FR-11 | 반응형 UI (모바일 우선) | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 리더보드 첫 페인트 < 2s (Fast 3G 기준) | Lighthouse, Vercel Analytics |
| Performance | API 응답 p95 < 500ms | bkend.ai 대시보드 |
| Security | OWASP Top 10 주요 항목(A01 액세스 제어, A02 암호화 실패, A03 인젝션) 대응 | bkend-auth의 JWT+RLS 사용, 수동 체크리스트 |
| Accessibility | 키보드 탐색 가능, alt/aria 속성, 명도 대비 AA | axe DevTools, 수동 검사 |
| SEO | 리더보드·선수 프로필 메타 태그, OG 이미지 | Lighthouse SEO 90+ |
| Availability | Vercel 무료 플랜 가용성 기준 (월 99%+) | Vercel Status |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01 ~ FR-06 (v1.0 필수) 구현 완료
- [ ] FR-07 ~ FR-11 (v1.0 확장) 구현 완료
- [ ] Gap Analysis Match Rate ≥ 90%
- [ ] Zero Script QA 또는 수동 체크리스트 통과
- [ ] Vercel 배포 후 공개 URL에서 Welcome→Login→경기 입력→리더보드 갱신 전 구간 동작 확인
- [ ] README.md에 로컬 실행/배포 방법 정리

### 4.2 Quality Criteria

- [ ] `npm run build` 에러 0
- [ ] `npm run lint` 에러 0 (warnings 허용)
- [ ] 주요 페이지 Lighthouse Performance ≥ 85, Accessibility ≥ 90, SEO ≥ 90
- [ ] 필수 경로(로그인, 경기입력, 리더보드) 수동 회귀 테스트 통과

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Elo 계산 로직 버그로 랭킹이 왜곡됨 | High | Medium | 순수 함수로 분리(`lib/ranking/elo.ts`) + 단위 테스트. 과거 경기 결과 재계산(recompute) 기능을 관리자 화면에 두어 복구 가능. |
| 운영자 권한 탈취로 경기결과 조작 | High | Low | bkend-auth RBAC + RLS로 리그별 owner만 수정 가능. 감사 로그(audit log) 테이블 기록. |
| bkend.ai 장애 시 전체 서비스 다운 | High | Low | 읽기 전용 리더보드는 Next.js ISR(revalidate)로 캐싱, 짧은 장애 흡수. 장애 대비 공지 배너 기능. |
| 초기 데이터 부족(콜드 스타트)으로 리더보드가 비어 보임 | Medium | High | 리그 생성자가 "지난 경기 일괄 입력" 폼으로 과거 결과 벌크 입력 가능. 초기엔 샘플 데이터 안내. |
| 개인 프로젝트라 시간 부족으로 기능 미완 | Medium | High | v1.0 필수(FR-01~06)만 Must, 나머지는 Nice-to-have로 분리. PDCA 반복으로 점진 출시. |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios, landing pages | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration (bkend.ai) | Web apps with backend, SaaS MVPs, fullstack apps | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems, complex architectures | ☐ |

**선택 이유**: 로그인·DB·RBAC가 필수이지만 사내 운영 규모(수십~수백 명)이므로 마이크로서비스는 과잉. bkend.ai BaaS + Next.js 조합이 개발 속도/운영 부담 모두에서 최적.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js / React SPA / Remix | **Next.js 15 (App Router)** | 서버 컴포넌트로 리더보드 SSR, ISR 캐싱으로 성능·SEO 동시 확보. 이미 scaffold 완료. |
| Language | TypeScript / JavaScript | **TypeScript (strict)** | 경기 결과·Elo 로직에서 타입 안전성 중요. 이미 설정됨. |
| State Management | Context / Zustand / Redux / Jotai | **Zustand (클라 전역) + Server Actions (서버 상태)** | Redux는 과잉. Zustand는 가볍고 Next.js App Router와 궁합 좋음. |
| API Client | fetch / axios / react-query | **Next.js Server Actions + TanStack Query(클라 전용)** | Server Actions로 mutation 단순화, 클라 측 캐싱/낙관적 업데이트는 TanStack Query. |
| Form Handling | react-hook-form / formik / native | **react-hook-form + zod** | 경기 결과 입력 폼 검증에 최적. |
| Styling | Tailwind / CSS Modules / styled-components | **Tailwind CSS** | 이미 설정됨, 빠른 프로토타이핑. 추후 shadcn/ui 도입 검토. |
| Testing | Jest / Vitest / Playwright | **Vitest (유닛) + 수동 회귀** | Elo/랭킹 로직 유닛 테스트 필수. E2E는 v1.1에서. |
| Backend | BaaS (bkend.ai) / Custom Server / Serverless | **bkend.ai BaaS** | Dynamic 레벨 권장. Auth·DB·Storage 한 번에, MCP 통합으로 스키마 정의가 빠름. |
| Deployment | Vercel / Netlify / Self-hosted | **Vercel (무료 hobby)** | Next.js 최적 배포. PR 프리뷰·Analytics 기본 제공. |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

Folder Structure Preview:
┌─────────────────────────────────────────────────────┐
│ src/                                                │
│   app/                                              │
│     page.tsx                    # 메인 (리더보드)    │
│     (auth)/login, signup        # 인증 라우트       │
│     leagues/[id]/               # 리그 상세/대진표   │
│     matches/new                 # 경기 입력         │
│     players/[id]/               # 선수 프로필        │
│     api/                        # Server Actions 보조│
│   components/                   # 공용 UI           │
│   features/                                         │
│     auth/                       # 로그인/가입 기능   │
│     matches/                    # 경기 도메인        │
│     ranking/                    # Elo/승률 로직     │
│     schedule/                   # 일정/대진표       │
│   services/                                         │
│     bkend/                      # bkend.ai 클라이언트│
│   lib/                                              │
│     ranking/elo.ts              # 순수 Elo 함수     │
│   types/                                            │
│   .mcp.json                     # bkend MCP 설정    │
└─────────────────────────────────────────────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] TypeScript configuration (`tsconfig.json`) — strict 모드 활성
- [x] ESLint configuration (`eslint.config.mjs`) — next/core-web-vitals + next/typescript
- [ ] `CLAUDE.md` has coding conventions section — **생성 예정**
- [ ] `docs/01-plan/conventions.md` (Phase 2 output) — **생성 예정**
- [ ] Prettier configuration (`.prettierrc`) — **추가 권장 (Phase 2)**

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | missing | 파일 kebab-case, 컴포넌트 PascalCase, 훅 `use-` prefix | High |
| **Folder structure** | basic (src/app only) | features/, services/, lib/ 추가 (6.3 참조) | High |
| **Import order** | missing | (1) react/next (2) 외부 (3) `@/features` (4) `@/lib` (5) 상대경로 | Medium |
| **Environment variables** | missing | `.env.example` 작성, `NEXT_PUBLIC_*` 구분 | High |
| **Error handling** | missing | Server Action 에러는 Result 타입으로 반환, UI는 toast | Medium |
| **Commit message** | missing | Conventional Commits (feat/fix/docs/chore) | Low |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `NEXT_PUBLIC_BKEND_PROJECT_URL` | bkend.ai 프로젝트 엔드포인트 | Client | ☑ |
| `NEXT_PUBLIC_BKEND_ANON_KEY` | bkend.ai 익명 키 (RLS로 보호된 읽기) | Client | ☑ |
| `BKEND_SERVICE_ROLE_KEY` | 서버 전용, 관리자 작업 | Server | ☑ |
| `AUTH_SECRET` | NextAuth/세션 서명용 (bkend 세션과 별도로 필요 시) | Server | ☐ |
| `NEXT_PUBLIC_APP_URL` | OG 이미지·링크 생성용 | Client | ☑ |

### 7.4 Pipeline Integration

| Phase | Status | Document Location | Command |
|-------|:------:|-------------------|---------|
| Phase 1 (Schema) | ☐ | `docs/01-plan/schema.md` | `/phase-1-schema` |
| Phase 2 (Convention) | ☐ | `docs/01-plan/conventions.md` | `/phase-2-convention` |

**Quick Start:**
Design 단계로 넘어가기 전에 선수(User), 리그(League), 경기(Match), 시즌(Season), 랭킹 스냅샷(RankingSnapshot) 엔티티를 `schema.md`로 먼저 정리하는 것을 권장.

---

## 8. Next Steps

1. [ ] **(권장)** `/phase-1-schema` — 선수·리그·경기·시즌·랭킹 스키마 정의
2. [ ] `/pdca design boardgame-league` — 리더보드/로그인/경기입력 화면 및 API 설계
3. [ ] bkend.ai 프로젝트 생성 및 `.mcp.json` 연결 (`/dynamic init` 또는 `bkend-quickstart`)
4. [ ] `/pdca do boardgame-league` — 구현 시작 (FR-01 ~ FR-06 우선)
5. [ ] `/pdca analyze boardgame-league` — Gap 분석
6. [ ] Vercel 배포 및 공개

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-20 | Initial draft (사용자 인터뷰 답변 반영: Dynamic, 리더보드 중심, 4대 기능) | 안종태 |
