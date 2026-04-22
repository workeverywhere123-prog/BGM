/**
 * Elo Rating constants for boardgame-league.
 * Domain layer — pure values only, no external dependencies.
 */

export const INITIAL_RATING = 1500;

/**
 * Default K-factor for Elo calculation.
 * Higher K = more volatile, Lower K = more stable.
 * 32 is a widely used default (USCF for unrated).
 */
export const ELO_K_DEFAULT = 32;

/**
 * Minimum allowed rating floor — prevents ratings from going too low
 * which could cause UX issues and numerical instability.
 */
export const ELO_FLOOR = 100;
