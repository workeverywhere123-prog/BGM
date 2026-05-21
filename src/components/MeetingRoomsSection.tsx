'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

interface Player { id: string; nickname: string; username: string; avatar_url?: string | null; }
interface Room {
  id: string; title: string | null; location: string; scheduled_at: string;
  game_types: string[]; max_players: number; status: 'open' | 'full' | 'playing';
  note: string | null; host_id: string; host: Player; members: Player[];
}

const GAME_TYPES = ['마피아', '유로', '전략', '머더미스터리', '순위전', '협력', '파티', '덱빌딩', '워게임', '기타'];
const TYPE_COLOR: Record<string, string> = {
  '마피아': '#e879f9', '유로': '#60a5fa', '전략': '#4ade80', '머더미스터리': '#a78bfa',
  '순위전': '#c9a84c', '협력': '#34d399', '파티': '#fb923c', '덱빌딩': '#f87171',
  '워게임': '#94a3b8', '기타': 'rgba(244,239,230,0.5)',
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  const hh = d.getHours(), mm = d.getMinutes().toString().padStart(2, '0');
  const ampm = hh < 12 ? '오전' : '오후';
  return `${ampm} ${hh % 12 === 0 ? 12 : hh % 12}:${mm}`;
}

export default function MeetingRoomsSection({
  meetingId, meetingDate, meetingStatus, currentUserId, currentUserNickname, initialRooms,
}: {
  meetingId: string;
  meetingDate: string;
  meetingStatus: string;
  currentUserId: string | null;
  currentUserNickname: string | null;
  initialRooms: Room[];
}) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const isMember = (room: Room) => room.members.some(m => m.id === currentUserId);
  const isHost = (room: Room) => room.host_id === currentUserId;

  const handleCreate = (data: {
    title: string; location: string; scheduled_at: string;
    game_types: string[]; max_players: number; note: string;
  }) => startTransition(async () => {
    const res = await fetch('/api/rooms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, meeting_id: meetingId }),
    });
    if (!res.ok) { alert((await res.json()).error); return; }
    const room: Room = await res.json();
    setRooms(prev => [...prev, room]);
    setShowCreate(false);
  });

  const handleJoin = (roomId: string) => {
    setJoiningId(roomId);
    startTransition(async () => {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join' }),
      });
      setJoiningId(null);
      if (!res.ok) { alert((await res.json()).error); return; }
      const { player, status } = await res.json();
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, members: [...r.members, player], status } : r));
    });
  };

  const handleLeave = (roomId: string) => startTransition(async () => {
    const res = await fetch(`/api/rooms/${roomId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave' }),
    });
    if (!res.ok) { alert((await res.json()).error); return; }
    setRooms(prev => prev.map(r => r.id === roomId
      ? { ...r, members: r.members.filter(m => m.id !== currentUserId), status: 'open' }
      : r
    ));
  });

  return (
    <div style={{ marginTop: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.3em', color: 'var(--gold-dim)', whiteSpace: 'nowrap' }}>
          GAME ROOMS
        </p>
        <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.12)' }} />
      </div>

      {rooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed rgba(201,168,76,0.15)', marginBottom: '1rem' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', color: 'var(--white-dim)', fontStyle: 'italic', marginBottom: '0.3rem' }}>
            아직 개설된 방이 없습니다
          </p>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', opacity: 0.6 }}>
            방을 만들어 함께 할 인원을 모집하세요
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {rooms.map(room => {
            const member = isMember(room);
            const host = isHost(room);
            const full = room.status === 'full' && !member;
            const playing = room.status === 'playing';
            return (
              <div key={room.id} style={{
                border: `1px solid ${playing ? 'rgba(251,146,60,0.3)' : member ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.15)'}`,
                background: playing ? 'rgba(40,25,10,0.3)' : member ? 'rgba(30,74,52,0.2)' : 'rgba(22,53,36,0.15)',
                padding: '1rem 1.2rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', color: 'var(--foreground)' }}>
                      {room.title || `${room.host.nickname}의 방`}
                    </p>
                    {room.game_types.map(t => (
                      <span key={t} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.06em', padding: '0.1rem 0.4rem', border: `1px solid ${TYPE_COLOR[t] ?? 'var(--gold-dim)'}55`, color: TYPE_COLOR[t] ?? 'var(--gold-dim)' }}>{t}</span>
                    ))}
                  </div>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', marginTop: '0.2rem' }}>
                    by {room.host.nickname} · {fmtTime(room.scheduled_at)} · {room.members.length}/{room.max_players}명
                  </p>
                  {room.note && <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--white-dim)', opacity: 0.6, marginTop: '0.2rem' }}>{room.note}</p>}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <Link href={`/rooms/${room.id}`} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.08em', padding: '0.4rem 0.8rem', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', textDecoration: 'none' }}>
                    입장
                  </Link>
                  {currentUserId && !playing && (
                    host ? (
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', padding: '0.4rem 0.7rem', border: '1px solid var(--gold)', color: 'var(--gold)', opacity: 0.6 }}>방장</span>
                    ) : member ? (
                      <button onClick={() => handleLeave(room.id)} disabled={isPending} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.06em', padding: '0.4rem 0.7rem', border: '1px solid rgba(255,100,100,0.3)', color: '#ff8888', background: 'transparent', cursor: 'pointer' }}>나가기</button>
                    ) : full ? (
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', padding: '0.4rem 0.7rem', color: 'var(--white-dim)', opacity: 0.4 }}>가득참</span>
                    ) : (
                      <button onClick={() => handleJoin(room.id)} disabled={isPending && joiningId === room.id} style={{ fontFamily: "'Cinzel', serif", fontSize: '0.52rem', letterSpacing: '0.08em', padding: '0.4rem 0.9rem', border: '1px solid rgba(201,168,76,0.5)', color: 'var(--gold)', background: 'rgba(201,168,76,0.06)', cursor: 'pointer' }}>
                        {isPending && joiningId === room.id ? '...' : '참가'}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {currentUserId ? (
        <button onClick={() => setShowCreate(true)} className="btn-gold" style={{ fontSize: '0.62rem', width: '100%' }}>
          + 방 만들기
        </button>
      ) : (
        <Link href="/login" style={{ display: 'block', textAlign: 'center', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-dim)', padding: '0.8rem', border: '1px solid rgba(201,168,76,0.2)', textDecoration: 'none' }}>
          로그인 후 방 만들기
        </Link>
      )}

      {showCreate && (
        <CreateModal
          defaultDate={meetingDate}
          isPending={isPending}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          currentUserNickname={currentUserNickname ?? ''}
        />
      )}
    </div>
  );
}

/* ── Create Modal ── */
function CreateModal({ defaultDate, isPending, onClose, onCreate, currentUserNickname }: {
  defaultDate: string;
  isPending: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; location: string; scheduled_at: string; game_types: string[]; max_players: number; note: string }) => void;
  currentUserNickname: string;
}) {
  const defaultDt = new Date(defaultDate);
  defaultDt.setHours(14, 0, 0, 0);
  const localIso = new Date(defaultDt.getTime() - defaultDt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [scheduledAt, setScheduledAt] = useState(localIso);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [note, setNote] = useState('');

  const toggleType = (t: string) => setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !scheduledAt) { alert('장소와 시간을 입력해주세요'); return; }
    onCreate({ title, location, scheduled_at: new Date(scheduledAt).toISOString(), game_types: selectedTypes, max_players: maxPlayers, note });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: '1rem' }}>
      <div style={{ background: '#0d1f14', border: '1px solid rgba(201,168,76,0.3)', padding: '2rem', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--gold)' }}>방 만들기</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--white-dim)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={labelStyle}>
            방 제목 <span style={{ opacity: 0.5 }}>(선택)</span>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={`${currentUserNickname}의 방`} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            장소 *
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="예) 2층 테이블, 창가 자리..." required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            시작 시간 *
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required style={inputStyle} />
          </label>
          <div>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--gold-dim)', marginBottom: '0.5rem' }}>게임 유형</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {GAME_TYPES.map(t => (
                <button key={t} type="button" onClick={() => toggleType(t)} style={{
                  fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.06em', padding: '0.3rem 0.7rem', cursor: 'pointer',
                  border: `1px solid ${selectedTypes.includes(t) ? (TYPE_COLOR[t] ?? 'var(--gold)') : 'rgba(201,168,76,0.2)'}`,
                  background: selectedTypes.includes(t) ? `${TYPE_COLOR[t] ?? 'var(--gold)'}18` : 'transparent',
                  color: selectedTypes.includes(t) ? (TYPE_COLOR[t] ?? 'var(--gold)') : 'var(--white-dim)',
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <label style={labelStyle}>
            최대 인원
            <select value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} style={{ ...inputStyle, cursor: 'pointer' }}>
              {[2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}명</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            메모 <span style={{ opacity: 0.5 }}>(선택)</span>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="게임 소개, 규칙 등..." style={{ ...inputStyle, resize: 'vertical' }} />
          </label>
          <button type="submit" disabled={isPending} className="btn-gold" style={{ fontSize: '0.62rem', marginTop: '0.5rem' }}>
            {isPending ? '개설 중...' : '방 개설'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.35rem',
  fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--gold-dim)',
};
const inputStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.25)', padding: '0.6rem 0.8rem',
  color: 'var(--foreground)', fontSize: '0.88rem', fontFamily: "'Cormorant Garamond', serif',",
  outline: 'none', width: '100%', boxSizing: 'border-box',
};
