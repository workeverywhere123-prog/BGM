'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

type Quarter = { id: string; name: string };
type Player = { id: string; nickname: string };

const selectStyle: React.CSSProperties = {
  background: 'rgba(14,26,20,0.95)',
  border: '1px solid rgba(201,168,76,0.2)',
  color: 'var(--foreground)',
  fontFamily: "'Cinzel', serif",
  fontSize: '0.6rem',
  letterSpacing: '0.08em',
  padding: '0.55rem 0.9rem',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none' as const,
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(201,168,76,0.5)'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.7rem center',
  paddingRight: '2rem',
};

const dateInputStyle: React.CSSProperties = {
  background: 'rgba(14,26,20,0.95)',
  border: '1px solid rgba(201,168,76,0.2)',
  color: 'var(--foreground)',
  fontFamily: "'Cinzel', serif",
  fontSize: '0.6rem',
  letterSpacing: '0.05em',
  padding: '0.55rem 0.9rem',
  cursor: 'pointer',
  outline: 'none',
  colorScheme: 'dark' as const,
};

export default function RecordsFilter({
  quarters,
  players,
  gameNames,
  activeQuarterName,
  fromValue,
  toValue,
}: {
  quarters: Quarter[];
  players: Player[];
  gameNames: string[];
  activeQuarterName?: string;
  fromValue?: string;
  toValue?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const quarter = params.get('quarter') ?? '';
  const player = params.get('player') ?? '';
  const game = params.get('game') ?? '';
  const from = params.get('from') ?? fromValue ?? '';
  const to = params.get('to') ?? toValue ?? '';

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('tab', 'records');
    startTransition(() => router.push(`/records?${next.toString()}`));
  }

  const hasFilter = quarter || player || game || from || to;

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '0.6rem',
      padding: '1.2rem 1.4rem',
      background: 'rgba(14,26,20,0.6)',
      border: '1px solid rgba(201,168,76,0.1)',
      marginBottom: '2rem',
      opacity: isPending ? 0.5 : 1,
      transition: 'opacity 0.15s',
    }}>
      {/* 분기 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>QUARTER</label>
        <select value={quarter} onChange={e => update('quarter', e.target.value)} style={selectStyle}>
          <option value="">{activeQuarterName ? `${activeQuarterName} (현재)` : '현재 분기'}</option>
          <option value="all">전체 기간</option>
          {quarters.map(q => (
            <option key={q.id} value={q.id}>{q.name}</option>
          ))}
        </select>
      </div>

      {/* 플레이어 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>PLAYER</label>
        <select value={player} onChange={e => update('player', e.target.value)} style={selectStyle}>
          <option value="">전체 플레이어</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>{p.nickname}</option>
          ))}
        </select>
      </div>

      {/* 게임 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>GAME</label>
        <select value={game} onChange={e => update('game', e.target.value)} style={selectStyle}>
          <option value="">전체 게임</option>
          {gameNames.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* 날짜 범위 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>FROM</label>
        <input
          type="date"
          value={from}
          onChange={e => update('from', e.target.value)}
          style={dateInputStyle}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)' }}>TO</label>
        <input
          type="date"
          value={to}
          onChange={e => update('to', e.target.value)}
          style={dateInputStyle}
        />
      </div>

      {/* 필터 초기화 */}
      {hasFilter && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', letterSpacing: '0.2em', color: 'transparent' }}>RESET</label>
          <button
            onClick={() => startTransition(() => router.push('/records'))}
            style={{
              ...selectStyle,
              background: 'transparent',
              border: '1px solid rgba(244,239,230,0.1)',
              color: 'rgba(244,239,230,0.35)',
              paddingRight: '0.9rem',
              backgroundImage: 'none',
              cursor: 'pointer',
            }}
          >
            초기화
          </button>
        </div>
      )}

      {isPending && (
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.55rem' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.1em' }}>로딩 중...</span>
        </div>
      )}
    </div>
  );
}
