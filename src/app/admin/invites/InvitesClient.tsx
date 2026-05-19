'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { createInviteCodeAction, deactivateInviteCodeAction } from './actions';
import type { ActionResult } from '@/types/domain';

interface InviteRow {
  id: string;
  code: string;
  is_active: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
  usedByNickname?: string | null;
}

function getStatus(row: InviteRow): { label: string; color: string } {
  if (!row.is_active) return { label: '비활성', color: '#888' };
  if (row.used_by) return { label: '사용됨', color: '#4ade80' };
  if (row.expires_at && new Date(row.expires_at) < new Date()) return { label: '만료', color: '#f87171' };
  return { label: '미사용', color: 'var(--gold)' };
}

const TH: React.CSSProperties = {
  textAlign: 'left', padding: '0.6rem 1rem',
  color: 'var(--gold-dim)', letterSpacing: '0.15em', fontWeight: 400,
};
const TD: React.CSSProperties = { padding: '0.75rem 1rem', color: 'var(--white-dim)' };

export default function InvitesClient({ codes }: { codes: InviteRow[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ code: string }> | null,
    FormData
  >(createInviteCodeAction, null);

  async function handleDeactivate(id: string) {
    await deactivateInviteCodeAction(id);
    router.refresh();
  }

  return (
    <div>
      {/* 생성 폼 */}
      <form action={formAction} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', padding: '1.5rem', border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.04)', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--gold-dim)' }}>만료일 (선택)</span>
          <input
            type="date"
            name="expires_at"
            min={new Date().toISOString().split('T')[0]}
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--foreground)', padding: '0.5rem 0.75rem', fontFamily: "'Cinzel', serif", fontSize: '0.8rem' }}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          style={{ padding: '0.55rem 1.5rem', background: 'var(--gold)', color: '#0a1f14', fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.15em', border: 'none', cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.6 : 1 }}
        >
          {pending ? '생성 중...' : '+ 코드 생성'}
        </button>
        {state?.ok && (
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.9rem', color: 'var(--gold)', letterSpacing: '0.2em', alignSelf: 'center' }}>
            생성됨: <strong>{state.data.code}</strong>
          </p>
        )}
        {state && !state.ok && (
          <p style={{ color: '#f87171', fontSize: '0.8rem', alignSelf: 'center' }}>{state.error.message}</p>
        )}
      </form>

      {/* 코드 목록 */}
      {codes.length === 0 ? (
        <p style={{ color: 'var(--white-dim)', opacity: 0.5, fontFamily: "'Cinzel', serif", fontSize: '0.75rem' }}>생성된 코드가 없습니다</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Cinzel', serif", fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
                {['코드', '상태', '만료일', '생성일', '사용자', ''].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map(row => {
                const status = getStatus(row);
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                    <td style={{ ...TD, letterSpacing: '0.2em', color: 'var(--foreground)' }}>{row.code}</td>
                    <td style={{ ...TD, color: status.color }}>{status.label}</td>
                    <td style={TD}>{row.expires_at ? row.expires_at.split('T')[0] : '—'}</td>
                    <td style={TD}>{row.created_at.split('T')[0]}</td>
                    <td style={TD}>{row.usedByNickname ?? (row.used_by ? '(탈퇴)' : '—')}</td>
                    <td style={TD}>
                      {row.is_active && !row.used_by && (
                        <button
                          onClick={() => handleDeactivate(row.id)}
                          style={{ background: 'none', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', padding: '0.25rem 0.65rem', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', cursor: 'pointer', letterSpacing: '0.1em' }}
                        >
                          비활성화
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
