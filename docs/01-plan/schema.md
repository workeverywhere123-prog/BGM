# Schema Definition

> Phase 1 Deliverable: 보드게임 리그 관리 시스템의 데이터 구조 정의.

**Project**: boardgame-league
**Date**: 2026-04-20
**Version**: 1.0

> **⚠️ Stack pivot 2026-04-20**: BaaS가 bkend.ai → **Supabase**로 변경됨. 엔티티/속성/관계 정의는 100% 유효(스키마는 스토리지 중립). 단 "Collection/MongoDB" 표현은 "Table/Postgres"로 읽으세요. RLS 정책 SQL 형태는 design.md §3.3 참조.

---

## 1. Terminology Definition

> 상세 정의는 [glossary.md](./glossary.md) 참조.

| Term | Definition | Original Term | Notes |
|------|------------|---------------|-------|
| Player | 리그 참가 선수 | user / member | 계정 엔티티이자 선수 프로필 |
| League | 보드게임 리그 그룹 | group | 시즌의 상위 컨테이너 |
| Season | 리그 내 집계 단위 | period | 랭킹은 시즌별로 리셋 |
| Game | 보드게임 종류 | game type | 카탄, 스플렌더 등 |
| Match | 경기 1회 기록 | result | 승자/패자/스코어 |
| Round | 라운드 | stage | 대진표 단위 |
| Bracket | 대진표 | pairing | 라운드 내 선수 매칭 |
| RankingSnapshot | 시즌 랭킹 스냅샷 | leaderboard cache | 성능/히스토리용 |

---

## 2. Entity List

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| `Player` | 선수(회원) | id, email, nickname, created_at |
| `League` | 리그 | id, name, slug, owner_id, default_game_id, elo_k |
| `LeagueMembership` | 리그-선수 연결(다대다) | league_id, player_id, role |
| `Season` | 시즌 | id, league_id, name, started_at, ended_at, status |
| `Game` | 보드게임 종류 | id, name, min_players, max_players |
| `Match` | 경기 결과 | id, season_id, game_id, played_at, winner_id, loser_id, winner_score, loser_score, result |
| `MatchParticipation` | 경기 참가 신청 | id, bracket_id, player_id, status |
| `Round` | 라운드 | id, season_id, number, started_at, ended_at |
| `Bracket` | 대진표 (예정 경기) | id, round_id, player_a_id, player_b_id, scheduled_at, match_id (nullable) |
| `RankingSnapshot` | 랭킹 스냅샷 | id, season_id, player_id, rank, wins, losses, draws, elo, win_rate, snapshot_at |

---

## 3. Entity Details

### 3.1 Player

**Description**: 인증 주체이자 리그에 참가하는 선수. bkend-auth의 User를 1:1 확장.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | uuid | Y | 선수 식별자 (bkend-auth User와 동일 값) |
| `email` | string | Y | 이메일 (로그인용, unique) |
| `nickname` | string(30) | Y | 표시 이름 (unique) |
| `avatar_url` | string | N | 프로필 이미지 URL |
| `bio` | text | N | 한 줄 소개 |
| `created_at` | timestamp | Y | 가입일 |
| `updated_at` | timestamp | Y | 최종 수정일 |
| `is_active` | boolean | Y | 계정 활성 여부 (기본 true) |

**Relationships**:
- 1:N → `LeagueMembership` (여러 리그에 가입 가능)
- 1:N → `Match` (winner_id / loser_id)
- 1:N → `MatchParticipation` (참가 신청)
- 1:N → `RankingSnapshot` (시즌별 내 랭킹 이력)

**Constraints**:
- `email` UNIQUE, NOT NULL
- `nickname` UNIQUE, NOT NULL, 2~30자
- RLS: 본인 행만 UPDATE 가능, 나머지는 SELECT 허용 (공개 프로필)

---

### 3.2 League

**Description**: 보드게임 리그 단위. 1명의 운영자(owner)가 생성하고 설정을 관리.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | uuid | Y | 리그 식별자 |
| `name` | string(60) | Y | 리그 이름 |
| `slug` | string(60) | Y | URL 용 슬러그 (unique, kebab-case) |
| `description` | text | N | 리그 소개 |
| `owner_id` | uuid → Player.id | Y | 리그 운영자 |
| `default_game_id` | uuid → Game.id | N | 기본 게임 (혼합 리그면 null) |
| `elo_k` | int | Y | Elo K-factor (기본 32) |
| `is_public` | boolean | Y | 공개 여부 (기본 true) |
| `created_at` | timestamp | Y | 생성일 |
| `updated_at` | timestamp | Y | 수정일 |

**Relationships**:
- N:1 → `Player` (owner)
- 1:N → `Season`
- 1:N → `LeagueMembership`

**Constraints**:
- `slug` UNIQUE
- `elo_k` CHECK (16~64)
- RLS: SELECT는 is_public=true이면 전체, 아니면 membership 보유자. UPDATE는 owner만.

