'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  leagueId: string;
  matchId: string;
  existingRoomId: string | null;
}

export default function MatchRoomButton({ leagueId, matchId, existingRoomId }: Props) {
  const router = useRouter();
  const [roomId, setRoomId] = useState(existingRoomId);
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState('');

  const create = () => startTransition(async () => {
    setErr('');
    const res = await fetch(`/api/league/${leagueId}/match-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? '오류'); return; }
    setRoomId(data.room_id);
    router.push(`/rooms/${data.room_id}`);
  });

  if (roomId) {
    return (
      <a href={`/rooms/${roomId}`} style={{
        fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em',
        padding: '0.3rem 0.8rem', border: '1px solid rgba(201,168,76,0.35)',
        color: 'var(--gold)', textDecoration: 'none', display: 'inline-block',
      }}>
        방 입장 →
      </a>
    );
  }

  return (
    <div>
      <button
        onClick={create}
        disabled={isPending}
        style={{
          fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.1em',
          padding: '0.3rem 0.8rem', border: '1px solid rgba(201,168,76,0.25)',
          color: 'var(--gold-dim)', background: 'transparent', cursor: 'pointer',
        }}
      >
        {isPending ? '생성중...' : '방 생성'}
      </button>
      {err && <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', color: '#ff8888', marginLeft: '0.5rem' }}>{err}</span>}
    </div>
  );
}
