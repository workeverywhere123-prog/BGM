import { describe, it, expect } from 'vitest';
import {
  hasRole,
  assertRole,
  AuthorizationError,
  STAFF_ROLES,
} from './auth-rules';
import type { LeagueMembership } from '@/types/domain';

function m(role: LeagueMembership['role']): LeagueMembership {
  return {
    id: 'mem-1',
    league_id: 'lg-1',
    player_id: 'p-1',
    role,
    joined_at: '2026-01-01T00:00:00Z',
  };
}

describe('hasRole', () => {
  it('returns true when role matches', () => {
    expect(hasRole(m('owner'), ['owner'])).toBe(true);
    expect(hasRole(m('manager'), STAFF_ROLES)).toBe(true);
  });

  it('returns false when role missing', () => {
    expect(hasRole(m('player'), STAFF_ROLES)).toBe(false);
  });

  it('returns false when membership null/undefined', () => {
    expect(hasRole(null, STAFF_ROLES)).toBe(false);
    expect(hasRole(undefined, STAFF_ROLES)).toBe(false);
  });
});

describe('assertRole', () => {
  it('does not throw when allowed', () => {
    expect(() => assertRole(m('owner'), STAFF_ROLES)).not.toThrow();
  });

  it('throws AuthorizationError when not allowed', () => {
    try {
      assertRole(m('player'), STAFF_ROLES);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      expect((err as AuthorizationError).requiredRoles).toEqual([
        'owner',
        'manager',
      ]);
    }
  });

  it('throws when membership is null', () => {
    expect(() => assertRole(null, STAFF_ROLES)).toThrow(AuthorizationError);
  });
});
