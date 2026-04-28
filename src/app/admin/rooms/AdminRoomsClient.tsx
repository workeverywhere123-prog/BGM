'use client';

import { useState, useTransition } from 'react';

interface Player { id: string; nickname: string; username: string; }
interface Room {
  id: string; title: string | null; location: string; scheduled_at: string;
  game_types: string[]; max_players: number; status: string;
  host_id: string; host: Player; members: Player[]; created_at: string;
}

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  open:   { label: '모집중', color: 'var(--gold)' },
  full:   { label: '마감',   color: '#4ade80' },
  closed: { label: '종료',   color: 'var(--white-dim)' },
};

export default function AdminRoomsClient({ initialRooms }: { initialRooms: Room[] }) {
  const [rooms, setRooms] = useState(initialRooms);
  const [filter, setFilter] = useState<'all' | 'open' | 'full' | 'closed'>('all');
  const [isPending, startTransition] = useTransition();

  const closeRoom = (id: string) => {
    if (!confirm('이 방을 강제 종료하시겠습니까?')) return;
    startTransition(async () => {
      const res = await fetch('/api/admin/rooms', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setRooms(prev => prev.map(r => r.id === id ? { ...r, status: 'closed' } : r));
    });
  };

  const filtered = filter === 'all' ? rooms : rooms.filter(r => r.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontSize: '2.8rem', color: 'var(--foreground)', lineHeight: 1 }}>방 모니터링</h1>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold)', marginTop: '0.3rem' }}>ROOM MANAGEMENT</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(['all', 'open', 'full', 'closed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em',
              padding: '0.3rem 0.7rem', cursor: 'pointer',
              border: `1px solid ${filter === f ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`,
              background: filter === f ? 'rgba(201,168,76,0.1)' : 'transparent',
              color: filter === f ? 'var(--gold)' : 'var(--white-dim)',
            }}>
              {f === 'all' ? '전체' : STATUS_STYLE[f]?.label ?? f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)', marginBottom: '1rem', opacity: 0.6 }}>
        총 {filtered.length}개 방
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--white-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.7rem', opacity: 0.4 }}>방이 없습니다</div>
        )}
        {filtered.map(room => {
          const st = STATUS_STYLE[room.status] ?? STATUS_STYLE.closed;
          return (
            <div key={room.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 140px 100px 80px 80px',
              gap: '1rem', alignItems: 'center', padding: '0.9rem 1.2rem',
              background: 'rgba(30,74,52,0.1)',
              borderLeft: `2px solid ${room.status === 'open' ? 'var(--gold-dim)' : room.status === 'full' ? '#4ade80' : 'transparent'}`,
              opacity: room.status === 'closed' ? 0.5 : 1,
            }}>
              <div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--foreground)' }}>
                  {room.title || `${room.host.nickname}의 방`}
                </p>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', color: 'var(--white-dim)', marginTop: '0.2rem' }}>
                  📍 {room.location} &nbsp;·&nbsp; 방장: {room.host.nickname}
                </p>
                <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                  {room.game_types.map(t => (
                    <span key={t} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.5rem', padding: '0.1rem 0.4rem', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold-dim)' }}>{t}</span>
                  ))}
                </div>
              </div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: 'var(--white-dim)' }}>
                {new Date(room.scheduled_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: 'var(--white-dim)', textAlign: 'center' }}>
                {room.members.length} / {room.max_players}명
              </span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.08em', color: st.color, textAlign: 'center' }}>
                {st.label}
              </span>
              <div style={{ textAlign: 'center' }}>
                {room.status !== 'closed' && (
                  <button onClick={() => closeRoom(room.id)} disabled={isPending} style={{
                    fontFamily: "'Cinzel', serif", fontSize: '0.58rem', padding: '0.25rem 0.6rem',
                    border: '1px solid rgba(255,100,100,0.3)', color: '#ff8888',
                    background: 'transparent', cursor: 'pointer',
                  }}>강제종료</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
