const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateCode(): string {
  return Array.from({ length: 8 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
}

export type InviteCodeStatus = 'ok' | 'invalid' | 'used' | 'expired';

interface InviteCodeRow {
  is_active: boolean;
  used_by: string | null;
  expires_at: string | null;
}

export function validateInviteCode(row: InviteCodeRow | null): InviteCodeStatus {
  if (!row || !row.is_active) return 'invalid';
  if (row.used_by !== null) return 'used';
  if (row.expires_at !== null && new Date(row.expires_at) < new Date()) return 'expired';
  return 'ok';
}