---

### 3.3 LeagueMembership

**Description**: 선수와 리그의 다대다 관계 + 역할.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | uuid | Y | |
| `league_id` | uuid → League.id | Y | |
| `player_id` | uuid → Player.id | Y | |
| `role` | enum | Y | `owner` / `manager` / `player` |
| `joined_at` | timestamp | Y | 가입일 |

**Constraints**:
- UNIQUE(`league_id`, `player_id`)
- `role` CHECK IN ('owner', 'manager', 'player')
- `owner`는 리그당 1명 (트리거로 강제)

---

### 3.4 Season

**Description**: 리그 내 집계 단위. 랭킹은 시즌별로 독립.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | uuid | Y | |
| `league_id` | uuid → League.id | Y | |
| `name` | string(60) | Y | 예: "2026 봄 시즌" |
| `number` | int | Y | 1, 2, 3... |
| `started_at` | date | Y | |
| `ended_at` | date | N | 진행 중이면 null |
| `status` | enum | Y | `upcoming` / `active` / `closed` |
| `created_at` | timestamp | Y | |

**Constraints**:
- UNIQUE(`league_id`, `number`)
- `ended_at` > `started_at`
- 동일 리그 내 `active` 시즌은 1개만 (트리거)

---

### 3.5 Game

**Description**: 보드게임 종류 마스터 데이터.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | uuid | Y | |
| `name` | string(60) | Y | 예: "Catan" |
| `min_players` | int | Y | 최소 인원 (기본 2) |
| `max_players` | int | Y | 최대 인원 |
| `supports_draw` | boolean | Y | 무승부 허용 여부 (기본 false) |
| `icon_url` | string | N | |

**Constraints**:
- `name` UNIQUE
- `max_players >= min_players`
- v1에서는 운영자가 수동 등록. 향후 BGG API 연동 고려.

---

### 3.6 Match

**Description**: 실제 치러진 경기 결과 1건. 랭킹 계산의 원천 데이터.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | uuid | Y | |
| `season_id` | uuid → Season.id | Y | |
| `game_id` | uuid → Game.id | Y | |
| `played_at` | timestamp | Y | 경기 진행 시각 |
| `winner_id` | uuid → Player.id | N | 무승부면 null |
| `loser_id` | uuid → Player.id | N | 무승부면 null |
| `player_a_id` | uuid → Player.id | Y | 선수 A (무승부 케이스 대비) |
| `player_b_id` | uuid → Player.id | Y | 선수 B |
| `player_a_score` | int | N | 경기 내 점수(게임별 상이) |
| `player_b_score` | int | N | |
| `result` | enum | Y | `a_win` / `b_win` / `draw` |
| `elo_change_a` | int | N | 이 경기로 인한 A의 Elo 변화 |
| `elo_change_b` | int | N | |
| `memo` | text | N | 비고 |
| `recorded_by` | uuid → Player.id | Y | 입력자 |
| `created_at` | timestamp | Y | |
| `updated_at` | timestamp | Y | |

**Relationships**:
- N:1 → `Season`, `Game`
- N:1 → `Player` (A, B, winner, loser, recorded_by)
- 1:1 ← `Bracket` (옵션: 예정 대진을 Match로 확정)

**Constraints**:
- `player_a_id != player_b_id`
- `result` = 'a_win' → `winner_id = player_a_id, loser_id = player_b_id`
- `result` = 'draw'이면 `winner_id, loser_id` 모두 null, `game.supports_draw` 필수
- Index: (`season_id`, `played_at DESC`), (`player_a_id`), (`player_b_id`)
- RLS: SELECT는 리그 공개 여부에 따름, INSERT/UPDATE는 리그 manager+ 또는 본인 기록

---

### 3.7 Round

**Description**: 시즌 내 대진 묶음 단위(예: 1라운드, 2라운드). 리그 운영자 재량.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | uuid | Y | |
| `season_id` | uuid → Season.id | Y | |
| `number` | int | Y | 1부터 |
| `name` | string | N | "결승 라운드" 등 표시용 |
| `started_at` | date | N | |
| `ended_at` | date | N | |

**Constraints**:
- UNIQUE(`season_id`, `number`)

---

### 3.8 Bracket

**Description**: 예정된 대진 (아직 경기 전 또는 경기 후 연결된 Match).

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | uuid | Y | |
| `round_id` | uuid → Round.id | Y | |
| `player_a_id` | uuid → Player.id | N | 참가 확정 시 |
| `player_b_id` | uuid → Player.id | N | |
| `scheduled_at` | timestamp | N | 예정 시각 |
| `status` | enum | Y | `open` / `scheduled` / `played` / `cancelled` |
| `match_id` | uuid → Match.id | N | 경기 완료 시 연결 |

**Constraints**:
- `status='played'` → `match_id` 필수
- `player_a_id != player_b_id`

---

### 3.9 MatchParticipation

