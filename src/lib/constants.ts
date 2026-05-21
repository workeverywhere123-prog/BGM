/** 게임 타입 — 레이블 */
export const GT_LABEL: Record<string, string> = {
  ranking: '순위전',
  mafia: '마피아',
  team: '팀전',
  coop: '협력',
  onevsmany: '1:다',
  deathmatch: '데스매치',
};

/** 게임 타입 — 색상 */
export const GT_COLOR: Record<string, string> = {
  ranking: '#c9a84c',
  mafia: '#e879f9',
  team: '#60a5fa',
  coop: '#34d399',
  onevsmany: '#f87171',
  deathmatch: '#fb923c',
};

/** 순위 1~3위 색상 (gold / silver / bronze) */
export const RANK_COLOR = ['var(--gold)', '#c8c8c8', '#a0732a'] as const;

/** 순위 1~3위 심볼 */
export const RANK_SYMBOL = ['✦', '②', '③'] as const;

/** 기본 조회 기간 (일) */
export const DEFAULT_LOOKBACK_DAYS = 90;
