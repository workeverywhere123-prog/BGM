/**
 * Elo rating calculation — pure functions only.
 * Domain layer: no side effects, no external deps (except pure constants).
 *
 * Formula:
 *   Expected(A) = 1 / (1 + 10^((Rb - Ra) / 400))
 *   NewRa = Ra + K * (Sa - Expected(A))
 *     where Sa = 1 (win), 0.5 (draw), 0 (loss)
 */

import { ELO_K_DEFAULT, ELO_FLOOR } from './rating';

export type MatchOutcome = 'a_win' | 'b_win' | 'draw';

export interface EloUpdate {
  new_rating_a: number;
  new_rating_b: number;
  elo_change_a: number; // signed delta for A
  elo_change_b: number; // signed delta for B (mirror of A in zero-sum)
}

/**
 * Expected score for player A given ratings.
 * Returns value in [0, 1].
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Convert outcome to A's score (Sa).
 */
function scoreFor(outcome: MatchOutcome): number {
  switch (outcome) {
    case 'a_win':
      return 1;
    case 'b_win':
      return 0;
    case 'draw':
      return 0.5;
  }
}

/**
 * Compute Elo update for a head-to-head match.
 *
 * @param ratingA - Player A's current rating
 * @param ratingB - Player B's current rating
 * @param outcome - 'a_win' | 'b_win' | 'draw'
 * @param k - K-factor (default 32). Must be > 0.
 * @returns new ratings + signed deltas. Ratings clamped at ELO_FLOOR.
 *
 * Invariants:
 * - Zero-sum: elo_change_a === -elo_change_b (rounded to integers)
 * - Draw between equal ratings: both deltas === 0
 * - Winner always gains or holds, loser always loses or holds (when outcome is decisive)
 */
export function computeElo(
  ratingA: number,
  ratingB: number,
  outcome: MatchOutcome,
  k: number = ELO_K_DEFAULT
): EloUpdate {
  if (k <= 0) {
    throw new Error('Elo K-factor must be > 0');
  }
  if (!Number.isFinite(ratingA) || !Number.isFinite(ratingB)) {
    throw new Error('Elo ratings must be finite numbers');
  }

  const expectedA = expectedScore(ratingA, ratingB);
  const scoreA = scoreFor(outcome);

  // Round to integer for stable DB storage and display.
  const rawDeltaA = k * (scoreA - expectedA);
  const delta_a = Math.round(rawDeltaA);
  const delta_b = -delta_a; // zero-sum after rounding

  const new_rating_a = Math.max(ELO_FLOOR, ratingA + delta_a);
  const new_rating_b = Math.max(ELO_FLOOR, ratingB + delta_b);

  return {
    new_rating_a,
    new_rating_b,
    elo_change_a: new_rating_a - ratingA,
    elo_change_b: new_rating_b - ratingB,
  };
}
