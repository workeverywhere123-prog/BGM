import { describe, it, expect } from 'vitest';
import { generateCode, validateInviteCode } from './invite-code';

describe('generateCode', () => {
  it('8자 대문자 영숫자를 반환한다', () => {
    const code = generateCode();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it('호출마다 다른 값을 반환한다', () => {
    const codes = new Set(Array.from({ length: 20 }, generateCode));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('validateInviteCode', () => {
  const baseRow = {
    is_active: true,
    used_by: null,
    expires_at: null,
  };

  it('정상 코드는 ok를 반환한다', () => {
    expect(validateInviteCode(baseRow)).toBe('ok');
  });

  it('비활성 코드는 invalid를 반환한다', () => {
    expect(validateInviteCode({ ...baseRow, is_active: false })).toBe('invalid');
  });

  it('이미 사용된 코드는 used를 반환한다', () => {
    expect(validateInviteCode({ ...baseRow, used_by: 'some-uuid' })).toBe('used');
  });

  it('만료된 코드는 expired를 반환한다', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(validateInviteCode({ ...baseRow, expires_at: past })).toBe('expired');
  });

  it('만료일이 미래면 ok를 반환한다', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(validateInviteCode({ ...baseRow, expires_at: future })).toBe('ok');
  });

  it('row가 null이면 invalid를 반환한다', () => {
    expect(validateInviteCode(null)).toBe('invalid');
  });
});
