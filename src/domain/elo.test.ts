/**
 * Unit tests for Elo calculation.
 * Pure tests — no external dependencies, runs with `npm run test`.
 */

import { describe, it, expect } from 'vitest';
import { computeElo, expectedScore } from './elo';
import { INITIAL_RATING, ELO_K_DEFAULT } from './rating';

describe('expectedScore', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 5);
  });

  it('returns ~0.76 when A is 200 higher (classic Elo benchmark)', () => {
    // From FIDE tables: 200 diff ≈ 0.76 expected score
    expect(expectedScore(1700, 1500)).toBeCloseTo(0.76, 2);
  });

  it('returns ~0.24 when A is 200 lower', () => {
    expect(expectedScore(1500, 1700)).toBeCloseTo(0.24, 2);
  });

  it('is bounded in (0, 1)', () => {
    expect(expectedScore(3000, 100)).toBeLessThan(1);
    expect(expectedScore(100, 3000)).toBeGreaterThan(0);
  });
});

describe('computeElo — equal ratings (1500 vs 1500, K=32)', () => {
  it('a_win gives A +16 and B -16', () => {
    const r = computeElo(1500, 1500, 'a_win', 32);
    expect(r.elo_change_a).toBe(16);
    expect(r.elo_change_b).toBe(-16);
    expect(r.new_rating_a).toBe(1516);
    expect(r.new_rating_b).toBe(1484);
  });

  it('b_win gives A -16 and B +16', () => {
    const r = computeElo(1500, 1500, 'b_win', 32);
    expect(r.elo_change_a).toBe(-16);
    expect(r.elo_change_b).toBe(16);
  });

  it('draw gives both 0 delta', () => {
    const r = computeElo(1500, 1500, 'draw', 32);
    expect(r.elo_change_a).toBe(0);
    expect(r.elo_change_b).toBe(0);
    expect(r.new_rating_a).toBe(1500);
    expect(r.new_rating_b).toBe(1500);
  });
});

describe('computeElo — default K (32) used when omitted', () => {
  it('omitting K uses ELO_K_DEFAULT', () => {
    const withDefault = computeElo(1500, 1500, 'a_win');
    const withExplicit = computeElo(1500, 1500, 'a_win', ELO_K_DEFAULT);
    expect(withDefault).toEqual(withExplicit);
  });
});

describe('computeElo — asymmetric ratings', () => {
  it('upset win (lower-rated beats higher-rated) grants more points', () => {
    // A=1400, B=1600, A wins (upset)
    const upset = computeElo(1400, 1600, 'a_win', 32);
    // expected(A) ≈ 0.24, delta ≈ 32 * (1 - 0.24) = 24
    expect(upset.elo_change_a).toBeGreaterThanOrEqual(23);
    expect(upset.elo_change_a).toBeLessThanOrEqual(25);
  });

  it('expected win (higher-rated beats lower-rated) grants fewer points', () => {
    // A=1600, B=1400, A wins (expected)
    const expected = computeElo(1600, 1400, 'a_win', 32);
    // expected(A) ≈ 0.76, delta ≈ 32 * (1 - 0.76) = 7.7
    expect(expected.elo_change_a).toBeGreaterThanOrEqual(7);
    expect(expected.elo_change_a).toBeLessThanOrEqual(9);
  });

  it('draw between unequal ratings transfers points from favorite to underdog', () => {
    const r = computeElo(1600, 1400, 'draw', 32);
    // Higher-rated player A should LOSE points in a draw vs lower-rated B
    expect(r.elo_change_a).toBeLessThan(0);
    expect(r.elo_change_b).toBeGreaterThan(0);
  });
});

describe('computeElo — invariants', () => {
  it('zero-sum: deltas mirror each other', () => {
    const cases: Array<[number, number, 'a_win' | 'b_win' | 'draw']> = [
      [1500, 1500, 'a_win'],
      [1800, 1200, 'b_win'],
      [1600, 1400, 'draw'],
    ];
    for (const [ra, rb, outcome] of cases) {
      const r = computeElo(ra, rb, outcome);
      expect(r.elo_change_a + r.elo_change_b).toBe(0);
    }
  });

  it('winner never loses rating, loser never gains (decisive)', () => {
    for (let ra = 1000; ra <= 2000; ra += 100) {
      for (let rb = 1000; rb <= 2000; rb += 100) {
        const aWin = computeElo(ra, rb, 'a_win');
        expect(aWin.elo_change_a).toBeGreaterThanOrEqual(0);
        expect(aWin.elo_change_b).toBeLessThanOrEqual(0);
      }
    }
  });
});

describe('computeElo — edge cases', () => {
  it('new player (no history) starts from INITIAL_RATING', () => {
    expect(INITIAL_RATING).toBe(1500);
  });

  it('rating floor prevents ratings below 100', () => {
    const r = computeElo(110, 2500, 'b_win', 32);
    expect(r.new_rating_a).toBeGreaterThanOrEqual(100);
  });

  it('throws when K <= 0', () => {
    expect(() => computeElo(1500, 1500, 'a_win', 0)).toThrow();
    expect(() => computeElo(1500, 1500, 'a_win', -5)).toThrow();
  });

  it('throws on non-finite ratings', () => {
    expect(() => computeElo(NaN, 1500, 'a_win')).toThrow();
    expect(() => computeElo(1500, Infinity, 'a_win')).toThrow();
  });
});
