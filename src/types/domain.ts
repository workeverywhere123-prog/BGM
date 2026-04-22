/**
 * Domain entity types — BGM Chip System (M2)
 * No external dependencies. Safe for both client and server.
 */

// ─────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────

/** 게임 타입 (BGM 운영규칙 기반) */
export type GameType =
  | 'team'        // 팀전: A/B팀 대결
  | 'mafia'       // 마피아: 역할별 차등 칩
  | 'deathmatch'  // 데스매치: 인당 3칩 베팅 후 승자독식
  | 'onevsmany'   // 1vs多: 1인팀 vs 다인팀
  | 'coop'        // 협력게임: MVP 투표
  | 'ranking';    // 순위게임: 등수별 차등 칩

/** 마피아 역할 */
export type MafiaRole = 'mafia' | 'citizen' | 'special';

/** 모임 출석 상태 */
export type AttendanceStatus = 'attended' | 'late' | 'absent';

/** 모임/시즌 상태 */
export type MeetingStatus = 'upcoming' | 'active' | 'closed';

/** 칩 트랜잭션 유형 */
export type ChipTxType =
  | 'game'        // 경기 결과 칩
  | 'attendance'  // 참석 +1
  | 'late'        // 지각 -1
  | 'absence'     // 불참 -1
  | 'vote_skip'   // 투표 미참여 -1
  | 'draw_use'    // 추첨 참여 칩 사용 (음수)
  | 'draw_win'    // 추첨 당첨 (양수)
  | 'manual';     // 운영진 수동 조정

/** 리그 역할 */
export type LeagueRole = 'owner' | 'manager' | 'player';

// ─────────────────────────────────────────────────────────
// Shared audit fields
// ─────────────────────────────────────────────────────────

export interface AuditFields {
  created_at: string;
  updated_at?: string;
}

// ─────────────────────────────────────────────────────────
// Core Entities
// ─────────────────────────────────────────────────────────

/** 플레이어 — BGM 회원 */
export interface Player extends AuditFields {
  id: string;
  username: string;   // 로그인 아이디 (영문/숫자/_/-)
  email: string;      // 내부용: username@bgm.local
  nickname: string;   // 표시 이름
  avatar_url?: string;
  bio?: string;
  is_active: boolean;
}

/** 리그 — BGM 모임 컨테이너 */
export interface League extends AuditFields {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  default_game_id?: string;
  is_public: boolean;
}

/** 리그 멤버십 */
export interface LeagueMembership {
  id: string;
  league_id: string;
  player_id: string;
  role: LeagueRole;
  joined_at: string;
}

/** 게임 타이틀 (보드게임 목록) */
export interface Game {
  id: string;
  name: string;
  min_players: number;
  max_players: number;
  supports_draw: boolean;
}

// ─────────────────────────────────────────────────────────
// Chip System Entities (M2)
// ─────────────────────────────────────────────────────────

/** 모임 — BGM 정기 모임 회차 */
export interface Meeting extends AuditFields {
  id: string;
  league_id: string;
  number: number;     // 1회, 2회, ...
  held_at: string;
  status: MeetingStatus;
  note?: string;
}

/** 경기 — 한 모임 내 단일 게임 세션 */
export interface Match extends AuditFields {
  id: string;
  meeting_id: string;
  game_id?: string;
  game_type: GameType;
  played_at: string;
  note?: string;
  created_by: string;
}

/** 경기 참여자 — 플레이어별 결과 */
export interface MatchParticipant {
  id: string;
  match_id: string;
  player_id: string;
  team?: string;         // 'A'|'B'|'solo'|'group'
  rank?: number;         // 순위게임: 1,2,3,...
  role?: MafiaRole;      // 마피아 역할
  is_winner?: boolean;
  is_mvp: boolean;
  chip_change: number;   // 이 경기에서 획득/차감 칩
}

/** 출석 기록 — 모임별 플레이어 출석 + 투표 여부 */
export interface MeetingAttendance {
  id: string;
  meeting_id: string;
  player_id: string;
  status: AttendanceStatus;
  voted: boolean;
}

/** 칩 트랜잭션 — 모든 칩 이동의 단일 소스 */
export interface ChipTransaction {
  id: string;
  player_id: string;
  meeting_id?: string;
  match_id?: string;
  tx_type: ChipTxType;
  amount: number;        // 양수: 획득, 음수: 차감
  note?: string;
  created_by?: string;
  created_at: string;
}

/** 플레이어 칩 잔고 (DB 뷰) */
export interface PlayerChipTotal {
  player_id: string;
  total_chips: number;
  total_gains: number;
  total_losses: number;
}

// ─────────────────────────────────────────────────────────
// View / Derived types
// ─────────────────────────────────────────────────────────

/** 리더보드용 플레이어 요약 */
export interface LeaderboardEntry {
  player_id: string;
  username: string;
  nickname: string;
  avatar_url?: string;
  total_chips: number;
  rank: number;
}

/** 경기 기록 폼에서 사용하는 참여자 입력 */
export interface ParticipantInput {
  player_id: string;
  team?: string;
  rank?: number;
  role?: MafiaRole;
  is_winner?: boolean;
  is_mvp?: boolean;
}

/** 경기 기록 폼 전체 입력 */
export interface RecordMatchInput {
  meeting_id: string;
  game_id?: string;
  game_type: GameType;
  note?: string;
  participants: ParticipantInput[];
  /** 데스매치 전용: 인당 베팅 칩 수 (기본 3) */
  deathmatch_bet?: number;
}

// ─────────────────────────────────────────────────────────
// Server Action result wrapper
// ─────────────────────────────────────────────────────────

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CHIP_TX_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface ActionError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };
