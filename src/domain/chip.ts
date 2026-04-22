/**
 * BGM 칩 계산 — 순수 함수 모음
 * 사이드 이펙트 없음. 외부 의존성 없음.
 *
 * BGM 운영 규칙 (2024):
 *   팀전     : 승 +1 / 패 -1
 *   마피아   : 마피아승 +2 / 시민승 +1 / 특수캐릭터승 +3 / 패배 감점없음
 *   1vs多    : 1인팀승 +2 / 1인팀패 -1 / 다인팀승 +1 / 다인팀패 -1
 *   데스매치 : 인당 3칩 베팅 → 승자가 전부 획득 (패자 -bet)
 *   협력     : MVP 최다득표자 +1
 *   순위게임 : 인원수별 차등 (+2/+1/0/-1/-2 ... 최상위→최하위)
 *   참석     : +1
 *   지각/불참: -1
 *   투표미참여: -1
 */

import type { GameType, MafiaRole, ParticipantInput } from '@/types/domain';

// ─────────────────────────────────────────────────────────
// Result types
// ─────────────────────────────────────────────────────────

export interface ChipResult {
  player_id: string;
  chip_change: number;
}

// ─────────────────────────────────────────────────────────
// 1. 팀전 (team)
// ─────────────────────────────────────────────────────────

/**
 * 팀전 칩 계산
 * @param participants is_winner: true/false 필수
 */
export function calcTeamChips(participants: ParticipantInput[]): ChipResult[] {
  return participants.map((p) => ({
    player_id: p.player_id,
    chip_change: p.is_winner ? 1 : -1,
  }));
}

// ─────────────────────────────────────────────────────────
// 2. 마피아 (mafia)
// ─────────────────────────────────────────────────────────

/**
 * 마피아 칩 계산
 * - 승리 시: mafia +2 / citizen +1 / special +3
 * - 패배 시: 0 (감점 없음)
 * @param participants role('mafia'|'citizen'|'special') + is_winner 필수
 */
export function calcMafiaChips(participants: ParticipantInput[]): ChipResult[] {
  const WIN_MAP: Record<MafiaRole, number> = {
    mafia: 2,
    citizen: 1,
    special: 3,
  };
  return participants.map((p) => {
    const role = p.role ?? 'citizen';
    const gain = p.is_winner ? (WIN_MAP[role] ?? 1) : 0;
    return { player_id: p.player_id, chip_change: gain };
  });
}

// ─────────────────────────────────────────────────────────
// 3. 1vs多 (onevsmany)
// ─────────────────────────────────────────────────────────

/**
 * 1vs多 칩 계산
 * - 1인팀 승 +2 / 패 -1
 * - 다인팀 승 +1 / 패 -1
 * @param participants team('solo'|'group') + is_winner 필수
 */
export function calcOneVsManyChips(participants: ParticipantInput[]): ChipResult[] {
  return participants.map((p) => {
    const isSolo = p.team === 'solo';
    let change: number;
    if (p.is_winner) {
      change = isSolo ? 2 : 1;
    } else {
      change = -1;
    }
    return { player_id: p.player_id, chip_change: change };
  });
}

// ─────────────────────────────────────────────────────────
// 4. 데스매치 (deathmatch)
// ─────────────────────────────────────────────────────────

/**
 * 데스매치 칩 계산
 * - 각자 bet 칩을 내놓고 승자가 전체 pot 획득
 * - 패자는 -bet
 * @param participants is_winner 필수 (1명만 true)
 * @param bet 인당 베팅 칩 수 (기본 3)
 */
export function calcDeathmatchChips(
  participants: ParticipantInput[],
  bet = 3
): ChipResult[] {
  const total = participants.length;
  const losers = participants.filter((p) => !p.is_winner);
  const winners = participants.filter((p) => p.is_winner);

  if (winners.length === 0) {
    // 승자 없음 — 전원 -bet
    return participants.map((p) => ({ player_id: p.player_id, chip_change: -bet }));
  }

  const pot = losers.length * bet;
  const winnerShare = Math.floor(pot / winners.length);

  return participants.map((p) => ({
    player_id: p.player_id,
    chip_change: p.is_winner ? winnerShare : -bet,
  }));
}

// ─────────────────────────────────────────────────────────
// 5. 협력게임 (coop)
// ─────────────────────────────────────────────────────────

