# Glossary (용어집)

> Phase 1 Deliverable: 프로젝트 전반에서 사용할 용어의 정의와 매핑.

**Project**: boardgame-league
**Date**: 2026-04-20
**Version**: 1.0

---

## 1. Business Terms (내부 용어)

| Term (코드) | Term (UI/한글) | Definition | Global Standard Mapping |
|-------------|----------------|------------|-------------------------|
| `Player` | 선수 | 리그에 참가하여 경기를 치르는 회원 | User, Member |
| `LeagueOwner` | 리그 운영자 | 리그를 생성·설정하고 경기결과를 관리하는 권한을 가진 선수 | Admin (scoped) |
| `League` | 리그 | 특정 보드게임(또는 혼합)을 대상으로 한 경기 그룹. 소유자/설정/시즌 집합을 가짐 | Group, Tournament Container |
| `Season` | 시즌 | 리그 내의 집계 단위(예: 2026 봄 시즌). 시작일·종료일·랭킹이 귀속됨 | Period, Cycle |
| `Game` | 게임 | 보드게임의 종류(예: Catan, Splendor). 리그에서 다루는 대상 | Game Type, Product |
| `Match` | 경기 | 두 선수가 특정 게임으로 1회 겨룬 결과 단위 | Game Session, Result |
| `Round` | 라운드 | 시즌 내에서 묶이는 경기 그룹. 대진표의 한 단위 | Stage |
| `Bracket` | 대진표 | 라운드 내 선수 간 대결 구성 | Schedule, Pairing |
| `RankingSnapshot` | 랭킹 스냅샷 | 특정 시점의 시즌 랭킹을 캐싱한 데이터. 성능·히스토리 용도 | Leaderboard Cache |
| `EloRating` | Elo 점수 | 선수의 상대적 실력 지표. 초기 1500, 승패에 따라 변동 | Elo Rating (FIDE formula) |
| `WinRate` | 승률 | (승 ÷ (승+무+패)) × 100 | Win Percentage |
| `MatchParticipation` | 경기 참가 신청 | 일정에 공개된 대진에 선수가 참가 의사를 밝힌 기록 | RSVP, Signup |

---

## 2. Global Standards (표준 용어)

| Term | Definition | Reference |
|------|------------|-----------|
| `JWT` | JSON Web Token — 인증 토큰 규격 | RFC 7519 |
| `UUID` | Universal Unique Identifier | RFC 4122 |
| `RBAC` | Role-Based Access Control | NIST |
| `RLS` | Row-Level Security (DB 행 단위 접근 제어) | PostgreSQL |
| `ISR` | Incremental Static Regeneration (Next.js 캐싱 전략) | Next.js Docs |
| `Server Action` | Next.js 서버 함수(폼 제출 등을 서버에서 바로 처리) | Next.js App Router |
| `Elo Rating System` | 체스에서 기원한 선수 실력 평가 방식 | Wikipedia |
| `K-factor` | Elo 계산 시 점수 변동 폭을 결정하는 계수 (일반 32, 상위 16) | Elo 규격 |

---

## 3. Term Mapping Table (코드 ↔ UI)

| Code (EN) | UI (KO) | Notes |
|-----------|---------|-------|
| `player` | 선수 | 코드에서 `user`와 혼용 금지. 프로덕트 용어는 `player`로 통일 |
| `league_owner` | 리그 운영자 | `admin`은 시스템 관리자용으로 예약 |
| `league` | 리그 | URL slug는 영문 kebab-case |
| `season` | 시즌 | `season_number`와 `name` 분리 |
| `game` | 게임 | 보드게임 종류. 선수 간 경기는 `match` |
| `match` | 경기 | `game_session`이라는 이름은 쓰지 않음 (혼동 방지) |
| `round` | 라운드 | |
| `bracket` | 대진표 | |
| `ranking` | 랭킹 | `leaderboard`는 UI 섹션명으로만 사용 |
| `rating` | 점수(Elo) | 숫자 변수명에선 `elo` 사용 권장 |

---

## 4. Term Usage Rules

1. **코드**: 영문 snake_case (DB) / camelCase (TS). `player_id` / `playerId`.
2. **UI / 문서**: 한글 용어 사용 (선수, 리그, 경기).
3. **API 응답**: `global standard` 우선 (`user_id`가 아니라 `player_id`, `match` 유지).
4. **금지 동의어**: `member`, `user` → `player`로 통일. `game_session`, `contest` → `match`로 통일. `score`는 Elo 점수가 아닌 "경기 내 점수"로만 사용.
5. **복수형 규칙**: DB 테이블은 복수(`players`, `matches`), TS 타입은 단수(`Player`, `Match`).

---

## 5. Claude / AI 자동 참조 설정

`CLAUDE.md`에 아래 문구를 추가하여 AI가 용어집을 자동 참조하도록 유도:

```markdown
## Term Reference

이 프로젝트의 용어 정의는 `docs/01-plan/glossary.md`를 따른다.
비즈니스 용어 사용 시 반드시 참조하고, 동의어(user vs player, game vs match 등)는
glossary의 금지 동의어 목록을 적용한다.
```

---

## 6. Open Questions (추후 결정)

- [ ] 한 경기에서 **무승부(draw)** 를 허용할지? → 허용 시 `Match.result` enum에 `draw` 포함
- [ ] **팀 매치** (2v2 등) 를 v2에서 도입할지? → 팀 엔티티 추가 여부
- [ ] Elo **K-factor** 를 리그별로 조정 가능하게 할지? → `League.elo_k` 컬럼 필요