**Description**: 일정(Bracket)에 선수가 참가 의사를 표시한 기록.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | uuid | Y | |
| `bracket_id` | uuid → Bracket.id | Y | |
| `player_id` | uuid → Player.id | Y | |
| `status` | enum | Y | `applied` / `confirmed` / `declined` |
| `applied_at` | timestamp | Y | |

**Constraints**:
- UNIQUE(`bracket_id`, `player_id`)

---

### 3.10 RankingSnapshot

**Description**: 시즌 랭킹 계산 결과를 캐시. Match 입력 시 트리거 또는 서버 액션으로 재계산.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `id` | uuid | Y | |
| `season_id` | uuid → Season.id | Y | |
| `player_id` | uuid → Player.id | Y | |
| `rank` | int | Y | 현재 순위 (1부터) |
| `wins` | int | Y | 승 (기본 0) |
| `losses` | int | Y | 패 |
| `draws` | int | Y | 무 |
| `elo` | int | Y | 현재 Elo (기본 1500) |
| `win_rate` | numeric(5,2) | Y | 승률(%) |
| `snapshot_at` | timestamp | Y | 집계 시각 |

**Constraints**:
- UNIQUE(`season_id`, `player_id`) — 시즌별 선수당 1행
- Index: (`season_id`, `elo DESC`), (`season_id`, `win_rate DESC`)
- **갱신 방식**: Match insert/update 시 Server Action에서 재계산하여 upsert.

---

## 4. Entity Relationship Diagram

```
 ┌──────────┐       ┌───────────────────┐       ┌──────────┐
 │  Player  │ 1───N │ LeagueMembership  │ N───1 │  League  │
 └────┬─────┘       └───────────────────┘       └────┬─────┘
      │                                              │
      │                                         1    │
      │                                              ▼
      │                                         ┌──────────┐
      │                                         │  Season  │
      │                                         └────┬─────┘
      │                                              │
      │                                         1    │   N
      │              ┌───────────────────┐           ▼
      │         N    │       Match       │   N ┌──────────┐
      ├──────────────┤ (player_a/b,      │─────│   Game   │
      │  (winner,    │  winner,          │     └──────────┘
      │   loser,     │  loser,           │
      │   player_a,  │  result, elo_*)   │           ▲
      │   player_b,  └────────┬──────────┘           │
      │   recorded_by)        │ 1                    │ (game_id)
      │                       │                      │
      │                       │ 0..1                 │
      │                       ▼                      │
      │                ┌───────────┐                 │
      │           ┌────│  Bracket  │─── N ──┐        │
      │           │    └─────┬─────┘        │        │
      │           │ N        │ N            │        │
      │           ▼          ▼              │        │
      │      ┌───────────┐ ┌────────────┐   │        │
      │      │   Round   │ │MatchPartic.│   │        │
      │      └─────┬─────┘ └─────┬──────┘   │        │
      │            │ N           │ N        │        │
      │            └─────── Season ────────────── (season_id)
      │
      │     ┌─────────────────────┐
      └── N │  RankingSnapshot    │ N ── Season
            │ (elo, rank, wins…)  │
            └─────────────────────┘
```

**요약**
- 선수(`Player`) ↔ 리그(`League`)는 `LeagueMembership`으로 다대다.
- `League` → `Season` → `Round` → `Bracket`으로 계층 구성, 대진표는 `Match`로 실현됨.
- `Match`가 유일한 사실 원천(Source of Truth), 랭킹은 `RankingSnapshot`으로 캐싱.

---

## 5. Validation Checklist

- [x] 핵심 엔티티 10개 정의 (Player, League, LeagueMembership, Season, Game, Match, Round, Bracket, MatchParticipation, RankingSnapshot)
- [x] 용어 일관성 확보 (player/match/game 통일, glossary 참조)
- [x] 1:N / N:1 / 다대다(LeagueMembership, MatchParticipation) 관계 명시
- [x] RLS / 권한 정책 요약 표기 (Player, League, Match)
- [x] 인덱스·유니크 제약 초안
- [x] Elo 저장 경로 정의 (Match.elo_change_*, RankingSnapshot.elo)
- [x] 무승부(draw) 지원 설계 (Match.result, Game.supports_draw)
- [ ] **Open**: 팀 매치(2v2) 지원 시점 결정 — v2로 보류
- [ ] **Open**: BGG(BoardGameGeek) 게임 마스터 연동 여부 — v1.1 검토

---

## 6. Next Steps

1. [ ] Phase 2: 코딩 컨벤션 정의 (`docs/01-plan/conventions.md`) — `/phase-2-convention`
2. [ ] `/pdca design boardgame-league` — 화면/컴포넌트/Server Action 설계
3. [ ] bkend.ai 프로젝트 생성 후 본 스키마를 테이블로 매핑 (`/dynamic init` + bkend-data 스킬)
4. [ ] Elo 계산 순수 함수 스펙 확정 (`src/lib/ranking/elo.ts`) — Design 단계에서 의사코드