/**
 * 협력게임 칩 계산
 * - MVP 최다득표자 +1 / 나머지 0
 * @param participants is_mvp: true인 사람만 +1
 */
export function calcCoopChips(participants: ParticipantInput[]): ChipResult[] {
  return participants.map((p) => ({
    player_id: p.player_id,
    chip_change: p.is_mvp ? 1 : 0,
  }));
}

// ─────────────────────────────────────────────────────────
// 6. 순위게임 (ranking)
// ─────────────────────────────────────────────────────────

/**
 * 순위게임 칩 테이블 — 인원수별
 * 중앙값 기준으로 위쪽은 +, 아래쪽은 -
 *
 * 예시:
 *   2명: [+1, -1]
 *   3명: [+1, 0, -1]
 *   4명: [+2, +1, -1, -2]
 *   5명: [+2, +1, 0, -1, -2]
 *   6명: [+2, +1, 0, -1, -2, -3] (하위권 더 감점)
 */
export function getRankingChipTable(playerCount: number): number[] {
  if (playerCount <= 0) return [];
  if (playerCount === 2) return [1, -1];
  if (playerCount === 3) return [1, 0, -1];
  if (playerCount === 4) return [2, 1, -1, -2];
  if (playerCount === 5) return [2, 1, 0, -1, -2];
  // 6명 이상: 상위 절반 양수, 하위 절반 음수
  const half = Math.floor(playerCount / 2);
  const table: number[] = [];
  for (let i = 0; i < playerCount; i++) {
    if (i < half) {
      table.push(half - i); // 1위: half, 2위: half-1, ...
    } else {
      table.push(-(i - half + 1)); // 중간 이후: -1, -2, ...
    }
  }
  return table;
}

/**
 * 순위게임 칩 계산
 * @param participants rank(1,2,...) 필수
 */
export function calcRankingChips(participants: ParticipantInput[]): ChipResult[] {
  const count = participants.length;
  const table = getRankingChipTable(count);

  return participants.map((p) => {
    const rank = p.rank ?? count; // rank 없으면 꼴찌 처리
    const idx = Math.max(0, Math.min(rank - 1, table.length - 1));
    return { player_id: p.player_id, chip_change: table[idx] };
  });
}

// ─────────────────────────────────────────────────────────
// 7. 출석 칩 (attendance)
// ─────────────────────────────────────────────────────────

/**
 * 출석 관련 칩 계산
 */
export const ATTENDANCE_CHIPS = {
  attended: 1,    // 참석 +1
  late: -1,       // 지각 -1
  absent: -1,     // 불참 -1
  vote_skip: -1,  // 투표 미참여 -1
} as const;

// ─────────────────────────────────────────────────────────
// 8. 통합 디스패처
// ─────────────────────────────────────────────────────────

/**
 * 게임 타입에 따라 올바른 칩 계산 함수를 실행
 */
export function calcChips(
  gameType: GameType,
  participants: ParticipantInput[],
  options?: { deathmatch_bet?: number }
): ChipResult[] {
  switch (gameType) {
    case 'team':
      return calcTeamChips(participants);
    case 'mafia':
      return calcMafiaChips(participants);
    case 'onevsmany':
      return calcOneVsManyChips(participants);
    case 'deathmatch':
      return calcDeathmatchChips(participants, options?.deathmatch_bet ?? 3);
    case 'coop':
      return calcCoopChips(participants);
    case 'ranking':
      return calcRankingChips(participants);
    default:
      throw new Error(`Unknown game type: ${gameType}`);
  }
}

// ─────────────────────────────────────────────────────────
// 9. 추첨 확률 계산
// ─────────────────────────────────────────────────────────

/**
 * 5회 모임마다 추첨 — 칩 비례 확률
 * @param balances { player_id, chips }[]
 * @returns 플레이어별 당첨 확률 (0~1)
 */
export function calcDrawProbabilities(
  balances: { player_id: string; chips: number }[]
): { player_id: string; probability: number }[] {
  const positiveBalances = balances.map((b) => ({
    player_id: b.player_id,
    chips: Math.max(0, b.chips),
  }));
  const totalChips = positiveBalances.reduce((sum, b) => sum + b.chips, 0);
  if (totalChips === 0) {
    const even = 1 / positiveBalances.length;
    return positiveBalances.map((b) => ({ player_id: b.player_id, probability: even }));
  }
  return positiveBalances.map((b) => ({
    player_id: b.player_id,
    probability: b.chips / totalChips,
  }));
}
