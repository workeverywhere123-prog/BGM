'use client';

import { useState, useTransition } from 'react';

interface AvailEntry { player_id: string; available_date: string; }
interface MatchInfo { id: string; round: number; match_index: number; player_ids: string[]; scheduled_date?: string | null; }

interface Props {
  leagueId: string;
  myPlayerId: string | null;
  isAdmin: boolean;
  initialAvailability: AvailEntry[];
  matches: MatchInfo[];
  participantCount: number;
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtDateKo(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

export default function LeagueAvailability({ leagueId, myPlayerId, isAdmin, initialAvailability, matches, participantCount }: Props) {
  const [availability, setAvailability] = useState<AvailEntry[]>(initialAvailability);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState('');
  const [schedulingMatchId, setSchedulingMatchId] = useState<string | null>(null);
  const [scheduledDates, setScheduledDates] = useState<Record<string, string | null>>(
    Object.fromEntries(matches.map(m => [m.id, m.scheduled_date ?? null]))
  );

  // Next 30 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return dateKey(d);
  });

  const myDates = new Set(availability.filter(a => a.player_id === myPlayerId).map(a => a.available_date));

  // For each date, count how many players are available
  const dateCounts: Record<string, Set<string>> = {};
  for (const a of availability) {
    if (!dateCounts[a.available_date]) dateCounts[a.available_date] = new Set();
    dateCounts[a.available_date].add(a.player_id);
  }

  // For each match, find common dates (all 4 players available)
  const matchCommonDates: Record<string, string[]> = {};
  for (const m of matches) {
    const common = days.filter(d => m.player_ids.every(pid => dateCounts[d]?.has(pid)));
    matchCommonDates[m.id] = common;
  }

  const toggleDate = (date: string) => {
    if (!myPlayerId) return;
    const has = myDates.has(date);
    startTransition(async () => {
      setMsg('');
      const res = await fetch(`/api/league/${leagueId}/availability`, {
        method: has ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) { setMsg((await res.json()).error ?? '오류'); return; }
      if (has) {
        setAvailability(prev => prev.filter(a => !(a.player_id === myPlayerId && a.available_date === date)));
      } else {
        setAvailability(prev => [...prev, { player_id: myPlayerId, available_date: date }]);
      }
    });
  };

  const assignDate = (matchId: string, date: string) => startTransition(async () => {
    setMsg('');
    const res = await fetch(`/api/league/${leagueId}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, scheduled_date: date }),
    });
    if (!res.ok) { setMsg((await res.json()).error ?? '오류'); return; }
    setScheduledDates(prev => ({ ...prev, [matchId]: date }));
    setSchedulingMatchId(null);
    setMsg('✓ 경기 일정이 지정되었습니다');
  });

  const clearDate = (matchId: string) => startTransition(async () => {
    const res = await fetch(`/api/league/${leagueId}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, scheduled_date: null }),
    });
    if (res.ok) setScheduledDates(prev => ({ ...prev, [matchId]: null }));
  });

  return (
    <div style={{ marginTop: '4rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)' }}>
          AVAILABILITY — 경기 가능 날짜
        </p>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--white-dim)', opacity: 0.5 }}>
          4인 모두 가능한 날짜가 공통 경기 가능일로 표시됩니다
        </span>
      </div>

      {/* My availability picker */}
      {myPlayerId ? (
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.8rem' }}>
            내 가능 날짜 선택 (클릭으로 토글)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {days.map(d => {
              const isMine = myDates.has(d);
              const count = dateCounts[d]?.size ?? 0;
              const allAvail = count === participantCount;
              return (
                <button
                  key={d}
                  onClick={() => toggleDate(d)}
                  disabled={isPending}
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: '0.55rem',
                    padding: '0.3rem 0.5rem',
                    border: `1px solid ${allAvail ? 'rgba(74,222,128,0.6)' : isMine ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
                    background: allAvail ? 'rgba(74,222,128,0.1)' : isMine ? 'rgba(201,168,76,0.12)' : 'transparent',
                    color: allAvail ? '#4ade80' : isMine ? 'var(--gold)' : 'rgba(244,239,230,0.4)',
                    cursor: 'pointer',
                    position: 'relative',
                    minWidth: 64,
                    textAlign: 'center',
                  }}
                >
                  <div>{new Date(d + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })}</div>
                  {count > 0 && (
                    <div style={{ fontSize: '0.45rem', opacity: 0.7, marginTop: 2 }}>{count}명</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem', padding: '1rem 1.2rem', border: '1px dashed rgba(201,168,76,0.15)', fontFamily: "'Cormorant Garamond', serif", fontSize: '0.95rem', color: 'var(--white-dim)', fontStyle: 'italic', opacity: 0.6 }}>
          로그인 후 가능 날짜를 입력할 수 있습니다
        </div>
      )}

      {/* Per-match common dates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {matches.map(m => {
          const common = matchCommonDates[m.id] ?? [];
          const scheduled = scheduledDates[m.id];
          const label = `${m.round}라운드 ${m.match_index + 1}경기`;
          return (
            <div key={m.id} style={{ padding: '0.8rem 1.2rem', border: `1px solid ${scheduled ? 'rgba(74,222,128,0.25)' : 'rgba(201,168,76,0.1)'}`, background: 'rgba(30,74,52,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', minWidth: 110 }}>{label}</span>
                {scheduled ? (
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    ✓ {fmtDateKo(scheduled)}
                    {isAdmin && (
                      <button onClick={() => clearDate(m.id)} disabled={isPending} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.45rem', padding: '0.15rem 0.4rem', border: '1px solid rgba(255,100,100,0.3)', color: '#ff8888', background: 'transparent', cursor: 'pointer', marginLeft: '0.4rem' }}>취소</button>
                    )}
                  </span>
                ) : common.length === 0 ? (
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.9rem', color: 'rgba(244,239,230,0.35)', fontStyle: 'italic' }}>
                    공통 가능일 없음
                  </span>
                ) : (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: '#4ade80', opacity: 0.7 }}>공통 가능일:</span>
                    {common.slice(0, 5).map(d => (
                      <button
                        key={d}
                        onClick={() => isAdmin ? assignDate(m.id, d) : undefined}
                        disabled={!isAdmin || isPending}
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: '0.9rem',
                          padding: '0.2rem 0.5rem',
                          border: '1px solid rgba(74,222,128,0.4)',
                          background: 'rgba(74,222,128,0.08)',
                          color: '#4ade80',
                          cursor: isAdmin ? 'pointer' : 'default',
                        }}
                      >
                        {fmtDateKo(d)}
                        {isAdmin && <span style={{ fontSize: '0.45rem', marginLeft: '0.3rem', opacity: 0.6 }}>지정</span>}
                      </button>
                    ))}
                    {common.length > 5 && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: 'var(--white-dim)', opacity: 0.4 }}>+{common.length - 5}개</span>}
                  </div>
                )}
                {!scheduled && schedulingMatchId === m.id && (
                  <button onClick={() => setSchedulingMatchId(null)} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', padding: '0.15rem 0.4rem', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold-dim)', background: 'transparent', cursor: 'pointer' }}>닫기</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {msg && (
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: msg.startsWith('✓') ? '#4ade80' : '#ff8888', marginTop: '1rem', padding: '0.6rem 1rem', border: `1px solid ${msg.startsWith('✓') ? 'rgba(74,222,128,0.3)' : 'rgba(255,100,100,0.3)'}` }}>
          {msg}
        </p>
      )}
    </div>
  );
}
