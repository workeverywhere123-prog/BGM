/**
 * Pure authorization helpers — no I/O, no framework coupling.
 * Used by Server Actions to assert role requirements after fetching
 * LeagueMembership rows from bkend.ai.
 */

import type { LeagueMembership, LeagueRole } from '@/types/domain';

export class AuthorizationError extends Error {
  constructor(message: string, public readonly requiredRoles: LeagueRole[]) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * True if `membership.role` satisfies any of the `allowed` roles.
 * Implements a simple flat role set — no hierarchy assumed.
 * If you want owner to imply manager rights, pass both in `allowed`.
 */
export function hasRole(
  membership: LeagueMembership | null | undefined,
  allowed: readonly LeagueRole[]
): boolean {
  if (!membership) return false;
  return allowed.includes(membership.role);
}

/**
 * Throws AuthorizationError if membership doesn't satisfy `allowed`.
 * Use inside Server Actions after fetching the caller's membership.
 */
export function assertRole(
  membership: LeagueMembership | null | undefined,
  allowed: readonly LeagueRole[]
): asserts membership is LeagueMembership {
  if (!hasRole(membership, allowed)) {
    throw new AuthorizationError(
      `Requires role: ${allowed.join(' | ')}`,
      [...allowed]
    );
  }
}

/**
 * Convenience: owner or manager may record matches, invite members, etc.
 */
export const STAFF_ROLES: readonly LeagueRole[] = ['owner', 'manager'] as const;
